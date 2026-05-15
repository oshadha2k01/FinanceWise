import os
import json
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from bson import ObjectId
from typing import List
from datetime import datetime, timedelta
from pydantic import BaseModel

from database import transactions_collection, client, users_collection, switch_to_fallback_client
from models import TransactionCreate, TransactionDB, AIInsight, UserCreate, Token, GoogleLogin
from auth import get_current_user, verify_password, get_password_hash, create_access_token, create_refresh_token
import jwt

from google import genai
from google.genai import types

from contextlib import asynccontextmanager
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Check database connection
    try:
        await client.admin.command('ping')
        print("✅ Successfully connected to MongoDB!")
    except Exception as e:
        print("❌ Failed to connect to MongoDB. Is MongoDB running?", e)
        if switch_to_fallback_client():
            try:
                await client.admin.command('ping')
                print("✅ Connected to fallback local MongoDB instance.")
            except Exception as fallback_error:
                print("❌ Fallback MongoDB connection also failed.", fallback_error)
    yield
    # Shutdown logic can go here if needed

app = FastAPI(lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "ok"}

class RefreshTokenRequest(BaseModel):
    refresh_token: str

@app.post("/api/auth/refresh", response_model=Token)
async def refresh_auth_token(req: RefreshTokenRequest):
    try:
        payload = jwt.decode(req.refresh_token, os.getenv("JWT_SECRET", "super-secret-key-change-in-prod"), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        email = payload.get("email")
        
        access_token = create_access_token(data={"sub": user_id, "email": email})
        new_refresh = create_refresh_token(data={"sub": user_id, "email": email})
        return {"access_token": access_token, "refresh_token": new_refresh, "token_type": "bearer"}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@app.post("/api/auth/register", response_model=Token)
async def register(user: UserCreate):
    existing_user = await users_collection.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = get_password_hash(user.password)
    user_dict = {"email": user.email, "hashed_password": hashed_password}
    result = await users_collection.insert_one(user_dict)
    
    access_token = create_access_token(data={"sub": str(result.inserted_id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(result.inserted_id), "email": user.email})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/api/auth/login", response_model=Token)
async def login(user: UserCreate):
    db_user = await users_collection.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["hashed_password"]):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
        
    access_token = create_access_token(data={"sub": str(db_user["_id"]), "email": db_user.get("email", "")})
    refresh_token = create_refresh_token(data={"sub": str(db_user["_id"]), "email": db_user.get("email", "")})
    return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}

@app.post("/api/auth/google", response_model=Token)
async def google_login(login: GoogleLogin):
    try:
        # Decode Firebase token without verification for local development prototype
        decoded_token = jwt.decode(login.token, options={"verify_signature": False})
        email = decoded_token.get("email")
        name = decoded_token.get("name", "")
        if not email:
            raise Exception("No email in token")
        
        db_user = await users_collection.find_one({"email": email})
        if not db_user:
            user_dict = {"email": email, "name": name, "hashed_password": "GOOGLE_AUTH"}
            result = await users_collection.insert_one(user_dict)
            user_id = str(result.inserted_id)
        else:
            user_id = str(db_user["_id"])
            if "name" not in db_user and name:
                await users_collection.update_one({"_id": db_user["_id"]}, {"$set": {"name": name}})
            
        access_token = create_access_token(data={"sub": user_id, "email": email, "name": name})
        refresh_token = create_refresh_token(data={"sub": user_id, "email": email, "name": name})
        return {"access_token": access_token, "refresh_token": refresh_token, "token_type": "bearer"}
    except Exception as e:
        print(f"Google Login error: {e}")
        raise HTTPException(status_code=400, detail="Invalid Google token")

@app.get("/api/transactions")
@limiter.limit("60/minute")
async def get_transactions(request: Request, skip: int = 0, limit: int = 50, user=Depends(get_current_user)):
    cursor = transactions_collection.find({"user_id": user["uid"]}).skip(skip).limit(limit)
    transactions = await cursor.to_list(length=limit)
    
    # Format MongoDB _id
    for t in transactions:
        t["id"] = str(t.pop("_id"))
        
    return transactions

@app.post("/api/transactions", response_model=TransactionDB)
async def create_transaction(transaction: TransactionCreate, user=Depends(get_current_user)):
    transaction_dict = transaction.model_dump()
    transaction_dict["user_id"] = user["uid"]
    
    result = await transactions_collection.insert_one(transaction_dict)
    transaction_dict["id"] = str(result.inserted_id)
    transaction_dict.pop("_id", None)
    
    return transaction_dict

