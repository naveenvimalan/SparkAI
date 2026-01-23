
import { Message, AppState, SessionStats, Quiz, MediaData, IntentCheck, QuizPerformance, UsageIntent } from './types';
import { generateAssistantStream } from './services/geminiService';
import { t } from './services/i18n';
import ChatBubble from './components/ChatBubble';
import StatsModal from './components/StatsModal';
import {
  isDelegatingWork,
  isCriticalInquiry,
  isPhaticCommunication,
  isGibberish,
  assessArticulationQuality,
} from './utils/agencyCalculations';
import React, { useState, useEffect, useRef, useMemo } from 'react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isQuizPending, setIsQuizPending] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [sparks, setSparks] = useState(0);
  const [quizHistory, setQuizHistory] = useState<QuizPerformance[]>([]);
  const [currentQuizAttempts, setCurrentQuizAttempts] = useState(0);
  const [articulationDetails, setArticulationDetails] = useState<string[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<MediaData | null>(null);
  const [awaitingArticulation, setAwaitingArticulation] = useState(false);
  const [articulationContext, setArticulationContext] = useState('');

  // Settings
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Refs
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamBufferRef = useRef('');
  const revealedTextRef = useRef('');
  const animationFrameRef = useRef<number | null>(null);

  // Initialize Theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('spark-theme');
    if (savedTheme === 'dark') {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const newVal = !prev;
      if (newVal) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('spark-theme', newVal ? 'dark' : 'light');
      return newVal;
    });
  };

  // Session Stats
  const sessionStats = useMemo((): SessionStats => {
    const totalQueries = messages.filter((m) => m.role === 'user' && !m.isArticulation).length;
    const articulationCount = messages.filter((m) => m.role === 'user' && m.isArticulation).length;

    const articulationQuality = { high: 0, medium: 0, low: 0 };
    messages
      .filter((m) => m.role === 'user' && m.isArticulation)
      .forEach((m) => {
        // Use granular LLM scores if available
        if (m.articulationScores && m.articulationScores.length > 0) {
          m.articulationScores.forEach((score) => {
            if (score >= 7) articulationQuality.high++;
            else if (score >= 5) articulationQuality.medium++;
            else articulationQuality.low++;
          });
        } 
        // Fallback to average score if individual scores missing
        else if (m.articulationScore !== undefined) {
            if (m.articulationScore >= 7) articulationQuality.high++;
            else if (m.articulationScore >= 5) articulationQuality.medium++;
            else articulationQuality.low++;
        } else {
            // Heuristic fallback
            const quality = assessArticulationQuality(m.content);
            articulationQuality[quality]++;
        }
      });

    const comprehensionRate =
      quizHistory.length > 0 ? quizHistory.filter((q) => q.attempts === 1).length / quizHistory.length : 0;

    const delegationCount = messages.filter((m) => m.role === 'user' && isDelegatingWork(m.content)).length;

    return {
      totalQueries,
      articulationCount,
      articulationQuality,
      comprehensionRate,
      delegationCount,
      sparks,
      quizHistory,
      articulationDetails,
    };
  }, [messages, sparks, quizHistory, articulationDetails]);

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
  const filterTextForDisplay = (fullText: string): string => {
    let output = fullText;
    const tags = [
      { start: '---INTENTSTART---', end: '---INTENTEND---' },
      { start: '---REFLECTIONSTART---', end: '---REFLECTIONEND---' },
    ];

    let earliestStart = -1;
    let matchingTag: any = null;

    tags.forEach((t) => {
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

    return output.trim();
  };

  const handleSendMessage = async (
    text: string, 
    isArticulation: boolean = false, 
    articulationScore?: number,
    articulationScores?: number[],
    usageIntent?: UsageIntent
  ) => {
    if (isTyping) return;
    if (!isArticulation && isQuizPending) return;
    if (!text.trim() && !selectedMedia) return;

    if (appState === AppState.INITIAL) {
      setAppState(AppState.CHATTING);
    }

    const currentMedia = selectedMedia;
    setSelectedMedia(null);

    // Handle articulation flow
    if (awaitingArticulation) {
      // This is an articulation response
      setArticulationDetails((prev) => [...prev, text]);

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        media: currentMedia,
        isArticulation: true,
        articulationScore, // Store the average validation score
        articulationScores, // Store granular scores
        usageIntent
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      setAwaitingArticulation(false);
      
      // Inject the intent into the text sent to LLM so it can react
      const contextWithIntent = usageIntent 
        ? `${articulationContext}\n\nUser Articulation: ${text}\nUser Explicit Intent: ${usageIntent.toUpperCase()} (If DECIDING or APPLYING, trigger P2. If LEARNING, do not trigger P2).`
        : `${articulationContext}\n\nArticulation: ${text}`;

      await getResponse(contextWithIntent, userMsg, currentMedia, true, [
        ...messages,
        userMsg,
      ]);
      setArticulationContext('');
    } else {
      // Normal message flow
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
        timestamp: Date.now(),
        media: currentMedia,
        isArticulation: false,
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputValue('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      await getResponse(text, userMsg, currentMedia, false, [...messages, userMsg]);
    }
  };

  const startRevealAnimation = (assistantMsgId: string) => {
    const revealChar = () => {
      if (streamBufferRef.current.length > 0) {
        const chunkSize = streamBufferRef.current.length > 30 ? 6 : 1;
        const charsToReveal = streamBufferRef.current.slice(0, chunkSize);
        streamBufferRef.current = streamBufferRef.current.slice(chunkSize);
        revealedTextRef.current += charsToReveal;

        setMessages((prev) =>
          prev.map((m) => (m.id === assistantMsgId ? { ...m, content: revealedTextRef.current } : m))
        );

        animationFrameRef.current = window.setTimeout(revealChar, 10);
      }
    };
    revealChar();
  };

  const getResponse = async (
  text: string,
  userMsg: Message,
  media: MediaData | undefined,
  isArticulationResponse: boolean,
  historyWithNewMsg: Message[]
) => {
  setIsTyping(true);

  const assistantMsgId = `assistant-${Date.now()}`;
  streamBufferRef.current = '';
  revealedTextRef.current = '';

  if (animationFrameRef.current) {
    clearTimeout(animationFrameRef.current);
  }

  setMessages((prev) => [
    ...prev,
    {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    },
  ]);

  const historySnapshot = historyWithNewMsg
    .map((m) => ({ role: m.role, content: m.content }))
    .slice(-12);

  try {
    startRevealAnimation(assistantMsgId);

    const stream = await generateAssistantStream(
      text,
      historySnapshot.slice(0, -1),
      media,
      isArticulationResponse
    );

    let fullRawContent = '';

    for await (const chunk of stream) {
      if (!chunk.text) continue;
      fullRawContent += chunk.text;

      const currentFiltered = filterTextForDisplay(fullRawContent);
      const totalHandledLength = revealedTextRef.current.length + streamBufferRef.current.length;
      const newVisibleContent = currentFiltered.substring(totalHandledLength);

      if (newVisibleContent) {
        streamBufferRef.current += newVisibleContent;
      }
    }

    const parseField = (start: string, end: string) => {
      if (!fullRawContent.includes(start)) return undefined;
      let part = fullRawContent.split(start)[1]?.split(end)[0]?.trim();
      if (!part) return undefined;
      try {
        part = part.replace(/```json?/g, '').replace(/```/g, '').trim();
        return JSON.parse(part);
      } catch (e) {
        return undefined;
      }
    };

    const quizData = parseField('---REFLECTIONSTART---', '---REFLECTIONEND---');
    const intentData = parseField('---INTENTSTART---', '---INTENTEND---');

    // FIX: Add timeout to prevent infinite loading
    let waitCount = 0;
    const maxWait = 100; // 3 seconds max wait
    while (streamBufferRef.current.length > 0 && waitCount < maxWait) {
      await new Promise((r) => setTimeout(r, 30));
      waitCount++;
    }

    // Force complete animation if still pending
    if (animationFrameRef.current) {
      clearTimeout(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Ensure all content is revealed
    const finalContent = filterTextForDisplay(fullRawContent);

    if (intentData) {
      setAwaitingArticulation(true);
      setArticulationContext(text);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                intentData,
                content: finalContent,
                awaitingArticulation: true,
              }
            : m
        )
      );
    } else if (quizData) {
      setIsQuizPending(true);
      setCurrentQuizAttempts(0);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                quizData,
                content: finalContent,
              }
            : m
        )
      );
    } else {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: finalContent,
              }
            : m
        )
      );
    }
  } catch (error: any) {
    console.error('Response error:', error);
    if (animationFrameRef.current) {
      clearTimeout(animationFrameRef.current);
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === assistantMsgId
          ? {
              ...m,
              content: 'Neural synthesis stalled. Reconnecting...',
            }
          : m
      )
    );
  } finally {
    setIsTyping(false);
    if (animationFrameRef.current) {
      clearTimeout(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }
};

  const handleQuizCorrect = (question: string) => {
    setSparks((s) => s + 1);

    const totalAttempts = currentQuizAttempts + 1;
    let score = 6;
    if (totalAttempts === 1) score = 12;
    else if (totalAttempts === 2) score = 9;

    const performance: QuizPerformance = {
      quizId: `quiz-${Date.now()}`,
      question,
      attempts: totalAttempts,
      timestamp: Date.now(),
      score,
    };

    setQuizHistory((prev) => [...prev, performance]);
    setCurrentQuizAttempts(0);
    setIsQuizPending(false);
  };

  const handleQuizAttempt = () => {
    setCurrentQuizAttempts((prev) => prev + 1);
  };

  const handleArticulationSubmit = (responses: string[], score: number, scores: number[], intent: UsageIntent) => {
    const combined = responses.join(' | ');
    handleSendMessage(combined, true, score, scores, intent);
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto bg-white dark:bg-slate-950 relative font-sans overflow-hidden transition-colors duration-500">
      <StatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} stats={sessionStats} />

      {/* Header */}
      <header className="px-10 py-6 flex justify-between items-center bg-white dark:bg-slate-950 sticky top-0 z-40 border-b border-slate-50 dark:border-slate-800 transition-colors duration-500">
        <h1 className="font-bold text-slate-900 dark:text-white tracking-tighter text-xl leading-none">Spark</h1>

        <div className="flex items-center gap-4">
          {/* My Insights Button */}
          <button
            onClick={() => setIsStatsOpen(true)}
            className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95"
          >
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">My Insights</span>
            <span className="text-indigo-400 text-xs">✨</span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors active:scale-95"
          >
            {isDarkMode ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Chat Area */}
      <main
        ref={scrollRef}
        className={`flex-1 flex flex-col ${
          appState === AppState.INITIAL ? 'overflow-hidden justify-center pb-[15vh]' : 'overflow-y-auto justify-start'
        } p-6 md:px-12 space-y-2 scrollbar-hide`}
      >
        {appState === AppState.INITIAL && (
          <div className="flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-1000 px-4">
            <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-[1.15] mb-4">
              {t.welcome}
            </h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs md:text-base font-medium max-w-[340px] leading-relaxed">
              {t.subWelcome}
            </p>
          </div>
        )}

        {appState === AppState.CHATTING && (
          <div className="max-w-4xl mx-auto w-full space-y-6 pt-6 pb-48">
            {messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                onQuizCorrect={() => handleQuizCorrect(msg.quizData?.question || '')}
                onQuizAttempt={handleQuizAttempt}
                onArticulationSubmit={handleArticulationSubmit}
              />
            ))}

            {isTyping && (
              <div className="flex justify-start mb-12 animate-in slide-in-from-bottom-2">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Input Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 px-6 py-8 md:px-12 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="relative flex flex-col gap-3"
          >
            {selectedMedia && (
              <div className="flex animate-in slide-in-from-bottom-6 duration-700">
                <div className="relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3 flex items-center gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-sm mb-1">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selectedMedia.mimeType.includes('pdf')
                        ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-900'
                        : 'overflow-hidden border border-slate-100 dark:border-slate-700'
                    }`}
                  >
                    {selectedMedia.mimeType.includes('pdf') ? (
                      <span className="text-lg">📄</span>
                    ) : (
                      <img
                        src={`data:${selectedMedia.mimeType};base64,${selectedMedia.data}`}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  <div className="flex flex-col min-w-0 pr-6">
                    <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200 truncate">
                      {selectedMedia.name || 'Artifact'}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">
                      {selectedMedia.mimeType.includes('pdf') ? t.documentArtifact : t.imageArtifact}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedMedia(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div
              className={`relative glass bg-white/70 dark:bg-slate-900/60 rounded-[2.5rem] pl-1.5 pr-5 py-1.5 flex items-center gap-1 border transition-all duration-500 shadow-2xl ${
                isQuizPending || (awaitingArticulation && !isTyping)
                  ? 'bg-slate-50/50 dark:bg-slate-800/50 grayscale opacity-70 cursor-not-allowed border-slate-200 dark:border-slate-700'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {/* Attach Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-11 h-11 flex items-center justify-center rounded-full text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 transition-colors shrink-0"
              >
                📎
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      setSelectedMedia({
                        data: (event.target?.result as string).split(',')[1],
                        mimeType: file.type,
                        name: file.name,
                      });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }
                }}
                className="hidden"
                accept="image/*,application/pdf"
              />

              <textarea
                ref={textareaRef}
                rows={1}
                value={inputValue}
                autoComplete="off"
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(inputValue);
                  }
                }}
                disabled={isQuizPending || (awaitingArticulation && !isTyping)}
                placeholder={
                  isQuizPending
                    ? t.placeholderLocked
                    : awaitingArticulation
                    ? 'Please provide articulation first...'
                    : t.placeholder
                }
                className="flex-1 bg-transparent border-none px-4 py-3 text-[16px] font-medium text-slate-900 dark:text-slate-100 outline-none placeholder-slate-300 dark:placeholder-slate-600 resize-none max-h-[200px] scrollbar-hide leading-relaxed overflow-y-auto"
                style={{ height: 'auto' }}
              />

              <button
                type="submit"
                disabled={!inputValue.trim() && !selectedMedia || isTyping || isQuizPending || awaitingArticulation}
                className={`h-11 w-11 rounded-full flex items-center justify-center transition-all shrink-0 ${
                  isQuizPending || awaitingArticulation
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600'
                    : 'bg-slate-900 dark:bg-indigo-600 text-white shadow-lg'
                }`}
              >
                →
              </button>
            </div>
          </form>
        </div>
      </footer>
    </div>
  );
};

export default App;