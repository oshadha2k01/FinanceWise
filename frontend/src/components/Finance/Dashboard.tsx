import { useState, useEffect } from "react";
import React from "react";
import toast from "react-hot-toast";
import { useFinanceStore } from "../../store/useFinanceStore";
import { useAuth } from "../../context/AuthContext";
import { TransactionList } from "./TransactionList";
import { ErrorBoundary } from "../ErrorBoundary";
import { CategoryPieChart, CashFlowChart, ForecastChart } from "./Charts";
import { ResearchPanel } from "./ResearchPanel";
import { AIAdvisor } from "../AI/AIAdvisor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Category, TransactionType } from "../../types";
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Plus, Wallet, TrendingDown, TrendingUp, DollarSign, BrainCircuit, LayoutDashboard, BarChart3, PieChart as PieChartIcon, Lightbulb, Bell, Sparkles, Upload, Loader2, Image as ImageIcon, AlertTriangle, Mic, Download, MessageSquare, Landmark, User as UserIcon, LogOut } from "lucide-react";
import { motion } from "motion/react";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

const CATEGORIES: Category[] = [
  'Housing', 'Food', 'Transport', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Salary', 'Investments', 'Other'
];

export default function Dashboard() {
  const { transactions, addTransaction, addTransactionNLP, addTransactionUpload, addTransactionSMS, removeTransaction, fetchTransactions, loading, anomalies, forecast, fetchAnomalies, fetchForecast, taxAnalysis, fetchTaxAnalysis } = useFinanceStore();
  const { user, logout } = useAuth();
  
  const userName = user?.name || user?.email?.split('@')[0] || "User";
  const greeting = getGreeting();
  const [showProfile, setShowProfile] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>('Other');
  const [type, setType] = useState<TransactionType>('expense');
  const [nlpText, setNlpText] = useState("");
  const [smsText, setSmsText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchTransactions();
    fetchAnomalies();
    fetchForecast();
    fetchTaxAnalysis();
  }, [fetchTransactions, fetchAnomalies, fetchForecast, fetchTaxAnalysis]);

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      toast.error("Please enter both amount and description");
      return;
    }

    try {
      await addTransaction({
        amount: parseFloat(amount),
        description,
        category,
        type,
        date: new Date().toISOString().split('T')[0],
      });
      toast.success("Transaction added successfully!");
      setAmount("");
      setDescription("");
    } catch (err) {
      toast.error("Failed to add transaction");
    }
  };

  const handleSmartAdd = async (e: React.FormEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (!nlpText) return;
    try {
      await addTransactionNLP(nlpText);
      toast.success("AI extracted and added transaction!");
      setNlpText("");
    } catch (err) {
      toast.error("AI couldn't understand that transaction.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("AI is scanning your receipt...");
    try {
      await addTransactionUpload(file);
      toast.success("Receipt scanned and added!", { id: toastId });
    } catch (err) {
      toast.error("Failed to read receipt.", { id: toastId });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSmsAdd = async () => {
    if (!smsText) return;
    try {
      await addTransactionSMS(smsText);
      toast.success("Bank SMS processed successfully!");
      setSmsText("");
    } catch (err) {
      toast.error("AI couldn't extract details from this SMS.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await removeTransaction(id);
      toast.success("Transaction deleted!");
    } catch (err) {
      toast.error("Failed to delete transaction");
    }
  };

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setNlpText(transcript);
      toast.success("Voice captured! You can now edit or submit.");
    };

    recognition.onerror = () => {
      toast.error("Microphone error. Please try again.");
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const exportPDF = async () => {
    const element = document.getElementById('dashboard-content');
    if (!element) return;

    const toastId = toast.loading("Generating PDF Report...");
    try {
      const canvas = await html2canvas(element, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('FinSight_AI_Report.pdf');
      toast.success("PDF Downloaded Successfully!", { id: toastId });
    } catch (error) {
      toast.error("Failed to generate PDF.", { id: toastId });
    }
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white tracking-tight text-lg">FinSight AI</span>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium bg-slate-800 text-white rounded-md">
            <LayoutDashboard className="w-5 h-5 mr-3 opacity-70" />
            Dashboard
          </a>
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium hover:bg-slate-800 hover:text-white rounded-md transition-colors">
            <BarChart3 className="w-5 h-5 mr-3 opacity-50" />
            Analytics
          </a>
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium hover:bg-slate-800 hover:text-white rounded-md transition-colors">
            <PieChartIcon className="w-5 h-5 mr-3 opacity-50" />
            Budgets
          </a>
          <a href="#" className="flex items-center px-4 py-2.5 text-sm font-medium hover:bg-slate-800 hover:text-white rounded-md transition-colors">
            <Lightbulb className="w-5 h-5 mr-3 opacity-50" />
            AI Strategy
          </a>
        </nav>

        <div className="p-4 bg-slate-950/50 m-4 rounded-lg border border-slate-700/50">
          <div className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Plan Limit</div>
          <div className="h-1.5 w-full bg-slate-700 rounded-full overflow-hidden mb-2">
            <div className="bg-indigo-500 h-full w-3/4"></div>
          </div>
          <div className="text-[10px] text-slate-500">750 / 1000 AI Queries used</div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-8 py-5 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{greeting}, {userName} 👋</h1>
            <p className="text-sm text-slate-500 font-medium mt-1">Here is your financial intelligence briefing.</p>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={exportPDF} variant="outline" size="sm" className="text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100">
              <Download className="w-4 h-4 mr-2" /> Export PDF
            </Button>
            <button className="p-2 text-slate-400 hover:text-slate-600 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"></span>
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowProfile(!showProfile)} 
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-bold flex items-center justify-center border-2 border-white shadow-sm hover:scale-105 transition-transform"
              >
                {userName.charAt(0).toUpperCase()}
              </button>
              
              {showProfile && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-16 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-10"></div>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white text-2xl font-bold flex items-center justify-center mb-3 shadow-md border-4 border-white z-10">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="font-bold text-slate-800 text-lg z-10">{user?.name || "Premium User"}</div>
                    <div className="text-xs text-slate-500 z-10 font-medium">{user?.email}</div>
                    <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest z-10">
                      <Sparkles className="w-3 h-3" /> Pro Account
                    </div>
                  </div>
                  <div className="p-2">
                    <button className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 rounded-md flex items-center gap-3 font-medium transition-colors">
                      <UserIcon className="w-4 h-4 text-slate-400" /> My Profile Settings
                    </button>
                    <div className="h-px bg-slate-100 my-1 mx-2"></div>
                    <button onClick={logout} className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-md flex items-center gap-3 font-medium transition-colors">
                      <LogOut className="w-4 h-4 text-rose-500" /> Sign Out Securely
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="p-8 space-y-8 max-w-7xl" id="dashboard-content">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Total Balance</div>
                  <div className="text-2xl font-bold text-slate-900">${balance.toLocaleString()}</div>
                  <div className="text-emerald-600 text-xs mt-2 flex items-center font-medium">
                    <TrendingUp className="w-3 h-3 mr-1" />+2.4% vs last month
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Monthly Income</div>
                  <div className="text-2xl font-bold text-slate-900 text-emerald-600">${totalIncome.toLocaleString()}</div>
                  <div className="text-emerald-600 text-xs mt-2 flex items-center font-medium">
                    <TrendingUp className="w-3 h-3 mr-1" />Stable inflow
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="rounded-xl border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Monthly Spend</div>
                  <div className="text-2xl font-bold text-slate-900 border-rose-600">${totalExpenses.toLocaleString()}</div>
                  <div className={`text-rose-600 text-xs mt-2 flex items-center font-medium`}>
                    <TrendingDown className="w-3 h-3 mr-1" />+12% vs average
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <Card className="rounded-xl bg-indigo-600 border-indigo-700 shadow-sm text-white">
                <CardContent className="p-5">
                  <div className="text-indigo-200 text-xs font-semibold uppercase tracking-wider mb-1">Savings Rate</div>
                  <div className="text-2xl font-bold">32.4%</div>
                  <div className="text-indigo-200 text-xs mt-2 font-medium italic">Above target (25%)</div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* AI Advisor Panel */}
          <section className="bg-indigo-50 p-6 rounded-xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-4">
              <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-indigo-900">AI Intelligence Center</h3>
            </div>
            <ErrorBoundary>
              <AIAdvisor transactions={transactions} />
            </ErrorBoundary>
          </section>

          {anomalies && anomalies.length > 0 && (
            <section className="bg-rose-50 p-6 rounded-xl border border-rose-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-rose-500 p-1.5 rounded-lg text-white">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-rose-900">Spending Anomalies Detected</h3>
              </div>
              <div className="space-y-3">
                {anomalies.map(a => (
                  <div key={a.transaction_id} className="bg-white p-4 rounded-lg border border-rose-100 shadow-sm flex items-start gap-4">
                    <div className="bg-rose-100 text-rose-600 font-bold p-2 rounded shrink-0">${a.amount}</div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{a.description} <span className="text-slate-400 font-normal text-xs ml-2">{a.date}</span></div>
                      <div className="text-sm text-slate-600 mt-1">{a.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {taxAnalysis && (
            <section className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-4">
                <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
                  <Landmark className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-emerald-900">Sri Lankan Tax Analysis (2024/2025)</h3>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase">Proj. Annual Income</div>
                  <div className="text-lg font-bold text-slate-800">LKR {taxAnalysis.annualized_income.toLocaleString()}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <div className="text-xs text-slate-500 font-bold uppercase">Taxable Income</div>
                  <div className="text-lg font-bold text-slate-800">LKR {taxAnalysis.taxable_income.toLocaleString()}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <div className="text-xs text-rose-500 font-bold uppercase">Estimated Annual Tax</div>
                  <div className="text-lg font-bold text-rose-600">LKR {taxAnalysis.estimated_annual_tax.toLocaleString()}</div>
                </div>
                <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                  <div className="text-xs text-emerald-600 font-bold uppercase">Highest Bracket</div>
                  <div className="text-lg font-bold text-emerald-700">{taxAnalysis.highest_tax_bracket}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-lg border border-emerald-100 shadow-sm text-sm text-slate-700 leading-relaxed">
                <strong className="text-emerald-900 block mb-1">Tax Consultant Advice:</strong>
                {taxAnalysis.advice}
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Visuals */}
            <div className="lg:col-span-8 space-y-8">
              <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden">
                <CardHeader className="bg-white border-b border-slate-50 p-6 flex flex-row items-center justify-between">
                  <CardTitle className="text-base font-bold text-slate-800">Cashflow Trends</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ErrorBoundary>
                    <Tabs defaultValue="cashflow">
                      <TabsList className="mb-4 bg-slate-100">
                        <TabsTrigger value="cashflow">7D</TabsTrigger>
                        <TabsTrigger value="categories">Category Distribution</TabsTrigger>
                        <TabsTrigger value="projections" className="text-indigo-600 font-bold"><Sparkles className="w-3 h-3 mr-1" /> 30D Forecast</TabsTrigger>
                      </TabsList>
                      <TabsContent value="cashflow">
                        <CashFlowChart transactions={transactions} />
                      </TabsContent>
                      <TabsContent value="categories">
                        <CategoryPieChart transactions={transactions} />
                      </TabsContent>
                      <TabsContent value="projections">
                        <div className="mb-2 text-xs text-slate-500">AI-powered 30-day balance projection based on your daily net cash flow.</div>
                        <ForecastChart forecast={forecast} />
                      </TabsContent>
                    </Tabs>
                  </ErrorBoundary>
                </CardContent>
              </Card>

              <section>
                <h2 className="text-lg font-bold text-slate-800 mb-4">Recent Activity</h2>
                <TransactionList transactions={transactions} onDelete={handleDelete} />
              </section>
            </div>

            {/* Actions Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              <Card className="rounded-xl border-slate-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">Add Transaction</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="smart">
                    <TabsList className="w-full mb-4 grid grid-cols-3 h-auto p-1">
                      <TabsTrigger value="smart" className="flex items-center gap-2 py-2"><Sparkles className="w-4 h-4 text-indigo-500" /> Smart</TabsTrigger>
                      <TabsTrigger value="sms" className="flex items-center gap-2 py-2"><MessageSquare className="w-4 h-4 text-emerald-500" /> Bank SMS</TabsTrigger>
                      <TabsTrigger value="manual" className="py-2">Manual</TabsTrigger>
                    </TabsList>

                    <TabsContent value="smart" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">Just type naturally and let AI do the work.</p>
                        <div className="relative">
                          <Input
                            placeholder="Bought a coffee for $4.50 at Starbucks"
                            value={nlpText}
                            onChange={(e) => setNlpText(e.target.value)}
                            className="bg-indigo-50/50 border-indigo-100 pr-20"
                            disabled={loading}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSmartAdd(e);
                            }}
                          />
                          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <button
                              type="button"
                              onClick={startListening}
                              className={`p-1.5 rounded ${isListening ? 'bg-rose-100 text-rose-600 animate-pulse' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-100'}`}
                              title="Use Voice"
                            >
                              <Mic className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleSmartAdd}
                              disabled={loading || !nlpText}
                              className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="relative flex py-3 items-center">
                        <div className="flex-grow border-t border-slate-200"></div>
                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs">or scan receipt</span>
                        <div className="flex-grow border-t border-slate-200"></div>
                      </div>

                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full border-dashed border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 bg-indigo-50/30"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                      >
                        {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ImageIcon className="w-5 h-5 mr-2" />}
                        Upload Receipt / Invoice
                      </Button>
                    </TabsContent>

                    <TabsContent value="sms" className="space-y-4 mt-0">
                      <div className="space-y-2">
                        <p className="text-xs text-slate-500">Paste your raw Sri Lankan bank SMS here (ComBank, BOC, HNB, Sampath, etc.).</p>
                        <textarea
                          placeholder="e.g. LKR 1,500.00 was debited from A/C ... at KEELLS..."
                          value={smsText}
                          onChange={(e) => setSmsText(e.target.value)}
                          className="w-full min-h-[100px] p-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          onClick={handleSmsAdd}
                          disabled={loading || !smsText}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        >
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />} Process SMS
                        </Button>
                      </div>
                    </TabsContent>

                    <TabsContent value="manual" className="mt-0">
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</label>
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                          <Input
                            placeholder="e.g. Weekly Groceries"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-slate-50 border-slate-200"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Category</label>
                          <Select onValueChange={(v) => setCategory(v as Category)} defaultValue="Other">
                            <SelectTrigger className="bg-slate-50 border-slate-200">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(c => (
                                <SelectItem key={c} value={c}>{c}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            variant={type === 'expense' ? 'default' : 'outline'}
                            onClick={() => setType('expense')}
                            className={`w-full text-xs font-bold ${type === 'expense' ? 'bg-indigo-600' : ''}`}
                          >
                            Expense
                          </Button>
                          <Button
                            type="button"
                            variant={type === 'income' ? 'default' : 'outline'}
                            onClick={() => setType('income')}
                            className={`w-full text-xs font-bold ${type === 'income' ? 'bg-indigo-600' : ''}`}
                          >
                            Income
                          </Button>
                        </div>
                        <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-6" disabled={loading}>
                          {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Add Record
                        </Button>
                      </form>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200 shadow-sm p-6 rounded-xl">
                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-4">Savings Goals</h4>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-600 italic">Emergency Fund</span>
                      <span className="text-slate-900">85%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[85%]"></div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-bold">
                      <span className="text-slate-600 italic">New Laptop</span>
                      <span className="text-slate-900">42%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[42%]"></div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <ResearchPanel />
        </div>
      </main>
    </div>
  );
}