@app.delete("/api/transactions/{id}")
async def delete_transaction(id: str, user=Depends(get_current_user)):
    result = await transactions_collection.delete_one({"_id": ObjectId(id), "user_id": user["uid"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

from pydantic import BaseModel

class QuestionRequest(BaseModel):
    question: str

class AIRequest(BaseModel):
    transactions: List[dict]

@app.post("/api/ai/insights", response_model=List[AIInsight])
@limiter.limit("10/minute")
async def get_insights(request: Request, req: AIRequest, user=Depends(get_current_user)):
    # Initialize genai client
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        transactions_str = "\n".join([f"{t['date']}: {t['type']} of {t['amount']} for {t['description']} ({t['category']})" for t in req.transactions])
        
        prompt = f"""Analyze these financial transactions and provide 3 actionable insights:
        {transactions_str}
        Provide exactly 3 insights in JSON format. Each insight must have:
        - title (short, catchy)
        - content (detailed advice, max 2 sentences)
        - type (must be one of: "tip", "warning", "opportunity")"""
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.ARRAY,
                    items=types.Schema(
                        type=types.Type.OBJECT,
                        properties={
                            "title": types.Schema(type=types.Type.STRING),
                            "content": types.Schema(type=types.Type.STRING),
                            "type": types.Schema(type=types.Type.STRING, enum=["tip", "warning", "opportunity"])
                        },
                        required=["title", "content", "type"]
                    )
                )
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Error generating insights: {e}")
        return [{"title": "AI Error", "content": "Could not connect to Gemini API", "type": "warning"}]

class AskRequest(BaseModel):
    question: str
    transactions: List[dict]

@app.post("/api/ai/ask")
@limiter.limit("20/minute")
async def ask_question(request: Request, req: AskRequest, user=Depends(get_current_user)):
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        transactions_str = "\n".join([f"{t['date']}: {t['type']} of {t['amount']} for {t['description']} ({t['category']})" for t in req.transactions])
        
        prompt = f"""You are a professional financial advisor. Based on the user's transaction history below, answer their question.
        History:
        {transactions_str}
        Question: {req.question}
        Answer concisely and professionally. Focus on data-driven advice."""
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        return {"answer": response.text}
    except Exception as e:
        return {"answer": "Error communicating with AI financial advisor."}

class NLPTransactionRequest(BaseModel):
    text: str
    current_date: str

@app.post("/api/transactions/nlp", response_model=TransactionDB)
@limiter.limit("20/minute")
async def create_transaction_nlp(request: Request, req: NLPTransactionRequest, user=Depends(get_current_user)):
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        prompt = f"""You are a helpful financial assistant. Extract transaction details from the following text.
        Today's date is: {req.current_date} (Use this to resolve words like 'today', 'yesterday', etc.)
        
        Text: "{req.text}"
        """
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "amount": types.Schema(type=types.Type.NUMBER),
                        "date": types.Schema(type=types.Type.STRING),
                        "description": types.Schema(type=types.Type.STRING),
                        "category": types.Schema(type=types.Type.STRING, enum=["Housing", "Food", "Transport", "Entertainment", "Shopping", "Utilities", "Healthcare", "Salary", "Investments", "Other"]),
                        "type": types.Schema(type=types.Type.STRING, enum=["income", "expense"])
                    },
                    required=["amount", "date", "description", "category", "type"]
                )
            )
        )
        
        data = json.loads(response.text)
        
        transaction_dict = {
            "amount": float(data["amount"]),
            "date": data["date"],
            "description": data["description"],
            "category": data["category"],
            "type": data["type"],
            "user_id": user["uid"]
        }
        
        result = await transactions_collection.insert_one(transaction_dict)
        transaction_dict["id"] = str(result.inserted_id)
        transaction_dict.pop("_id", None)
        
        return transaction_dict
        
    except Exception as e:
        print(f"Error in NLP transaction: {e}")
        raise HTTPException(status_code=400, detail="Could not extract transaction details from text.")

