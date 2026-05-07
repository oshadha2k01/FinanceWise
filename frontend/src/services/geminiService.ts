import { Transaction, AIInsight } from "../types";
import { api } from "./api";

export async function getFinancialInsights(transactions: Transaction[]): Promise<AIInsight[]> {
  try {
    const { data } = await api.post('/api/ai/insights', { transactions });
    return data;
  } catch (error) {
    console.error("AI Error:", error);
    return [{
      title: "AI Analysis Unavailable",
      content: "Unable to reach the AI financial advisor at the moment. Please try again later.",
      type: "warning"
    }];
  }
}

export async function askFinancialQuestion(question: string, transactions: Transaction[]): Promise<string> {
  try {
    const { data } = await api.post('/api/ai/ask', { question, transactions });
    return data.answer;
  } catch (error) {
    console.error("AI Error:", error);
    return "Error communicating with AI financial advisor.";
  }
}
