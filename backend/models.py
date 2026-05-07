from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date

TransactionType = Literal['income', 'expense']
CategoryType = Literal['Housing', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Salary', 'Investments', 'Other']

class UserCreate(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str

class GoogleLogin(BaseModel):
    token: str

class TransactionBase(BaseModel):
    amount: float
    date: str
    description: str
    category: CategoryType
    type: TransactionType

class TransactionCreate(TransactionBase):
    pass

class TransactionDB(TransactionBase):
    id: str = Field(alias="_id")
    user_id: str

class AIInsight(BaseModel):
    title: str
    content: str
    type: Literal['tip', 'warning', 'opportunity']
