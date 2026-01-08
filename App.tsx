
import { Message, AppState, SessionStats, Quiz, MediaData, IntentCheck } from './types';
import { generateAssistantStream } from './services/geminiService';
import { t } from './services/i18n';
import ChatBubble from './components/ChatBubble';
import StatsModal from './components/StatsModal';
import React, { useState, useEffect, useRef, useMemo } from 'react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isQuizPending, setIsQuizPending] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [sparks, setSparks] = useState(0);
  const [intentLog, setIntentLog] = useState<string[]>([]);
  const [verifiedInsights, setVerifiedInsights] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  const streamBufferRef = useRef<string>("");
  const revealedTextRef = useRef<string>("");
  const animationFrameRef = useRef<number | null>(null);

  const sessionStats = useMemo((): SessionStats => {
    const activeActions = (intentLog.length * 4.5) + (sparks * 7.0);
    const articulationBonus = messages.reduce((acc, m) => {
      if (m.role !== 'user' || m.isIntentDecision) return acc;
      const len = m.content.length;
      if (len < 30) return acc + 0.5;
      if (len < 100) return acc + 2.0;
      return acc + 5.0;
    }, 0);
    const totalContribution = activeActions + articulationBonus;
    const noiseFactor = messages.reduce((acc, m, idx) => {
      if (m.role !== 'assistant') return acc;
      const prevUserMsg = messages[idx - 1];
      const userEffort = prevUserMsg?.content.length || 0;
      const isDelegation = prevUserMsg && prevUserMsg.role === 'user' && userEffort < 25 && !prevUserMsg.isIntentDecision;
      const len = m.content.length;
      let weight = 0;
      if (len < 150) weight = 0.2;
      else if (len < 400) weight = 1.2;
      else weight = 3.5;
      if (userEffort > 150) weight *= 0.5; 
      if (isDelegation && weight > 0) weight *= 2.5;
      return acc + weight;
    }, 0);
    const baseAgency = 15 + totalContribution - noiseFactor;
    const agency = messages.length === 0 ? 0 : Math.max(0, Math.min(100, baseAgency));
    return { 
      questions: messages.filter(m => m.role === 'user' && !m.isIntentDecision).length, 
      responses: messages.filter(m => m.role === 'assistant').length, 
      intentDecisions: intentLog.length, 
      agency, 
      sparks,
      intentLog,
      verifiedInsights
    };
  }, [messages, sparks, intentLog, verifiedInsights]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    if (scrollRef.current && appState === AppState.CHATTING) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isQuizPending, appState]);

  const filterTextForDisplay = (fullText: string) => {
    let output = fullText;
    const tags = [
      { start: '---INTENT_START---', end: '---INTENT_END---' },
      { start: '---REFLECTION_START---', end: '---REFLECTION_END---' },
      { start: '---STATS_START---', end: '---STATS_END---' }
    ];
    
    let earliestStart = -1;
    let matchingTag: any = null;
    
    tags.forEach(t => {
      const idx = output.indexOf(t.start);
      if (idx !== -1 && (earliestStart === -1 || idx < earliestStart)) {
        earliestStart = idx;
        matchingTag = t;
      }
    });

    if (earliestStart !== -1) {
      const endIndex = output.indexOf(matchingTag.end);
      if (endIndex !== -1) {
        const nextPart = output.substring(0, earliestStart) + output.substring(endIndex + matchingTag.end.length);
        return filterTextForDisplay(nextPart);
      } else {
        return output.substring(0, earliestStart).trim();
      }
    }

    const dashMatch = output.match(/---[A-Z_]*$/);
    if (dashMatch) output = output.substring(0, dashMatch.index);
    
    return output.trim();
  };

  const handleSendMessage = async (text: string, isIntent = false) => {
    if (isTyping) return;
    if (!isIntent && isQuizPending) return;
    
    if (!text.trim() && !selectedMedia) return;
    if (appState === AppState.INITIAL) setAppState(AppState.CHATTING);
    if (isIntent) setIntentLog(prev => [...prev, text]);

    const currentMedia = selectedMedia;
    setSelectedMedia(null);
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text || "", 
      timestamp: Date.now(),
      media: currentMedia || undefined,
      isIntentDecision: isIntent
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    await getResponse(text, userMsg, currentMedia || undefined, [...messages, userMsg]);
  };

  const startRevealAnimation = (assistantMsgId: string) => {
    const revealChar = () => {
      if (streamBufferRef.current.length > 0) {
        const chunkSize = streamBufferRef.current.length > 30 ? 6 : 1;
        const charsToReveal = streamBufferRef.current.slice(0, chunkSize);
        streamBufferRef.current = streamBufferRef.current.slice(chunkSize);
        revealedTextRef.current += charsToReveal;

        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: revealedTextRef.current } : m
        ));
      }
      animationFrameRef.current = window.setTimeout(revealChar, 10); 
    };
    revealChar();
  };

  const getResponse = async (text: string, userMsg: Message, media: MediaData | undefined, historyWithNewMsg: Message[]) => {
    setIsTyping(true);
    const assistantMsgId = `assistant-${Date.now()}`;
    
    streamBufferRef.current = "";
    revealedTextRef.current = "";
    if (animationFrameRef.current) clearTimeout(animationFrameRef.current);

    setMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', timestamp: Date.now() }]);
    const historySnapshot = historyWithNewMsg.map(m => ({ role: m.role, content: m.content })).slice(-12);

    try {
      startRevealAnimation(assistantMsgId);
      const stream = await generateAssistantStream(text, historySnapshot.slice(0, -1), undefined, media);
      let fullRawContent = "";
      
      for await (const chunk of stream) {
        if (!chunk.text) continue;
        fullRawContent += chunk.text;
        const currentFiltered = filterTextForDisplay(fullRawContent);
        const totalHandledLength = revealedTextRef.current.length + streamBufferRef.current.length;
        const newVisibleContent = currentFiltered.substring(totalHandledLength);
        if (newVisibleContent) streamBufferRef.current += newVisibleContent;
      }

      const parseField = (start: string, end: string) => {
        if (!fullRawContent.includes(start)) return undefined;
        let part = fullRawContent.split(start)[1]?.split(end)[0]?.trim();
        if (!part) return undefined;
        try {
          part = part.replace(/```json\s?/g, '').replace(/```\s?/g, '').trim();
          return JSON.parse(part);
        } catch (e) { 
          return undefined; 
        }
      };

      const quizData = parseField("---REFLECTION_START---", "---REFLECTION_END---");
      const intentData = parseField("---INTENT_START---", "---INTENT_END---");
      const stats = fullRawContent.includes("---STATS_START---") ? fullRawContent.split("---STATS_START---")[1]?.split("---STATS_END---")[0]?.trim() : undefined;
      
      while (streamBufferRef.current.length > 0) {
        await new Promise(r => setTimeout(r, 30));
      }

      // If a quiz is delivered, lock the UI until it is solved.
      if (quizData) setIsQuizPending(true);

      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { 
        ...m, 
        stats, 
        quizData, 
        intentData,
        content: filterTextForDisplay(fullRawContent)
      } : m));

    } catch (error: any) {
      if (animationFrameRef.current) clearTimeout(animationFrameRef.current);
      setMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: "Neural synthesis stalled. Reconnecting..." } : m));
    } finally { 
      setIsTyping(false); 
      if (animationFrameRef.current) clearTimeout(animationFrameRef.current);
    }
  };

  const handleQuizCorrect = (question: string) => {
    setSparks(s => s + 1);
    setVerifiedInsights(prev => [...prev, question]);
    setIsQuizPending(false);
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-white relative font-sans overflow-hidden">
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={sessionStats} messages={messages} />
      <header className="px-10 py-6 flex justify-between items-center bg-white sticky top-0 z-40 border-b border-slate-50">
        <h1 className="font-bold text-slate-900 tracking-tighter text-xl leading-none">Spark</h1>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsStatsOpen(true)} className="flex items-center gap-4 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 transition-all hover:bg-slate-100 active:scale-95 group">
             <div className="flex items-center gap-1.5">
               <span className="text-xs font-bold text-slate-700 leading-none">{sparks}</span>
               <span className="text-indigo-400 text-xs leading-none transform group-hover:scale-110 transition-transform -translate-y-[0.5px]">✨</span>
             </div>
             <div className="w-12 h-1 bg-slate-200 rounded-full overflow-hidden shrink-0">
                <div className="h-full bg-indigo-500 transition-all duration-1000 ease-in-out" style={{ width: `${sessionStats.agency}%` }} />
             </div>
          </button>
        </div>
      </header>
      <main ref={scrollRef} className={`flex-1 flex flex-col ${appState === AppState.INITIAL ? 'overflow-hidden justify-center pb-[15vh]' : 'overflow-y-auto justify-start'} p-6 md:px-12 space-y-2 scrollbar-hide`}>
        {appState === AppState.INITIAL && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-1000 px-4">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight mb-3">{t.welcome}</h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium max-w-[320px] leading-relaxed">{t.subWelcome}</p>
          </div>
        )}
        {appState === AppState.CHATTING && (
          <div className="max-w-4xl mx-auto w-full space-y-6 pt-6 pb-48">
            {messages.map((msg) => (
              <ChatBubble 
                key={msg.id} 
                message={msg} 
                onQuizCorrect={() => handleQuizCorrect(msg.quizData?.question || "")}
                onIntentSelect={(labels) => handleSendMessage(labels.join(', '), true)}
              />
            ))}
            {isTyping && <div className="flex justify-start mb-12 animate-in slide-in-from-bottom-2"><div className="dot"></div><div className="dot"></div><div className="dot"></div></div>}
          </div>
        )}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 py-8 md:px-12 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(inputValue); }} className="relative flex flex-col gap-3">
            {selectedMedia && (
              <div className="flex animate-in slide-in-from-bottom-4 duration-500">
                <div className="relative group bg-white border border-slate-200 rounded-2xl p-3 flex items-center gap-4 shadow-xl shadow-slate-200/20 max-w-sm">
                   <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedMedia.mimeType === 'application/pdf' ? 'bg-rose-50 border-rose-100' : 'overflow-hidden border border-slate-100'}`}>
                     {selectedMedia.mimeType === 'application/pdf' ? <span className="text-lg">📄</span> : <img src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`} className="w-full h-full object-cover" />}
                   </div>
                   <div className="flex flex-col min-w-0 pr-6">
                      <span className="text-[12px] font-bold text-slate-800 truncate">{selectedMedia.name || 'Artifact'}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{selectedMedia.mimeType === 'application/pdf' ? t.documentArtifact : t.imageArtifact}</span>
                   </div>
                   <button type="button" onClick={() => setSelectedMedia(null)} className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
                </div>
              </div>
            )}
            <div className={`relative glass bg-white/70 rounded-[2.5rem] pl-1.5 pr-5 py-1.5 flex items-center gap-1 border transition-all duration-500 shadow-2xl ${(isQuizPending && !isTyping) ? 'bg-slate-50/50 grayscale opacity-70 cursor-not-allowed' : 'border-slate-200 hover:border-slate-300'}`}>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors shrink-0"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg></button>
              <input type="file" ref={fileInputRef} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => setSelectedMedia({ data: (event.target?.result as string).split(',')[1], mimeType: file.type, name: file.name }); reader.readAsDataURL(file); } e.target.value = ''; }} className="hidden" accept="image/*,application/pdf" />
              <textarea ref={textareaRef} rows={1} value={inputValue} autoComplete="off" onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(inputValue); } }} disabled={isQuizPending} placeholder={isQuizPending ? t.placeholderLocked : t.placeholder} className="flex-1 bg-transparent border-none px-4 py-3 text-[16px] font-medium text-slate-900 outline-none placeholder-slate-300 resize-none max-h-[200px] scrollbar-hide leading-relaxed overflow-y-auto" style={{ height: 'auto' }} />
              <button type="submit" disabled={(!inputValue.trim() && !selectedMedia) || isTyping || isQuizPending} className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shrink-0 ${isQuizPending ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white shadow-lg'}`}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default App;
