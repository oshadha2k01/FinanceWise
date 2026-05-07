export type TransactionType = 'income' | 'expense';

export type Category = 
  | 'Housing' 
  | 'Food' 
  | 'Transport' 
  | 'Entertainment' 
  | 'Shopping' 
  | 'Utilities' 
  | 'Healthcare' 
  | 'Salary' 
  | 'Investments' 
  | 'Other';

export interface Transaction {
  id: string;
  amount: number;
  date: string;
  description: string;
  category: Category;
  type: TransactionType;
}

export interface FinanceState {
  transactions: Transaction[];
  loading: boolean;
  addTransaction: (t: Omit<Transaction, 'id'>) => Promise<void>;
  addTransactionNLP: (text: string) => Promise<void>;
  addTransactionUpload: (file: File) => Promise<void>;
  addTransactionSMS: (sms_text: string) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
  fetchTransactions: () => Promise<void>;
  setTransactions: (transactions: Transaction[]) => void;
  anomalies: Anomaly[];
  forecast: ForecastPoint[];
  taxAnalysis: TaxAnalysis | null;
  graphAnalysis: GraphAnalysis | null;
  fetchAnomalies: () => Promise<void>;
  fetchForecast: () => Promise<void>;
  fetchTaxAnalysis: () => Promise<void>;
  fetchGraphAnalysis: () => Promise<void>;
  executeAgentAction: (task: string) => Promise<AgentAction>;
  sendVoiceChat: (message: string) => Promise<string>;
}

export interface AIInsight {
  title: string;
  content: string;
  type: 'tip' | 'warning' | 'opportunity';
}

export interface Anomaly {
  transaction_id: string;
  amount: number;
  description: string;
  category: string;
  date: string;
  reason: string;
}

export interface ForecastPoint {
  date: string;
  projected_balance: number;
}

export interface TaxAnalysis {
  annualized_income: number;
  tax_free_allowance: number;
  taxable_income: number;
  estimated_annual_tax: number;
  estimated_monthly_tax: number;
  highest_tax_bracket: string;
  advice: string;
}

export interface GraphAnalysis {
  nodes: number;
  edges: number;
  analysis: string;
}

export interface AgentAction {
  task: string;
  steps: string[];
  status: string;
}
