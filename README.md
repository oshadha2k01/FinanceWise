# FinanceWise AI

FinanceWise AI is a full-stack personal finance assistant for tracking transactions, extracting data from text or receipts, and generating AI-powered financial guidance.

## What It Does

- Secure sign-in with email/password and Google login
- Transaction tracking for income and expenses
- NLP transaction entry from natural language text
- Receipt/image upload parsing for auto-entry
- Bank SMS parsing for transaction extraction
- AI financial insights and conversational advisor
- Spending anomaly detection
- Income and balance forecasting
- Sri Lankan personal tax analysis
- Graph-based spending pattern analysis
- Voice chat with text-to-speech support
- PDF export of dashboard data

## Tech Stack

### Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- shadcn/ui and Base UI components
- Zustand for state management
- React Router
- Recharts for charts and dashboards
- Motion for animations
- Firebase Auth
- html2canvas and jsPDF for PDF export

### Backend

- FastAPI
- Python 3.11
- MongoDB with Motor
- JWT-based authentication
- bcrypt for password hashing
- SlowAPI for rate limiting
- Google Gemini API for AI features
- NetworkX for graph analysis

### Infrastructure

- Docker and Docker Compose
- Nginx for frontend serving in production

## Project Structure

- `backend/` - FastAPI API, auth, database, and AI endpoints
- `frontend/` - React application and UI components
- `docker-compose.yml` - Local multi-service setup
- `mobile_sms_bridge.py` - SMS bridge utility for mobile-related workflows

## Main Features

### Authentication

- Email/password registration and login
- Google login via Firebase
- Access and refresh token handling

### Transaction Management

- Add transactions manually
- Delete transactions
- Load transaction history for the signed-in user

### AI Finance Tools

- Generate actionable insights from recent transactions
- Ask an AI financial advisor questions about spending and budgets
- Extract structured transactions from natural language
- Parse receipt images and bank SMS messages into transactions
- Produce tax estimates using Sri Lankan tax rules
- Detect unusual spending patterns
- Forecast projected balances over time
- Analyze spending behavior as a graph structure

### Dashboard Experience

- Summary cards for income, expenses, and balance
- Category spend breakdowns
- Cash flow charts
- Forecast charts
- Transaction table with deletion controls
- Research panel for advanced AI workflows

## Getting Started

### Prerequisites

- Node.js 18 or newer
- Python 3.11 or newer
- MongoDB, or Docker to run the bundled services
- A Gemini API key
- Firebase project credentials for Google sign-in

### Environment Variables

Create the needed environment variables for each service.

#### Backend

- `MONGODB_URL` - MongoDB connection string
- `JWT_SECRET` - secret used to sign JWTs
- `GEMINI_API_KEY` - Google Gemini API key

#### Frontend

- `VITE_API_URL` - backend API base URL, for example `http://localhost:8000`
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

## Run Locally

### Option 1: Docker Compose

1. Set `GEMINI_API_KEY` in your shell or `.env` file.
2. Run `docker compose up --build` from the project root.
3. Open the app in the browser at the exposed frontend port, and the backend will be available on port `8000`.

### Option 2: Run Services Separately

#### Backend

1. Create and activate a Python virtual environment in `backend/`.
2. Install the backend dependencies used by the API, including FastAPI, Uvicorn, Motor, PyJWT, bcrypt, python-dotenv, SlowAPI, and Google GenAI.
3. Start the API from `backend/` with Uvicorn:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### Frontend

1. Install dependencies in `frontend/`.
2. Set the frontend environment variables listed above.
3. Start the Vite dev server:

```bash
npm run dev
```

## Useful Commands

### Frontend

```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

### Backend

```bash
uvicorn main:app --reload --port 8000
pytest
```

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/google`
- `POST /api/auth/refresh`
- `GET /api/transactions`
- `POST /api/transactions`
- `DELETE /api/transactions/{id}`
- `POST /api/transactions/nlp`
- `POST /api/transactions/upload`
- `POST /api/transactions/sms`
- `GET /api/ai/insights`
- `POST /api/ai/ask`
- `GET /api/ai/anomalies`
- `GET /api/ai/forecast`
- `GET /api/ai/tax-analysis`
- `GET /api/ai/graph-analysis`
- `POST /api/ai/agent/action`
- `POST /api/ai/chat`

## Notes

- The app is designed around a signed-in user experience, so most features require authentication.
- AI-driven features depend on a valid Gemini API key and a reachable backend.
- MongoDB stores users and transactions for the authenticated account.