@app.post("/api/transactions/upload", response_model=TransactionDB)
@limiter.limit("10/minute")
async def create_transaction_upload(request: Request, file: UploadFile = File(...), current_date: str = Form(...), user=Depends(get_current_user)):
    try:
        contents = await file.read()
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        prompt = f"""You are a helpful financial assistant. Extract transaction details from the uploaded receipt or invoice.
        Today's date is: {current_date}
        
        Extract the total amount, the date on the receipt, the merchant name as description, guess the best category, and set type to expense."""
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=[
                types.Part.from_bytes(data=contents, mime_type=file.content_type),
                prompt
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "amount": types.Schema(type=types.Type.NUMBER),
                        "date": types.Schema(type=types.Type.STRING),
                        "description": types.Schema(type=types.Type.STRING),
                        "category": types.Schema(type=types.Type.STRING, enum=["Housing", "Food", "Transport", "Entertainment", "Shopping", "Utilities", "Healthcare", "Salary", "Investments", "Other"]),
                        "type": types.Schema(type=types.Type.STRING, enum=["income", "expense"])
                    },
                    required=["amount", "date", "description", "category", "type"]
                )
            )
        )
        
        data = json.loads(response.text)
        
        transaction_dict = {
            "amount": float(data["amount"]),
            "date": data["date"],
            "description": data["description"],
            "category": data["category"],
            "type": data["type"],
            "user_id": user["uid"]
        }
        
        result = await transactions_collection.insert_one(transaction_dict)
        transaction_dict["id"] = str(result.inserted_id)
        transaction_dict.pop("_id", None)
        
        return transaction_dict
        
    except Exception as e:
        print(f"Error in Receipt Upload: {e}")
        raise HTTPException(status_code=400, detail="Could not process the receipt image.")

class SMSRequest(BaseModel):
    sms_text: str

@app.post("/api/transactions/sms", response_model=TransactionDB)
@limiter.limit("30/minute")
async def process_bank_sms(request: Request, req: SMSRequest, user=Depends(get_current_user)):
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        prompt = f"""You are a highly advanced financial data extractor. 
        Analyze the following SMS message from a Sri Lankan Bank (e.g., ComBank, BOC, HNB, Sampath, NDB, Peoples Bank, etc.).
        
        SMS Content: "{req.sms_text}"
        
        Extract the transaction details and return ONLY a JSON object. 
        Determine if it is money leaving the account (expense/debited) or entering (income/credited). 
        Convert the amount to a float (ignoring LKR/Rs text).
        Extract the date if present, otherwise use today's date.
        Guess the best category based on the merchant name.
        
        Format required:
        {{
            "amount": (float),
            "date": (string, YYYY-MM-DD),
            "description": (string, Bank name + Merchant/Action),
            "category": (string, exactly one of: Housing, Food, Transport, Entertainment, Shopping, Utilities, Healthcare, Salary, Investments, Other),
            "type": (string, exactly one of: income, expense)
        }}"""
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "amount": types.Schema(type=types.Type.NUMBER),
                        "date": types.Schema(type=types.Type.STRING),
                        "description": types.Schema(type=types.Type.STRING),
                        "category": types.Schema(type=types.Type.STRING, enum=["Housing", "Food", "Transport", "Entertainment", "Shopping", "Utilities", "Healthcare", "Salary", "Investments", "Other"]),
                        "type": types.Schema(type=types.Type.STRING, enum=["income", "expense"])
                    },
                    required=["amount", "date", "description", "category", "type"]
                )
            )
        )
        
        data = json.loads(response.text)
        
        transaction_dict = {
            "amount": float(data["amount"]),
            "date": data["date"],
            "description": data["description"],
            "category": data["category"],
            "type": data["type"],
            "user_id": user["uid"]
        }
        
        result = await transactions_collection.insert_one(transaction_dict)
        transaction_dict["id"] = str(result.inserted_id)
        transaction_dict.pop("_id", None)
        
        return transaction_dict
        
    except Exception as e:
        print(f"Error processing SMS: {e}")
        raise HTTPException(status_code=400, detail="Could not extract details from this bank SMS.")

class TaxAnalysis(BaseModel):
    annualized_income: float
    tax_free_allowance: float
    taxable_income: float
    estimated_annual_tax: float
    estimated_monthly_tax: float
    highest_tax_bracket: str
    advice: str

