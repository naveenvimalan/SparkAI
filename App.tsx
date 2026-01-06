
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, Goal, AppState, SessionStats, Quiz, MediaData } from './types';
import { generateAssistantStream } from './services/geminiService';
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
  
  // Track last quiz by turn count globally
  const [lastQuizTurn, setLastQuizTurn] = useState(-3);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionStats = useMemo(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    const questions = userMsgs.length;
    const userWords = userMsgs.reduce((acc, m) => acc + m.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const aiWords = messages.filter(m => m.role === 'assistant' && !m.isQuiz && !m.isSystemReport).reduce((acc, m) => acc + m.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const totalWords = userWords + aiWords;
    let agency = totalWords > 0 ? Math.min(100, Math.round((userWords / totalWords) * 100)) : 100;
    return { questions, responses: messages.length, userWords, aiWords, agency, sparks };
  }, [messages, sparks]);

  const rank = useMemo(() => {
    if (sparks >= 15) return "Architect";
    if (sparks >= 10) return "Master";
    if (sparks >= 5) return "Thinker";
    return "Novice";
  }, [sparks]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleGoalSelect = async (goal: Goal) => {
    setCurrentGoal(goal);
    setAppState(AppState.CHATTING);
    
    if (pendingUserMessage !== null || pendingMedia) {
      const text = pendingUserMessage || "";
      const media = pendingMedia;
      setPendingUserMessage(null);
      setPendingMedia(undefined);

      const userMsg: Message = {
        role: 'user',
        content: text || (media ? "Analyzing context..." : ""),
        timestamp: Date.now(),
        media: media
      };
      setMessages(prev => [...prev, userMsg]);
      await getResponse(text, goal, media);
    }
  };

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
    
    if (!currentGoal) {
      setPendingUserMessage(text);
      setPendingMedia(selectedMedia || undefined);
      setInputValue('');
      setSelectedMedia(null);
      setAppState(AppState.SELECTING_GOAL);
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: "Before we proceed, what is your primary goal for this interaction?",
        timestamp: Date.now(),
      }]);
      return;
    }

    const currentMedia = selectedMedia;
    setSelectedMedia(null);
    const userMsg: Message = {
      role: 'user',
      content: text || (currentMedia ? "Analyzing attachment..." : ""),
      timestamp: Date.now(),
      media: currentMedia || undefined
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    await getResponse(text, currentGoal, currentMedia || undefined);
  };

  const getResponse = async (text: string, goal: Goal, media?: MediaData) => {
    setIsTyping(true);
    
    const userMsgs = messages.filter(m => m.role === 'user');
    const userInteractionCount = userMsgs.length + 1;
    
    // STRATEGIC FRICTION: Integrated checkpoints triggered every 4 turns regardless of mode
    const triggerQuiz = (userInteractionCount - lastQuizTurn >= 4);

    const history = messages.slice(-10).map(m => ({ role: m.role, content: m.content, media: m.media }));
    const assistantMsgId = Date.now();
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      timestamp: assistantMsgId,
      goal: goal || undefined 
    }]);

    try {
      const stream = await generateAssistantStream(text, history, goal, triggerQuiz, media);
      let fullContent = "";

      for await (const chunk of stream) {
        fullContent += chunk.text;
        const displayContent = fullContent.split("---QUIZ_START---")[0].trim();

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.timestamp === assistantMsgId) {
            lastMsg.content = displayContent;
          }
          return newMessages;
        });
      }

      if (fullContent.includes("---QUIZ_START---")) {
        const parts = fullContent.split(/---QUIZ_START---|---QUIZ_END---/);
        const cleanContent = parts[0].trim();
        let quizData: Quiz | null = null;
        
        try {
          const jsonStr = parts[1]?.trim();
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            if (parsed.question && Array.isArray(parsed.options) && parsed.explanation) {
              quizData = parsed;
              setLastQuizTurn(userInteractionCount);
            }
          }
        } catch (e) { console.error("Checkpoint parsing error", e); }

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsgIndex = newMessages.findIndex(m => m.timestamp === assistantMsgId);
          if (lastMsgIndex !== -1) {
            newMessages[lastMsgIndex].content = cleanContent;
          }
          if (quizData) {
            newMessages.push({ 
              role: 'assistant', 
              content: "Neural Checkpoint", 
              isQuiz: true, 
              quizData, 
              timestamp: Date.now() + 10 
            });
          }
          return newMessages;
        });
      }

      if (userInteractionCount % 5 === 0) {
        const reflections = [
          "Wait—did you just offload a critical decision to me?",
          "Look at your Agency balance. Are you the architect here, or just the supervisor?",
          "How would you defend this analysis if my reasoning was hallucinated?",
          "Is this task building your capacity or replacing it?"
        ];
        const randomReflection = reflections[Math.floor(Math.random() * reflections.length)];
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `📊 Session Balance: ${sessionStats.questions} queries | ${sessionStats.agency}% agency\n\n💭 **Reflect:** ${randomReflection}`,
          isSystemReport: true,
          timestamp: Date.now() + 20,
        }]);
      }

    } catch (error) {
      console.error("Stream Error:", error);
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsgIndex = newMessages.findIndex(m => m.timestamp === assistantMsgId);
        if (lastMsgIndex !== -1) {
          newMessages[lastMsgIndex].content = "Momentary cognitive lapse. Let's continue.";
        }
        return newMessages;
      });
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white relative font-sans overflow-hidden">
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={sessionStats} />

      <header className="px-8 py-6 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-slate-50">
        <div className="flex flex-col items-start">
          <h1 className="font-semibold text-slate-900 tracking-tight leading-none text-2xl text-indigo-600">Spark</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{rank}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button onClick={() => setIsStatsOpen(true)} className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/50 transition-all hover:bg-slate-100 active:scale-95">
             <span className="text-xs font-black text-slate-600 flex items-center gap-1.5">
               {sparks} <span className="text-indigo-500">✨</span>
             </span>
             <div className="w-12 h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                <div className={`h-full bg-indigo-600 transition-all duration-700 ease-out ${messages.length === 0 ? 'w-0' : ''}`} style={{ width: messages.length === 0 ? '0%' : `${sessionStats.agency}%` }} />
              </div>
          </button>
          {currentGoal && (
            <button onClick={handleResetGoal} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-200">
              {currentGoal}
            </button>
          )}
        </div>
      </header>

      <main ref={scrollRef} className={`flex-1 flex flex-col ${messages.length === 0 ? 'overflow-hidden justify-center' : 'overflow-y-auto justify-start'} p-6 md:p-10 space-y-2 scrollbar-hide`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 -mt-16">
            <h2 className="text-4xl font-bold text-slate-900 tracking-tight leading-none">Hey, what's on your mind?</h2>
            <p className="text-slate-400 mt-6 text-xl font-medium max-w-lg px-4">Sustainability is the preservation of your agency. What shall we protect today?</p>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full space-y-4 pt-4 pb-12">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} message={msg} onQuizCorrect={() => setSparks(s => s + 1)} />
          ))}
          
          {appState === AppState.SELECTING_GOAL && (
            <div className="animate-in fade-in slide-in-from-bottom-6 duration-500 py-10 max-w-xl mx-auto w-full">
              <GoalSelector onSelect={handleGoalSelect} />
            </div>
          )}

          {isTyping && messages[messages.length-1]?.role !== 'assistant' && (
            <div className="flex justify-start max-w-3xl mx-auto w-full py-6 px-8 opacity-40">
              <div className="flex gap-1.5">
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-8 md:px-12 bg-white">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex flex-col gap-4 max-w-3xl mx-auto">
          {(selectedMedia || pendingMedia) && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-2 shadow-sm">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-xs overflow-hidden shadow-sm shrink-0">
                {(selectedMedia || pendingMedia)?.mimeType.startsWith('image/') ? (
                  <img src={`data:${(selectedMedia || pendingMedia)?.mimeType};base64,${(selectedMedia || pendingMedia)?.data}`} className="w-full h-full object-cover" />
                ) : 'DOC'}
              </div>
              <span className="text-xs font-bold text-slate-700 truncate flex-1">{(selectedMedia || pendingMedia)?.name}</span>
              <button type="button" onClick={() => { setSelectedMedia(null); setPendingMedia(undefined); }} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}

          <div className="relative glass rounded-[2.5rem] p-2 flex items-center gap-1 border border-slate-200 shadow-2xl shadow-slate-100/40">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="w-12 h-12 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all active:scale-90 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={appState === AppState.SELECTING_GOAL}
              placeholder="Deep synthesis required..."
              className="flex-1 bg-transparent border-none px-6 py-4 text-base font-medium focus:ring-0 outline-none placeholder-slate-300"
            />
            <button type="submit" disabled={(!inputValue.trim() && !selectedMedia) || isTyping} className="bg-slate-900 text-white h-12 w-12 rounded-[2rem] flex items-center justify-center hover:bg-black transition-all active:scale-95 shadow-xl disabled:opacity-10 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default App;
