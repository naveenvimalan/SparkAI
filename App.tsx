
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, AppState, SessionStats, Quiz, MediaData, Goal, IntentCheck } from './types';
import { generateAssistantStream } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import StatsModal from './components/StatsModal';
import GoalSelector from './components/GoalSelector';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isQuizPending, setIsQuizPending] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [sparks, setSparks] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionStats = useMemo(() => {
    const questions = messages.filter(m => m.role === 'user').length;
    const responses = messages.filter(m => m.role === 'assistant').length;
    const intentDecisions = messages.filter(m => m.isIntentDecision).length;
    
    // Agency is now "Active Synthesis" / "Passive Consumption"
    // Sparks and Intent Decisions are heavy weights for Agency.
    const activeActions = (sparks * 2.5) + (intentDecisions * 1.5) + (questions * 0.5);
    const totalPotential = Math.max(1, responses + questions);
    
    // Agency capped at 100, normalized for a healthy session
    const agency = Math.min(100, Math.round((activeActions / totalPotential) * 100));
    
    return { questions, responses, intentDecisions, agency, sparks };
  }, [messages, sparks]);

  const rank = useMemo(() => {
    if (sparks >= 15) return "Architect";
    if (sparks >= 8) return "Synthesizer";
    return "Analyst";
  }, [sparks]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isQuizPending, appState]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setSelectedMedia({ data: base64, mimeType: file.type, name: file.name });
    };
    reader.readAsDataURL(file);
  };

  const handleGoalSelect = (goal: Goal) => {
    setSelectedGoal(goal);
    setAppState(AppState.CHATTING);
    setMessages([{
      id: 'system-initial',
      role: 'assistant',
      content: `🎯 Goal confirmed: **${goal}**. How shall we proceed?`,
      timestamp: Date.now()
    }]);
  };

  const handleSendMessage = async (text: string, isIntent = false) => {
    if (isQuizPending || isTyping) return;
    if (!text.trim() && !selectedMedia) return;
    
    const currentMedia = selectedMedia;
    setSelectedMedia(null);
    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text || "", 
      timestamp: Date.now(),
      media: currentMedia || undefined,
      isIntentDecision: isIntent
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    
    await getResponse(text, userMsg, currentMedia || undefined);
  };

  const handleQuizCorrect = () => {
    setSparks(s => s + 1);
    setIsQuizPending(false);
  };

  const sanitizeContent = (text: string) => {
    return text
      .split("---INTENT_START---")[0]
      .split("---REFLECTION_START---")[0]
      .split("---STATS_START---")[0]
      .replace(/\[METADATA\][\s\S]*?(?=\n\n|$)/gi, '')
      .replace(/\[ORIGIN: SPARK-SYSTEM\][\s\S]*?(?=\n\n|$)/gi, '')
      .trim();
  };

  const cleanJson = (str: string) => {
    if (!str) return "";
    let cleaned = str.replace(/```json/g, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) return cleaned.substring(start, end + 1);
    return cleaned;
  };

  const getResponse = async (text: string, userMsg: Message, media?: MediaData) => {
    setIsTyping(true);
    const userInteractionCount = messages.filter(m => m.role === 'user').length + 1;
    
    const showStats = userInteractionCount > 0 && userInteractionCount % 5 === 0;
    const statsString = showStats
      ? `${userInteractionCount} queries | ${sessionStats.agency}% agency | ${sessionStats.intentDecisions} decisions`
      : undefined;
    
    const historySnapshot = [...messages, userMsg].slice(-10).map(m => ({ 
      role: m.role, 
      content: m.content, 
      media: m.media 
    }));

    const assistantMsgId = `assistant-${Date.now()}`;
    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() }]);

    try {
      const stream = await generateAssistantStream(
        text, 
        historySnapshot.slice(0, -1), 
        statsString,
        selectedGoal || undefined,
        media
      );
      
      let fullContent = "";
      for await (const chunk of stream) {
        fullContent += chunk.text || "";
        const displayContent = sanitizeContent(fullContent);
        setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: displayContent } : m));
      }

      let finalContent = sanitizeContent(fullContent);
      let stats: string | undefined;
      let quizData: Quiz | undefined;
      let intentData: IntentCheck | undefined;

      if (fullContent.includes("---STATS_START---")) {
        stats = fullContent.split("---STATS_START---")[1]?.split("---STATS_END---")[0]?.trim();
      }

      if (fullContent.includes("---REFLECTION_START---")) {
        const parts = fullContent.split(/---REFLECTION_START---|---REFLECTION_END---/);
        try {
          const jsonStr = cleanJson(parts[1]?.trim());
          if (jsonStr) {
            quizData = JSON.parse(jsonStr);
            setIsQuizPending(true);
          }
        } catch (e) { console.error("Reflection parse error", e); }
      }

      if (fullContent.includes("---INTENT_START---")) {
        const parts = fullContent.split(/---INTENT_START---|---INTENT_END---/);
        try {
          const jsonStr = cleanJson(parts[1]?.trim());
          if (jsonStr) {
            intentData = JSON.parse(jsonStr);
          }
        } catch (e) { console.error("Intent parse error", e); }
      }

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { 
        ...m, 
        content: finalContent, 
        stats, 
        quizData, 
        intentData 
      } : m));

    } catch (error) {
      console.error("Stream Error:", error);
      setMessages(prev => prev.map(m => m.id === assistantMsgId && m.content === '' ? { ...m, content: "Synthesis layer offline. Please retry." } : m));
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-white relative font-sans overflow-hidden">
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={sessionStats} />

      <header className="px-10 py-6 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-slate-50">
        <div className="flex flex-col">
          <h1 className="font-bold text-slate-900 tracking-tighter text-xl">Spark</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{rank}</span>
          </div>
        </div>
        
        <button onClick={() => setIsStatsOpen(true)} className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 transition-all hover:bg-slate-100 active:scale-95">
           <span className="text-xs font-bold text-slate-700 flex items-center gap-2">
             {sparks} <span className="text-indigo-400">✨</span>
           </span>
           <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-1000 ease-in-out" style={{ width: `${sessionStats.agency}%` }} />
           </div>
        </button>
      </header>

      <main ref={scrollRef} className={`flex-1 flex flex-col ${appState === AppState.INITIAL ? 'overflow-hidden justify-center' : 'overflow-y-auto justify-start'} p-6 md:px-12 space-y-2 scrollbar-hide`}>
        {appState === AppState.INITIAL && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-700 -mt-10">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter max-w-md leading-tight mb-8">🎯 What is your goal?</h2>
            <GoalSelector onSelect={handleGoalSelect} />
          </div>
        )}

        {appState === AppState.CHATTING && (
          <div className="max-w-4xl mx-auto w-full space-y-6 pt-6 pb-48">
            {messages.map((msg) => (
              <ChatBubble 
                key={msg.id} 
                message={msg} 
                onQuizCorrect={handleQuizCorrect}
                onIntentSelect={(vals) => handleSendMessage(`Intent decision: ${vals.join(', ')}`, true)}
              />
            ))}
            
            {isTyping && messages[messages.length-1]?.role !== 'assistant' && (
              <div className="flex justify-start py-8 px-10 opacity-30">
                <div className="flex gap-1.5 animate-pulse">
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                  <div className="w-1.5 h-1.5 bg-slate-500 rounded-full" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {appState === AppState.CHATTING && (
        <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 py-8 md:px-12 pointer-events-none">
          <div className="max-w-4xl mx-auto pointer-events-auto">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex flex-col gap-3">
              <div className={`relative glass bg-white/70 rounded-full p-1.5 flex items-center gap-1 border transition-all duration-500 shadow-2xl ${isQuizPending ? 'bg-slate-50/50 grayscale opacity-70 cursor-not-allowed' : 'border-slate-200 hover:border-slate-300'}`}>
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isQuizPending} className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
                <input
                  type="text"
                  value={inputValue}
                  autoComplete="off"
                  onChange={(e) => setInputValue(e.target.value)}
                  disabled={isQuizPending}
                  placeholder={isQuizPending ? "Solve synthesis check to unlock..." : "Articulate your synthesis..."}
                  className="flex-1 bg-transparent border-none px-4 py-3 text-[16px] font-medium outline-none placeholder-slate-300"
                />
                <button 
                  type="submit" 
                  disabled={(!inputValue.trim() && !selectedMedia) || isTyping || isQuizPending} 
                  className={`h-11 w-11 rounded-full flex items-center justify-center transition-all ${isQuizPending ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-lg'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            </form>
          </div>
        </footer>
      )}
    </div>
  );
};

export default App;
