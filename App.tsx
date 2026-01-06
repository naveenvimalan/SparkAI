
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
    const userMsg: Message = {
      role: 'user',
      content: text || "Media submission for analysis.",
      timestamp: Date.now(),
      media: currentMedia || undefined
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    await getResponse(text, currentMedia || undefined);
  };

  const handleQuizCorrect = () => {
    setSparks(s => s + 1);
    setIsQuizPending(false);
  };

  const getResponse = async (text: string, media?: MediaData) => {
    setIsTyping(true);
    const userInteractionCount = messages.filter(m => m.role === 'user').length + 1;
    
    // Checkpoint strategy: Milestone based, roughly every 5 turns
    const triggerQuiz = (userInteractionCount - lastQuizTurn >= 5);

    const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content, media: m.media }));
    const assistantMsgId = Date.now();
    
    setMessages(prev => [...prev, { 
      role: 'assistant', 
      content: '', 
      timestamp: assistantMsgId
    }]);

    try {
      const stream = await generateAssistantStream(text, history, triggerQuiz, media);
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
            if (parsed.question && Array.isArray(parsed.options)) {
              quizData = parsed;
              setLastQuizTurn(userInteractionCount);
            }
          }
        } catch (e) { console.error("Checkpoint format error", e); }

        setMessages(prev => {
          const newMessages = [...prev];
          const lastMsgIndex = newMessages.findIndex(m => m.timestamp === assistantMsgId);
          if (lastMsgIndex !== -1) newMessages[lastMsgIndex].content = cleanContent;
          
          if (quizData) {
            newMessages.push({ 
              role: 'assistant', 
              content: "Checkpoint", 
              isQuiz: true, 
              quizData, 
              timestamp: Date.now() + 10 
            });
            setIsQuizPending(true);
          }
          return newMessages;
        });
      }
    } catch (error) {
      console.error("Stream Error:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white relative font-sans overflow-hidden">
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={sessionStats} />

      <header className="px-8 py-6 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-slate-50">
        <div className="flex flex-col">
          <h1 className="font-bold text-slate-900 tracking-tight text-xl">Spark</h1>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">{rank}</span>
        </div>
        
        <button onClick={() => setIsStatsOpen(true)} className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 transition-all hover:bg-slate-100 active:scale-95">
           <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
             {sparks} <span className="text-indigo-500 opacity-60">✨</span>
           </span>
           <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 transition-all duration-700 ease-out" style={{ width: `${sessionStats.agency}%` }} />
           </div>
        </button>
      </header>

      <main ref={scrollRef} className={`flex-1 flex flex-col ${messages.length === 0 ? 'overflow-hidden justify-center' : 'overflow-y-auto justify-start'} p-6 md:p-10 space-y-2 scrollbar-hide`}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in duration-1000 -mt-16">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Intent over interaction.</h2>
            <p className="text-slate-400 mt-4 text-lg font-medium max-w-sm">Share your thinking. Let's sustain your cognitive agency through synthesis.</p>
          </div>
        )}

        <div className="max-w-3xl mx-auto w-full space-y-4 pt-4 pb-12">
          {messages.map((msg, idx) => (
            <ChatBubble key={idx} message={msg} onQuizCorrect={handleQuizCorrect} />
          ))}
          
          {isTyping && messages[messages.length-1]?.role !== 'assistant' && (
            <div className="flex justify-start max-w-3xl mx-auto w-full py-6 px-8 opacity-40">
              <div className="flex gap-1">
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {isQuizPending && (
            <div className="flex justify-center py-6 animate-in slide-in-from-bottom-2 duration-500">
              <div className="px-5 py-2 bg-indigo-50/50 border border-indigo-100 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-500 shadow-sm">
                Neural Checkpoint: Resolve to unlock focus
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="px-6 py-8 md:px-12 bg-white">
        <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex flex-col gap-4 max-w-3xl mx-auto">
          {selectedMedia && (
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-bottom-2">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 text-xs overflow-hidden shrink-0">
                {selectedMedia.mimeType.startsWith('image/') ? (
                  <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="w-full h-full object-cover" />
                ) : 'DOC'}
              </div>
              <span className="text-xs font-bold text-slate-700 truncate flex-1">{selectedMedia.name}</span>
              <button type="button" onClick={() => setSelectedMedia(null)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
              </button>
            </div>
          )}

          <div className={`relative glass rounded-[2.5rem] p-2 flex items-center gap-1 border transition-all duration-300 ${isQuizPending ? 'border-indigo-100 bg-slate-50/50' : 'border-slate-100 shadow-xl shadow-slate-100/30'}`}>
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isQuizPending}
              className={`w-12 h-12 flex items-center justify-center transition-all shrink-0 ${isQuizPending ? 'opacity-20' : 'text-slate-400 hover:text-indigo-600 active:scale-90'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
            <input
              type="text"
              value={inputValue}
              autoComplete="off"
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isQuizPending}
              placeholder="Articulate your intent..."
              className="flex-1 bg-transparent border-none px-6 py-4 text-[15px] font-medium focus:ring-0 outline-none placeholder-slate-300 disabled:opacity-50"
            />
            <button 
              type="submit" 
              disabled={(!inputValue.trim() && !selectedMedia) || isTyping || isQuizPending} 
              className={`h-12 w-12 rounded-[2rem] flex items-center justify-center transition-all shadow-lg shrink-0 ${isQuizPending ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-black active:scale-95'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          </div>
        </form>
      </footer>
    </div>
  );
};

export default App;
