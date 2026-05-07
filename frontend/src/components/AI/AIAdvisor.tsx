
import { useState, useEffect } from "react";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, BrainCircuit, Lightbulb, AlertTriangle, TrendingUp, Loader2 } from "lucide-react";
import { Transaction, AIInsight } from "../../types";
import { getFinancialInsights, askFinancialQuestion } from "../../services/geminiService";
import { motion, AnimatePresence } from "motion/react";

export function AIAdvisor({ transactions }: { transactions: Transaction[] }) {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [asking, setAsking] = useState(false);

  useEffect(() => {
    async function loadInsights() {
      if (transactions.length === 0) return;
      setLoading(true);
      const data = await getFinancialInsights(transactions);
      setInsights(data);
      setLoading(false);
    }
    loadInsights();
  }, [transactions]);

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const userQ = question;
    setQuestion("");
    setChat(prev => [...prev, { role: 'user', content: userQ }]);
    setAsking(true);

    const answer = await askFinancialQuestion(userQ, transactions);
    setChat(prev => [...prev, { role: 'assistant', content: answer }]);
    setAsking(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'tip': return <Lightbulb className="h-4 w-4 text-amber-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'opportunity': return <TrendingUp className="h-4 w-4 text-emerald-500" />;
      default: return <Sparkles className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="animate-pulse border-none bg-white/50">
                <CardContent className="h-32 rounded-xl mt-6" />
              </Card>
            ))
          ) : (
            insights.map((insight, idx) => (
              <motion.div
                key={insight.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1 rounded-md bg-indigo-50">
                        {getInsightIcon(insight.type)}
                      </div>
                      <CardTitle className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{insight.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">
                      {insight.content}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      <Card className="bg-white border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-4">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-indigo-600" />
            <CardTitle className="text-sm font-bold text-slate-800">Ask Financial Advisor</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          <ScrollArea className="h-[200px] pr-4">
            <div className="space-y-4">
              {chat.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-xs font-medium italic">
                  Ask me about your subscriptions, spending trends, or budget goals...
                </div>
              )}
              {chat.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs font-medium ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-800 border'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 border rounded-2xl px-4 py-2.5 text-xs flex items-center gap-2 font-medium text-slate-600">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-600" />
                    Analyzing history...
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <form onSubmit={handleAsk} className="flex gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
            <Input 
              placeholder="Type your question..." 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={asking}
              className="border-none bg-transparent shadow-none focus-visible:ring-0 text-xs font-medium"
            />
            <Button type="submit" size="sm" disabled={asking || !question.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4">
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
