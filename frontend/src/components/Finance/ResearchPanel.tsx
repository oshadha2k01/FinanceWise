import React, { useState, useEffect } from "react";
import { useFinanceStore } from "../../store/useFinanceStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentAction } from "../../types";
import toast from "react-hot-toast";
import { Network, Bot, Mic, MicOff, Loader2, Sparkles, TerminalSquare } from "lucide-react";

export function ResearchPanel() {
  const { graphAnalysis, fetchGraphAnalysis, executeAgentAction, sendVoiceChat, loading } = useFinanceStore();
  
  // Agent State
  const [agentTask, setAgentTask] = useState("");
  const [agentResult, setAgentResult] = useState<AgentAction | null>(null);

  // Voice Chat State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [chatLog, setChatLog] = useState<{role: 'user' | 'ai', text: string}[]>([]);

  useEffect(() => {
    fetchGraphAnalysis();
  }, [fetchGraphAnalysis]);

  const handleAgentTask = async () => {
    if (!agentTask) return;
    try {
      setAgentResult(null);
      const result = await executeAgentAction(agentTask);
      setAgentResult(result);
      toast.success("Agent executed task successfully");
    } catch (e) {
      toast.error("Agent execution failed");
    }
  };

  const startVoiceChat = () => {
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
    
    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatLog(prev => [...prev, { role: 'user', text: transcript }]);
      
      try {
        const responseText = await sendVoiceChat(transcript);
        setChatLog(prev => [...prev, { role: 'ai', text: responseText }]);
        speakText(responseText);
      } catch (e) {
        toast.error("AI failed to respond.");
      }
    };
    
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  const speakText = (text: string) => {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="space-y-8 mt-8 border-t border-slate-200 pt-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-6 h-6 text-indigo-500" />
        <h2 className="text-2xl font-bold text-slate-800">Advanced Research Features</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Graph Neural Network Panel */}
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Network className="w-5 h-5 text-fuchsia-500" /> 
              Graph Network Analysis (GNN)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {graphAnalysis ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-center w-1/2 border-r border-slate-200">
                    <div className="text-xs text-slate-500 font-bold uppercase">Nodes Found</div>
                    <div className="text-2xl font-bold text-fuchsia-600">{graphAnalysis.nodes}</div>
                  </div>
                  <div className="text-center w-1/2">
                    <div className="text-xs text-slate-500 font-bold uppercase">Edges Connected</div>
                    <div className="text-2xl font-bold text-fuchsia-600">{graphAnalysis.edges}</div>
                  </div>
                </div>
                <div className="text-sm text-slate-700 bg-white p-4 rounded-lg border border-slate-200 shadow-sm leading-relaxed">
                  <strong className="text-fuchsia-900 block mb-1">Topological Insights:</strong>
                  {graphAnalysis.analysis}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">Loading Graph Analysis...</div>
            )}
          </CardContent>
        </Card>

        {/* Autonomous Action Agent Panel */}
        <Card className="rounded-xl border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50 border-b border-slate-100 p-5">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-500" /> 
              Autonomous Browser Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <p className="text-xs text-slate-500">Command the AI to execute real-world tasks using Playwright automation (Simulation).</p>
            <div className="flex gap-2">
              <Input 
                placeholder="e.g., Cancel my Netflix subscription..." 
                value={agentTask}
                onChange={(e) => setAgentTask(e.target.value)}
                disabled={loading}
              />
              <Button onClick={handleAgentTask} disabled={loading || !agentTask} className="bg-blue-600 hover:bg-blue-700">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Execute"}
              </Button>
            </div>
            
            {agentResult && (
              <div className="mt-4 bg-slate-900 rounded-lg p-4 font-mono text-xs text-green-400 overflow-hidden shadow-inner border border-slate-800">
                <div className="flex items-center gap-2 mb-3 text-slate-400 border-b border-slate-800 pb-2">
                  <TerminalSquare className="w-4 h-4" /> Agent Execution Trace
                </div>
                <ul className="space-y-2">
                  {agentResult.steps.map((step, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-slate-600">[{idx+1}]</span> {step}
                    </li>
                  ))}
                </ul>
                <div className="mt-3 text-blue-400 font-bold">» Task Completed Successfully</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voice-to-Voice Companion Panel */}
        <Card className="rounded-xl border-slate-200 shadow-sm lg:col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardContent className="p-8 flex flex-col items-center text-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Voice-to-Voice Companion</h3>
            <p className="text-sm text-slate-500 max-w-lg mb-6">Talk to your AI financial advisor naturally using real-time speech recognition and synthesis. Just tap the mic and say "How am I doing this month?"</p>
            
            <button 
              onClick={startVoiceChat}
              disabled={isListening || isSpeaking}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg border-4 
                ${isListening 
                  ? 'bg-rose-500 border-rose-300 text-white animate-pulse' 
                  : isSpeaking 
                    ? 'bg-indigo-500 border-indigo-300 text-white animate-pulse' 
                    : 'bg-white border-indigo-100 text-indigo-600 hover:bg-indigo-50 hover:scale-105'
                }`}
            >
              {isListening ? <Mic className="w-10 h-10" /> : isSpeaking ? <Bot className="w-10 h-10" /> : <MicOff className="w-10 h-10" />}
            </button>
            <div className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
              {isListening ? 'Listening...' : isSpeaking ? 'AI is speaking...' : 'Tap to speak'}
            </div>

            {chatLog.length > 0 && (
              <div className="mt-8 w-full max-w-2xl bg-white/60 backdrop-blur-sm rounded-xl p-6 border border-white/40 shadow-sm text-left space-y-4 max-h-[300px] overflow-y-auto">
                {chatLog.map((log, idx) => (
                  <div key={idx} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${log.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}`}>
                      {log.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
