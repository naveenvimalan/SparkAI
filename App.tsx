
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, Goal, AppState, SessionStats, Quiz, MediaData } from './types';
import { generateAssistantResponse } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import GoalSelector from './components/GoalSelector';
import StatsModal from './components/StatsModal';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentGoal, setCurrentGoal] = useState<Goal>(null);
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [pendingUserMessage, setPendingUserMessage] = useState<string | null>(null);
  const [pendingMedia, setPendingMedia] = useState<MediaData | undefined>(undefined);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [sparks, setSparks] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rank = useMemo(() => {
    if (sparks >= 15) return "Architect";
    if (sparks >= 10) return "Master";
    if (sparks >= 5) return "Thinker";
    return "Novice";
  }, [sparks]);

  const sessionStats = useMemo(() => {
    const questions = messages.filter(m => m.role === 'user').length;
    const responses = messages.filter(m => m.role === 'assistant' && !m.isQuiz && !m.isSystemReport).length;
    const userWords = messages.filter(m => m.role === 'user').reduce((acc, m) => acc + m.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const aiWords = messages.filter(m => m.role === 'assistant' && !m.isQuiz && !m.isSystemReport).reduce((acc, m) => acc + m.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const totalWords = userWords + aiWords;
    let agency = totalWords > 0 ? Math.min(100, Math.round((userWords / totalWords) * 303)) : 100;
    return { questions, responses, userWords, aiWords, agency, sparks };
  }, [messages, sparks]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, appState]);

  // Handle goal selection after a user sends a message without a current goal
  const handleGoalSelect = async (goal: Goal) => {
    setCurrentGoal(goal);
    setAppState(AppState.CHATTING);
    if (pendingUserMessage !== null || pendingMedia) {
      const text = pendingUserMessage || "";
      const media = pendingMedia;
      setPendingUserMessage(null);
      setPendingMedia(undefined);
      await getResponse(text, goal, media);
    }
  };

  // Reset current goal and prompt for a new one
  const handleResetGoal = () => {
    setCurrentGoal(null);
    setAppState(AppState.SELECTING_GOAL);
  };

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

  const handleSendMessage = async (text: string) => {
    if (!text.trim() && !selectedMedia) return;
    const currentMedia = selectedMedia;
    setSelectedMedia(null);
    const userMsg: Message = {
      role: 'user',
      content: text || (currentMedia ? "Analyzing uploaded file..." : ""),
      timestamp: Date.now(),
      media: currentMedia || undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    if (!currentGoal) {
      setPendingUserMessage(text);
      setPendingMedia(currentMedia || undefined);
      setAppState(AppState.SELECTING_GOAL);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: "How should we process this inquiry? Choose a mode below.",
        timestamp: Date.now(),
      }]);
      return;
    }
    await getResponse(text, currentGoal, currentMedia || undefined);
  };

  const getResponse = async (text: string, goal: Goal, media?: MediaData) => {
    setIsTyping(true);
    const standardResponses = messages.filter(m => m.role === 'assistant' && !m.isQuiz && !m.isSystemReport).length;
    const triggerQuiz = (standardResponses + 1) % 3 === 0;
    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content, media: m.media }));
    const rawResponse = await generateAssistantResponse(text, history, goal, triggerQuiz, media);
    let mainContent = rawResponse;
    let quizData: Quiz | null = null;
    if (mainContent.includes("---QUIZ_START---")) {
      try {
        const parts = mainContent.split(/---QUIZ_START---|---QUIZ_END---/);
        mainContent = parts[0].trim();
        quizData = JSON.parse(parts[1].trim());
      } catch (e) { console.error(e); }
    }
    setMessages(prev => {
      let nextMessages: Message[] = [...prev, { role: 'assistant' as const, content: mainContent, timestamp: Date.now(), goal: goal || undefined }];
      if (quizData) nextMessages.push({ role: 'assistant' as const, content: "Neural Checkpoint", isQuiz: true, quizData, timestamp: Date.now() + 10 });
      if (nextMessages.filter(m => m.role === 'user').length % 5 === 0) {
        nextMessages.push({ role: 'assistant' as const, content: `Session Progress: ${sessionStats.agency}% Agency`, isSystemReport: true, timestamp: Date.now() + 20 });
      }
      return nextMessages;
    });
    setIsTyping(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto border-x border-slate-100 bg-white relative font-sans overflow-hidden">
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={sessionStats} />

      <header className="px-8 py-5 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-sm">
            <span className="text-lg">🧠</span>
          </div>
          <div>
            <h1 className="font-bold text-slate-900 tracking-tight leading-none text-base">CogSustain</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{rank}</span>
              <span className="w-1 h-1 bg-slate-200 rounded-full" />
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{sparks} Sparks</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <button onClick={() => setIsStatsOpen(true)} className="flex items-center gap-3 group">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest group-hover:text-slate-900 transition-colors">Agency Share</span>
              <div className="w-16 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-slate-900 transition-all duration-700" style={{ width: `${sessionStats.agency}%` }} />
              </div>
            </div>
          </button>
          {currentGoal && (
            <button onClick={handleResetGoal} className="px-3 py-1.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-200 text-[10px] font-bold uppercase tracking-wider hover:bg-slate-100 transition-all">
              {currentGoal}
            </button>
          )}
        </div>
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-6 md:p-10 space-y-2 scrollbar-hide">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
            <span className="text-4xl mb-6 grayscale opacity-40">🧠</span>
            <h2 className="text-2xl font-semibold text-slate-800 tracking-tight">Hey, what's on your mind?</h2>
            <p className="text-slate-400 mt-2 text-sm font-medium">I'm here to help you synthesize ideas intentionally.</p>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full space-y-6">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} message={msg} onQuizCorrect={() => setSparks(s => s + 1)} />
          ))}
        </div>

        {appState === AppState.SELECTING_GOAL && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 py-10 max-w-xl mx-auto w-full">
            <GoalSelector onSelect={handleGoalSelect} />
          </div>
        )}

        {isTyping && (
          <div className="flex justify-start max-w-3xl mx-auto w-full py-4">
            <div className="flex gap-1.5 opacity-40">
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
              <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        )}
      </main>

      <footer className="px-6 py-8 md:px-10">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex flex-col gap-4 max-w-2xl mx-auto">
          {selectedMedia && (
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-bottom-2">
              <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-xs overflow-hidden">
                {selectedMedia.mimeType.startsWith('image/') ? <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="w-full h-full object-cover" /> : 'PDF'}
              </div>
              <span className="text-[11px] font-semibold text-slate-600 truncate flex-1">{selectedMedia.name}</span>
              <button type="button" onClick={() => setSelectedMedia(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}

          <div className="relative glass rounded-[1.75rem] shadow-xl shadow-slate-200/40 p-1.5 flex items-center gap-1">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-all active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={appState === AppState.SELECTING_GOAL}
              placeholder="Type your message..."
              className="flex-1 bg-transparent border-none px-4 py-3 text-sm font-medium focus:ring-0 placeholder-slate-300"
            />
            <button type="submit" disabled={(!inputValue.trim() && !selectedMedia) || isTyping} className="bg-slate-900 text-white h-11 w-11 rounded-2xl flex items-center justify-center hover:bg-black transition-all active:scale-90 shadow-lg disabled:opacity-20">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default App;
