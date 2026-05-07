import { create } from 'zustand';
import { FinanceState, Transaction } from '../types';
import { api } from '../services/api';

export const useFinanceStore = create<FinanceState>((set) => ({
  transactions: [],
  anomalies: [],
  forecast: [],
  taxAnalysis: null,
  graphAnalysis: null,
  loading: false,
  fetchTransactions: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get('/api/transactions');
      set({ transactions: data });
    } catch (error) {
      console.error('Failed to fetch transactions', error);
    } finally {
      set({ loading: false });
    }
  },
  fetchAnomalies: async () => {
    try {
      const { data } = await api.get('/api/ai/anomalies');
      set({ anomalies: data });
    } catch (error) {
      console.error('Failed to fetch anomalies', error);
    }
  },
  fetchForecast: async () => {
    try {
      const { data } = await api.get('/api/ai/forecast');
      set({ forecast: data });
    } catch (error) {
      console.error('Failed to fetch forecast', error);
    }
  },
  fetchTaxAnalysis: async () => {
    try {
      const { data } = await api.get('/api/ai/tax-analysis');
      set({ taxAnalysis: data });
    } catch (error) {
      console.error('Failed to fetch tax analysis', error);
    }
  },
  fetchGraphAnalysis: async () => {
    try {
      const { data } = await api.get('/api/ai/graph-analysis');
      set({ graphAnalysis: data });
    } catch (error) {
      console.error('Failed to fetch graph analysis', error);
    }
  },
  executeAgentAction: async (task) => {
    try {
      set({ loading: true });
      const { data } = await api.post('/api/ai/agent/action', { task });
      return data;
    } catch (error) {
      console.error('Failed to execute agent action', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  sendVoiceChat: async (message) => {
    try {
      const { data } = await api.post('/api/ai/chat', { message });
      return data.response;
    } catch (error) {
      console.error('Failed voice chat', error);
      throw error;
    }
  },
  addTransaction: async (t) => {
    try {
      const { data } = await api.post('/api/transactions', t);
      set((state) => ({ transactions: [...state.transactions, data] }));
    } catch (error) {
      console.error('Failed to add transaction', error);
      throw error;
    }
  },
  addTransactionNLP: async (text) => {
    try {
      set({ loading: true });
      const { data } = await api.post('/api/transactions/nlp', {
        text,
        current_date: new Date().toISOString().split('T')[0]
      });
      set((state) => ({ transactions: [...state.transactions, data] }));
    } catch (error) {
      console.error('Failed to add NLP transaction', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  addTransactionUpload: async (file) => {
    try {
      set({ loading: true });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('current_date', new Date().toISOString().split('T')[0]);
      
      const { data } = await api.post('/api/transactions/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set((state) => ({ transactions: [...state.transactions, data] }));
    } catch (error) {
      console.error('Failed to upload receipt', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  addTransactionSMS: async (sms_text) => {
    try {
      set({ loading: true });
      const { data } = await api.post('/api/transactions/sms', { sms_text });
      set((state) => ({ transactions: [...state.transactions, data] }));
    } catch (error) {
      console.error('Failed to process SMS transaction', error);
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  removeTransaction: async (id) => {
    try {
      await api.delete(`/api/transactions/${id}`);
      set((state) => ({
        transactions: state.transactions.filter((t) => t.id !== id),
      }));
    } catch (error) {
      console.error('Failed to delete transaction', error);
      throw error;
    }
  },
  setTransactions: (transactions) => set({ transactions }),
}));