@app.get("/api/ai/tax-analysis", response_model=TaxAnalysis)
@limiter.limit("5/minute")
async def get_tax_analysis(request: Request, user=Depends(get_current_user)):
    try:
        cursor = transactions_collection.find({"user_id": user["uid"], "type": "income"})
        income_transactions = await cursor.to_list(length=1000)
        
        # Calculate monthly average income to project annual income
        total_income = sum(t["amount"] for t in income_transactions)
        
        if not income_transactions:
            annual_income = 0
        else:
            dates = [datetime.strptime(t["date"], "%Y-%m-%d") for t in income_transactions]
            min_date = min(dates)
            max_date = datetime.now()
            days_diff = (max_date - min_date).days
            if days_diff < 30:
                # If less than a month of data, assume total_income is one month
                annual_income = total_income * 12
            else:
                months_diff = days_diff / 30.44
                annual_income = (total_income / months_diff) * 12
                
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        
        # RAG Context: Sri Lankan Tax Law 2024/2025
        tax_law_context = """
        SRI LANKA INLAND REVENUE DEPARTMENT (IRD) PERSONAL INCOME TAX RULES FOR 2024/2025:
        1. Tax-Free Allowance (Relief): LKR 1,200,000 per year (LKR 100,000 per month).
        2. Tax Bands (Applied sequentially on balance after allowance):
           - First LKR 500,000: 6%
           - Next LKR 500,000: 12%
           - Next LKR 500,000: 18%
           - Next LKR 500,000: 24%
           - Next LKR 500,000: 30%
           - Any balance above: 36%
        """
        
        prompt = f"""You are an expert Sri Lankan Tax Consultant. 
        I am providing you with the exact Sri Lanka tax code context:
        {tax_law_context}
        
        The user's projected Annual Income based on their transaction history is: LKR {annual_income:.2f}.
        
        Calculate their exact tax liability according to the rules provided in the context. 
        Provide a JSON response with the breakdown and exactly one paragraph of professional advice on how they could legally optimize or plan for this tax (e.g., APIT deductions, EPF/ETF context if applicable).
        
        Format required:
        {{
            "annualized_income": (float),
            "tax_free_allowance": 1200000,
            "taxable_income": (float),
            "estimated_annual_tax": (float),
            "estimated_monthly_tax": (float),
            "highest_tax_bracket": (string, e.g. "18%"),
            "advice": (string, exactly one paragraph of professional advice specific to SL)
        }}"""
        
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "annualized_income": types.Schema(type=types.Type.NUMBER),
                        "tax_free_allowance": types.Schema(type=types.Type.NUMBER),
                        "taxable_income": types.Schema(type=types.Type.NUMBER),
                        "estimated_annual_tax": types.Schema(type=types.Type.NUMBER),
                        "estimated_monthly_tax": types.Schema(type=types.Type.NUMBER),
                        "highest_tax_bracket": types.Schema(type=types.Type.STRING),
                        "advice": types.Schema(type=types.Type.STRING)
                    },
                    required=["annualized_income", "tax_free_allowance", "taxable_income", "estimated_annual_tax", "estimated_monthly_tax", "highest_tax_bracket", "advice"]
                )
            )
        )
        
        data = json.loads(response.text)
        return data
        
    except Exception as e:
        print(f"Error in Tax Analysis: {e}")
        raise HTTPException(status_code=400, detail="Could not calculate tax analysis.")

class AgentActionRequest(BaseModel):
    task: str

class ChatMessage(BaseModel):
    message: str

@app.post("/api/ai/agent/action")
@limiter.limit("10/minute")
async def execute_agent_action(request: Request, req: AgentActionRequest, user=Depends(get_current_user)):
    try:
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        prompt = f"""You are an autonomous web agent. The user wants you to execute the following task online:
        "{req.task}"
        
        Since you are currently in simulation mode for this research project, write a highly detailed JSON execution trace of how you WOULD execute this using Playwright or Selenium. 
        Return ONLY a JSON array of strings, where each string is an action log (e.g. "Launched headless Chromium", "Navigated to website", "Located cancellation button via XPath"). Include at least 5 detailed steps and a final success message.
        """
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt,
            config=types.GenerateContentConfig(response_mime_type="application/json")
        )
        steps = json.loads(response.text)
        return {"task": req.task, "steps": steps, "status": "success"}
    except Exception as e:
        print(f"Error in agent: {e}")
        raise HTTPException(status_code=400, detail="Agent execution failed.")

@app.post("/api/ai/chat")
@limiter.limit("30/minute")
async def process_voice_chat(request: Request, req: ChatMessage, user=Depends(get_current_user)):
    try:
        cursor = transactions_collection.find({"user_id": user["uid"]})
        txs = await cursor.to_list(length=100)
        total_spent = sum(t["amount"] for t in txs if t["type"] == "expense")
        total_income = sum(t["amount"] for t in txs if t["type"] == "income")
        
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        prompt = f"""You are a friendly, conversational AI financial companion. 
        The user said: "{req.message}"
        
        Context: The user has spent ${total_spent} and earned ${total_income} recently.
        Keep your response extremely concise, natural, and conversational, as it will be spoken aloud via Text-to-Speech. Don't use bullet points or Markdown. Maximum 2 sentences.
        """
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        return {"response": response.text.strip()}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Voice chat failed.")

