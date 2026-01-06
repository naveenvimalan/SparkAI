
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Message, AppState, SessionStats, Quiz, MediaData } from './types';
import { generateAssistantStream } from './services/geminiService';
import ChatBubble from './components/ChatBubble';
import StatsModal from './components/StatsModal';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isQuizPending, setIsQuizPending] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [sparks, setSparks] = useState(0);
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);
  const [lastQuizTurn, setLastQuizTurn] = useState(0);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sessionStats = useMemo(() => {
    const userMsgs = messages.filter(m => m.role === 'user');
    const questions = userMsgs.length;
    const userWords = userMsgs.reduce((acc, m) => acc + m.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const aiWords = messages.filter(m => m.role === 'assistant' && !m.isQuiz && !m.isSystemReport).reduce((acc, m) => acc + m.content.trim().split(/\s+/).filter(Boolean).length, 0);
    const totalWords = userWords + aiWords;
    let agency = totalWords > 0 ? Math.min(100, Math.round((userWords / (totalWords * 0.7)) * 100)) : 100;
    return { questions, responses: messages.length, userWords, aiWords, agency: Math.min(100, agency), sparks };
  }, [messages, sparks]);

  const rank = useMemo(() => {
    if (sparks >= 15) return "Architect";
    if (sparks >= 8) return "Synthesizer";
    return "Analyst";
  }, [sparks]);

  useEffect(() => {
    if (scrollRef.current && messages.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isQuizPending]);

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
    if (isQuizPending || isTyping) return;
    if (!text.trim() && !selectedMedia) return;
    
    if (appState === AppState.INITIAL) setAppState(AppState.CHATTING);

    const currentMedia = selectedMedia;
    setSelectedMedia(null);
    const userMsgId = `user-${Date.now()}`;
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: text || "", 
      timestamp: Date.now(),
      media: currentMedia || undefined
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
    // Strip accidental internal tags that might leak from the LLM
    return text
      .replace(/TRIGGER_CHECKPOINT/gi, '')
      .replace(/\[SYSTEM:.*?\]/gi, '')
      .replace(/\(\(META_CMD:.*?\)\)/gi, '')
      .trim();
  };

  const getResponse = async (text: string, userMsg: Message, media?: MediaData) => {
    setIsTyping(true);
    const userInteractionCount = messages.filter(m => m.role === 'user').length + 1;
    const triggerQuiz = (userInteractionCount - lastQuizTurn >= 5);
    
    const historySnapshot = [...messages, userMsg].slice(-12).map(m => ({ 
      role: m.role, 
      content: m.content, 
      media: m.media 
    }));

    const assistantMsgId = `assistant-${Date.now()}`;
    
    setMessages(prev => [...prev, { 
      id: assistantMsgId,
      role: 'assistant', 
      content: '', 
      timestamp: Date.now()
    }]);

    try {
      const stream = await generateAssistantStream(text, historySnapshot.slice(0, -1), triggerQuiz, media);
      let fullContent = "";

      for await (const chunk of stream) {
        fullContent += chunk.text;
        const rawDisplayContent = fullContent.split("---QUIZ_START---")[0];
        const displayContent = sanitizeContent(rawDisplayContent);

        setMessages(prev => {
          return prev.map(m => {
            if (m.id === assistantMsgId) {
              return { ...m, content: displayContent };
            }
            return m;
          });
        });
      }

      if (fullContent.includes("---QUIZ_START---")) {
        const parts = fullContent.split(/---QUIZ_START---|---QUIZ_END---/);
        const cleanContent = sanitizeContent(parts[0]);
        let quizData: Quiz | null = null;
        
        try {
          const jsonStr = parts[1]?.trim();
          if (jsonStr) {
            const parsed = JSON.parse(jsonStr);
            if (parsed.question && Array.isArray(parsed.options)) {
              const shuffledOptions = [...parsed.options].sort(() => Math.random() - 0.5);
              quizData = { ...parsed, options: shuffledOptions };
              setLastQuizTurn(userInteractionCount);
            }
          }
        } catch (e) { console.error("Checkpoint parsing error", e); }

        setMessages(prev => {
          const finalMessages = prev.map(m => {
            if (m.id === assistantMsgId) {
              return { ...m, content: cleanContent };
            }
            return m;
          });
          
          if (quizData) {
            finalMessages.push({ 
              id: `quiz-${Date.now()}`,
              role: 'assistant', 
              content: "Synthesis Checkpoint", 
              isQuiz: true, 
              quizData, 
              timestamp: Date.now() + 5 
            });
            setIsQuizPending(true);
          }
          return finalMessages;
        });
      }
    } catch (error) {
      console.error("Stream Error:", error);
      setMessages(prev => prev.map(m => {
        if (m.id === assistantMsgId && m.content === '') {
          return { ...m, content: "Synthesis interrupted. Please try again." };
        }
        return m;
      }));
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

      <main ref={scrollRef} className={`flex-1 flex flex-col ${messages.length === 0 ? 'overflow-hidden justify-center' : 'overflow-y-auto justify-start'} p-6 md:px-12 space-y-2 scrollbar-hide`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 -mt-20">
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tighter max-w-md leading-tight">Preserve your cognitive agency.</h2>
            <p className="text-slate-400 mt-4 text-lg font-medium max-w-sm leading-relaxed">Articulate your intent. I am here to help you synthesize, not just output.</p>
          </div>
        )}

        <div className="max-w-4xl mx-auto w-full space-y-6 pt-6 pb-32">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} onQuizCorrect={handleQuizCorrect} />
          ))}
          
          {isTyping && messages[messages.length-1]?.role !== 'assistant' && (
            <div className="flex justify-start max-w-4xl mx-auto w-full py-8 px-10 opacity-30">
              <div className="flex gap-1.5">
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }} />
              </div>
            </div>
          )}

          {isQuizPending && (
            <div className="flex justify-center py-6 animate-in slide-in-from-bottom-4 duration-700">
              <div className="px-5 py-2 bg-indigo-50/70 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500 shadow-sm">
                Neural Checkpoint: Synthesize to continue
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 py-6 md:px-12 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex flex-col gap-3">
            {selectedMedia && (
              <div className="flex items-center gap-4 p-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-slate-100 animate-in slide-in-from-bottom-2 shadow-lg w-fit max-w-xs self-start mb-2 ml-4">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-[10px] overflow-hidden shrink-0">
                  {selectedMedia.mimeType.startsWith('image/') ? (
                    <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="w-full h-full object-cover" />
                  ) : 'DOC'}
                </div>
                <div className="flex-1 flex flex-col overflow-hidden">
                  <span className="text-[12px] font-bold text-slate-800 truncate">{selectedMedia.name}</span>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Context Ready</span>
                </div>
                <button type="button" onClick={() => setSelectedMedia(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              </div>
            )}

            <div className={`relative glass bg-white/70 rounded-full p-1.5 flex items-center gap-1 border transition-all duration-500 ${isQuizPending ? 'border-indigo-100 bg-slate-50/30 grayscale opacity-50 cursor-not-allowed' : 'border-slate-200/50 shadow-2xl shadow-slate-200/40 hover:border-slate-300'}`}>
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()} 
                disabled={isQuizPending}
                className={`w-11 h-11 flex items-center justify-center transition-all shrink-0 rounded-full ${isQuizPending ? 'opacity-10' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-50 active:scale-90'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
              <input
                type="text"
                value={inputValue}
                autoComplete="off"
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isQuizPending}
                placeholder={isQuizPending ? "Checkpoint active..." : "Articulate your synthesis..."}
                className="flex-1 bg-transparent border-none px-4 py-3 text-[16px] font-medium focus:ring-0 outline-none placeholder-slate-300 disabled:opacity-30"
              />
              <button 
                type="submit" 
                disabled={(!inputValue.trim() && !selectedMedia) || isTyping || isQuizPending} 
                className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shrink-0 ${isQuizPending ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-black active:scale-95 shadow-lg'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default App;
