
import React, { useState, useMemo } from 'react';
import { Message, Quiz, IntentCheck } from '../types';
import { t } from '../services/i18n';

interface ChatBubbleProps {
  message: Message;
  onQuizCorrect?: () => void;
  onIntentSelect?: (labels: string[]) => void;
}

declare const marked: any;

const SparkEffect: React.FC = () => {
  const particles = useMemo(() => Array.from({ length: 24 }).map((_, i) => ({
    id: i, 
    x: (Math.random() - 0.5) * 350, 
    y: (Math.random() - 0.6) * 250, 
    size: Math.random() * 3 + 1.5, 
    duration: Math.random() * 1.2 + 0.8, 
    color: Math.random() > 0.4 ? '#6366f1' : '#fbbf24'
  })), []);
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50 overflow-visible">
      {particles.map(p => <div key={p.id} className="spark-particle" style={{ backgroundColor: p.color, width: `${p.size}px`, height: `${p.size}px`, '--tw-translate-x': `${p.x}px`, '--tw-translate-y': `${p.y}px`, '--duration': `${p.duration}s` } as any} />)}
    </div>
  );
};

const ReflectionCard: React.FC<{ quiz: Quiz; onCorrect: () => void }> = ({ quiz, onCorrect }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [showSparks, setShowSparks] = useState(false);
  
  const validatedOptions = useMemo(() => {
    const options = quiz?.options || [];
    const hasCorrect = options.some(o => o.isCorrect);
    if (!hasCorrect && options.length > 0) {
      return options.map((o, i) => i === 0 ? { ...o, isCorrect: true } : o);
    }
    return options;
  }, [quiz]);

  const handleSelect = (idx: number) => {
    if (isSolved) return;
    setSelectedIdx(idx);
    if (validatedOptions[idx]?.isCorrect) { 
      setIsSolved(true); 
      setShowSparks(true); 
      setTimeout(() => onCorrect(), 100);
    }
  };

  return (
    <div className={`relative w-full max-w-xl animate-in slide-in-from-top-6 fade-in duration-1000 ${isSolved ? 'animate-neural-pulse' : ''}`}>
      {showSparks && <SparkEffect />}
      <div className="bg-[#FCFDFF] dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[3rem] p-10 md:p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.05)] relative overflow-hidden transition-colors duration-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm border border-slate-100/50 dark:border-slate-600"><span className="text-xl">{isSolved ? '✨' : '🧠'}</span></div>
          <div className="flex flex-col"><h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">{t.reflection}</h4><span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-1">{t.synthesisRequired}</span></div>
        </div>
        <p className="text-[22px] leading-[1.3] font-bold text-slate-900 dark:text-white mb-10 tracking-tight">{quiz.question}</p>
        <div className="space-y-4">
          {validatedOptions.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = opt.isCorrect;
            let btnStyle = "w-full p-7 rounded-[2rem] border-2 transition-all duration-500 text-[17px] font-medium text-left flex items-center justify-between group ";
            if (isSelected) btnStyle += isCorrect ? "bg-emerald-50 border-emerald-400 text-emerald-900 dark:bg-emerald-900/30 dark:border-emerald-500 dark:text-emerald-100" : "bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-900/30 dark:border-rose-500 dark:text-rose-100 animate-shake";
            else btnStyle += "bg-white dark:bg-slate-700/50 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-100 dark:hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5";
            if (isSolved && !isSelected && !isCorrect) btnStyle += " opacity-25 grayscale pointer-events-none";
            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={isSolved} className={btnStyle}>
                <span className="flex-1 pr-6 leading-snug">{opt.text}</span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-500 ${isSelected ? (isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'bg-slate-50 dark:bg-slate-600 text-slate-300 dark:text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900 group-hover:text-indigo-400'}`}>
                  {isSelected ? (isCorrect ? '✓' : '✕') : <div className="w-1.5 h-1.5 rounded-full bg-current opacity-30" />}
                </div>
              </button>
            );
          })}
        </div>
        {isSolved && <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-700 animate-in slide-in-from-top-4 duration-700"><p className="text-[15px] text-slate-500 dark:text-slate-400 leading-relaxed italic font-medium">{quiz.explanation}</p></div>}
      </div>
    </div>
  );
};

const IntentCard: React.FC<{ intent: IntentCheck; onSelect: (labels: string[]) => void }> = ({ intent, onSelect }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const options = intent?.options || [];
  // FORCE allowMultiple to true to ensure synthesis is always possible
  const allowMultiple = true; 

  const toggleChoice = (val: string) => {
    if (confirmed) return;
    if (allowMultiple) {
      setSelectedValues(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
    } else {
      setSelectedValues([val]);
      setConfirmed(true);
      const opt = options.find(o => o.value === val || o.text === val);
      onSelect([opt?.text || val]);
    }
  };

  const handleConfirm = () => {
    if (selectedValues.length === 0) return;
    setConfirmed(true);
    const labels = selectedValues.map(v => {
      const opt = options.find(o => o.value === v || o.text === v);
      return opt?.text || v;
    });
    onSelect(labels);
  };

  return (
    <div className="w-full max-w-xl animate-in slide-in-from-top-6 fade-in duration-1000">
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[3rem] p-10 md:p-12 shadow-[0_48px_96px_-24px_rgba(99,102,241,0.08)] transition-colors duration-500">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shadow-sm border border-indigo-100/50 dark:border-indigo-700/50"><span className="text-xl">🎯</span></div>
          <div className="flex flex-col"><h4 className="text-[10px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-[0.3em]">{t.intentCheck}</h4><span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{allowMultiple ? 'MULTIPLE CHOICE' : t.focusDecision}</span></div>
        </div>
        <p className="text-[24px] leading-tight font-bold text-slate-900 dark:text-white mb-10 tracking-tight">{intent.question}</p>
        <div className="space-y-4">
          {options.map((opt, idx) => {
            const val = opt.value || opt.text || `opt-${idx}`;
            const isSelected = selectedValues.includes(val);
            return (
              <button 
                key={idx} 
                onClick={() => toggleChoice(val)} 
                disabled={confirmed} 
                className={`w-full p-7 rounded-[2rem] border-2 transition-all duration-500 text-[17px] font-medium text-left flex items-center gap-5 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-xl shadow-indigo-500/10 scale-[1.02]' : 'bg-white dark:bg-slate-700/30 border-slate-50 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'} ${confirmed && !isSelected ? 'opacity-30' : ''}`}
              >
                {allowMultiple && (
                  <div className={`w-7 h-7 rounded-xl border-2 shrink-0 flex items-center justify-center transition-all duration-500 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white rotate-0' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 rotate-45 group-hover:rotate-0'}`}>
                    {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                )}
                <span className="flex-1 leading-snug">{opt.text}</span>
              </button>
            );
          })}
        </div>
        {allowMultiple && !confirmed && (
          <button 
            onClick={handleConfirm} 
            disabled={selectedValues.length === 0} 
            className="mt-10 w-full py-7 rounded-[1.75rem] bg-slate-900 dark:bg-indigo-600 text-white font-bold text-[14px] tracking-[0.2em] uppercase hover:bg-black dark:hover:bg-indigo-500 transition-all disabled:opacity-20 shadow-2xl shadow-slate-900/20 active:scale-95"
          >
            {t.confirmFocus}
          </button>
        )}
      </div>
    </div>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = React.memo(({ message, onQuizCorrect, onIntentSelect }) => {
  const isAssistant = message.role === 'assistant';

  const hasTable = useMemo(() => {
    return message.content && message.content.includes('|') && message.content.includes('---');
  }, [message.content]);

  const renderedContent = useMemo(() => {
    if (!message.content) return '';
    try {
      let html = marked.parse(message.content);
      html = html.replace(/<table>/g, '<div class="table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');
      return html;
    } catch (e) {
      return message.content;
    }
  }, [message.content]);

  return (
    <div className={`flex flex-col w-full mb-16 ${isAssistant ? 'items-start' : 'items-end'}`}>
      {(message.content || message.media) && (
        <div className={`${hasTable ? 'max-w-[96%] w-full' : 'max-w-[85%] md:max-w-[78%]'} rounded-[2rem] px-8 py-7 transition-all duration-700 animate-in slide-in-from-bottom-4 ${isAssistant ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.03)] rounded-tl-none' : 'bg-[#F9FBFF] dark:bg-indigo-950/20 text-slate-900 dark:text-slate-100 border border-slate-200/30 dark:border-indigo-900/30 shadow-sm rounded-tr-none'}`}>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] opacity-30 mb-5 flex justify-between items-center"><span className="text-indigo-600 dark:text-indigo-400">{isAssistant ? t.spark : t.you}</span><span className="font-semibold">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          
          {message.media && (
            <div className="mb-6">
              {message.media.mimeType.includes('image') ? (
                <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-inner">
                  <img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Context" className="max-h-[400px] w-full object-cover" />
                </div>
              ) : (
                <div className="flex items-center gap-4 p-4 bg-rose-50/50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl animate-in fade-in duration-500">
                  <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-rose-100 dark:border-rose-900 flex items-center justify-center text-xl shrink-0">📄</div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{message.media.name || 'Document'}</span>
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{t.documentArtifact}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {message.content && <div className="markdown-content transition-opacity duration-1000" dangerouslySetInnerHTML={{ __html: renderedContent }} />}
        </div>
      )}
      {isAssistant && (message.intentData || message.quizData) && (
        <div className="flex flex-col gap-10 mt-8 w-full animate-in fade-in slide-in-from-top-8 duration-1000">
          {message.quizData ? (
            <ReflectionCard quiz={message.quizData} onCorrect={onQuizCorrect || (() => {})} />
          ) : message.intentData ? (
            <IntentCard intent={message.intentData} onSelect={onIntentSelect || (() => {})} />
          ) : null}
        </div>
      )}
    </div>
  );
});

export default ChatBubble;