@app.get("/api/ai/graph-analysis")
@limiter.limit("5/minute")
async def get_graph_analysis(request: Request, user=Depends(get_current_user)):
    try:
        cursor = transactions_collection.find({"user_id": user["uid"]})
        txs = await cursor.to_list(length=1000)
        
        if not txs:
            return {"nodes": 0, "edges": 0, "analysis": "Not enough data for graph analysis."}
            
        import networkx as nx
        G = nx.Graph()
        G.add_node("User")
        
        for t in txs:
            merchant = t["description"]
            category = t["category"]
            G.add_node(category)
            G.add_node(merchant)
            G.add_edge("User", category, weight=t["amount"])
            G.add_edge(category, merchant, weight=t["amount"])
            
        centrality = nx.degree_centrality(G)
        sorted_nodes = sorted(centrality.items(), key=lambda item: item[1], reverse=True)[:5]
        
        client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
        prompt = f"""I have modeled the user's financial behavior as a Graph Neural Network (GNN) structure. 
        Total Nodes: {G.number_of_nodes()}
        Total Edges: {G.number_of_edges()}
        Top Central Nodes: {sorted_nodes}
        
        Write exactly one paragraph explaining the topological structure of their spending habits based on this graph data. Point out their main "hubs" of spending and explain it in graph-theory terms (nodes, edges, centrality).
        """
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        return {
            "nodes": G.number_of_nodes(),
            "edges": G.number_of_edges(),
            "analysis": response.text.strip()
        }
    except Exception as e:
        print(f"Error in GNN: {e}")
        raise HTTPException(status_code=400, detail="GNN Analysis failed.")

class Anomaly(BaseModel):
    transaction_id: str
    amount: float
    description: str
    category: str
    date: str
    reason: str

@app.get("/api/ai/anomalies", response_model=List[Anomaly])
@limiter.limit("5/minute")
async def get_anomalies(request: Request, user=Depends(get_current_user)):
    cursor = transactions_collection.find({"user_id": user["uid"], "type": "expense"})
    transactions = await cursor.to_list(length=1000)
    
    if not transactions:
        return []
        
    category_totals = {}
    category_counts = {}
    
    for t in transactions:
        cat = t["category"]
        if cat not in category_totals:
            category_totals[cat] = 0
            category_counts[cat] = 0
        category_totals[cat] += t["amount"]
        category_counts[cat] += 1
        
    category_averages = {cat: category_totals[cat] / category_counts[cat] for cat in category_totals}
    
    anomalies = []
    for t in transactions:
        cat = t["category"]
        avg = category_averages[cat]
        if t["amount"] > avg * 2 and t["amount"] > 50:
            anomalies.append({
                "transaction_id": str(t["_id"]),
                "amount": t["amount"],
                "description": t["description"],
                "category": cat,
                "date": t["date"],
                "reason": f"Spends ${t['amount']} which is significantly higher than your average {cat} spending of ${avg:.2f}."
            })
            
    anomalies.sort(key=lambda x: x["date"], reverse=True)
    return anomalies[:5]

class ForecastPoint(BaseModel):
    date: str
    projected_balance: float

@app.get("/api/ai/forecast", response_model=List[ForecastPoint])
@limiter.limit("5/minute")
async def get_forecast(request: Request, user=Depends(get_current_user)):
    cursor = transactions_collection.find({"user_id": user["uid"]})
    transactions = await cursor.to_list(length=1000)
    
    if not transactions:
        return []
        
    total_income = sum(t["amount"] for t in transactions if t["type"] == "income")
    total_expense = sum(t["amount"] for t in transactions if t["type"] == "expense")
    current_balance = total_income - total_expense
    
    dates = [datetime.strptime(t["date"], "%Y-%m-%d") for t in transactions]
    if not dates:
        return []
        
    min_date = min(dates)
    max_date = datetime.now()
    days_diff = (max_date - min_date).days
    if days_diff < 1:
        days_diff = 1
        
    daily_income = total_income / days_diff
    daily_expense = total_expense / days_diff
    net_daily_change = daily_income - daily_expense
    
    forecast = []
    current_proj = current_balance
    base_date = datetime.now()
    
    for i in range(30):
        target_date = base_date + timedelta(days=i)
        forecast.append({
            "date": target_date.strftime("%Y-%m-%d"),
            "projected_balance": round(current_proj, 2)
        })
        current_proj += net_daily_change
        
    return forecast
