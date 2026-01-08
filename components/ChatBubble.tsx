
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
  const particles = useMemo(() => Array.from({ length: 18 }).map((_, i) => ({
    id: i, x: (Math.random() - 0.5) * 300, y: (Math.random() - 0.7) * 200, size: Math.random() * 4 + 2, duration: Math.random() * 0.8 + 0.6, color: Math.random() > 0.3 ? '#6366f1' : '#fbbf24'
  })), []);
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
      {particles.map(p => <div key={p.id} className="spark-particle" style={{ backgroundColor: p.color, width: `${p.size}px`, height: `${p.size}px`, '--tw-translate-x': `${p.x}px`, '--tw-translate-y': `${p.y}px`, '--duration': `${p.duration}s` } as any} />)}
    </div>
  );
};

const ReflectionCard: React.FC<{ quiz: Quiz; onCorrect: () => void }> = ({ quiz, onCorrect }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);
  const [showSparks, setShowSparks] = useState(false);
  const options = quiz?.options || [];
  const shuffledOptions = useMemo(() => [...options].sort(() => Math.random() - 0.5), [options]);
  const handleSelect = (idx: number) => {
    if (isSolved) return;
    setSelectedIdx(idx);
    if (shuffledOptions[idx]?.isCorrect) { setIsSolved(true); setShowSparks(true); onCorrect(); }
  };
  return (
    <div className={`relative w-full max-w-xl animate-in slide-in-from-top-4 fade-in duration-700 ${isSolved ? 'animate-neural-pulse' : ''}`}>
      {showSparks && <SparkEffect />}
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100"><span className="text-lg">{isSolved ? '✨' : '💭'}</span></div>
          <div className="flex flex-col"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{t.reflection}</h4><span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">{t.synthesisRequired}</span></div>
        </div>
        <p className="text-[20px] leading-snug font-bold text-slate-800 mb-8 tracking-tight">{quiz.question}</p>
        <div className="space-y-3">
          {shuffledOptions.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = opt.isCorrect;
            const text = opt.text || (typeof opt === 'string' ? opt : 'Option');
            let btnStyle = "w-full p-6 rounded-[1.75rem] border-2 transition-all duration-300 text-[16px] font-medium text-left flex items-center justify-between ";
            if (isSelected) btnStyle += isCorrect ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm" : "bg-rose-50 border-rose-300 text-rose-900 animate-shake";
            else btnStyle += "bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50/50";
            if (isSolved && !isSelected && !isCorrect) btnStyle += " opacity-30 grayscale pointer-events-none";
            return <button key={idx} onClick={() => handleSelect(idx)} disabled={isSolved} className={btnStyle}><span className="flex-1 pr-4">{text}</span>{isSelected && <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} text-xs`}>{isCorrect ? '✓' : '✕'}</div>}</button>;
          })}
        </div>
        {isSolved && <div className="mt-8 pt-6 border-t border-slate-200 animate-in slide-in-from-top-2 duration-500 text-center"><p className="text-[14px] text-slate-500 leading-relaxed italic">{quiz.explanation}</p></div>}
      </div>
    </div>
  );
};

const IntentCard: React.FC<{ intent: IntentCheck; onSelect: (labels: string[]) => void }> = ({ intent, onSelect }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const options = intent?.options || [];
  const allowMultiple = intent.allowMultiple !== false;

  const toggleChoice = (val: string) => {
    if (confirmed) return;
    if (allowMultiple) {
      setSelectedValues(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
    } else {
      setSelectedValues([val]);
      setConfirmed(true);
      const opt = options.find(o => o.value === val);
      const label = opt?.text || (typeof opt === 'string' ? opt : val);
      onSelect([label]);
    }
  };

  const handleConfirm = () => {
    if (selectedValues.length === 0) return;
    setConfirmed(true);
    const labels = selectedValues.map(v => {
      const opt = options.find(o => o.value === v);
      return opt?.text || (typeof opt === 'string' ? opt : v);
    });
    onSelect(labels);
  };

  return (
    <div className="w-full max-w-xl animate-in slide-in-from-top-4 fade-in duration-700">
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-indigo-500/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100"><span className="text-lg">🎯</span></div>
          <div className="flex flex-col"><h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">{t.intentCheck}</h4><span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{allowMultiple ? 'MULTI-SELECTION' : t.focusDecision}</span></div>
        </div>
        <p className="text-[22px] leading-snug font-bold text-slate-900 mb-8 tracking-tight">{intent.question}</p>
        <div className="grid grid-cols-1 gap-4">
          {options.map((opt, idx) => {
            const value = opt.value || (typeof opt === 'string' ? opt : `opt-${idx}`);
            const text = opt.text || (typeof opt === 'string' ? opt : value);
            const isSelected = selectedValues.includes(value);
            return (
              <button 
                key={idx} 
                onClick={() => toggleChoice(value)} 
                disabled={confirmed} 
                className={`w-full p-6 rounded-[1.75rem] border-2 transition-all duration-300 text-[16px] font-medium text-left flex items-center gap-4 ${isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md translate-x-1' : 'bg-white border-slate-50 text-slate-600 hover:border-slate-200'} ${confirmed && !isSelected ? 'opacity-40' : ''}`}
              >
                {allowMultiple && (
                  <div className={`w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
                    {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                )}
                <span className="flex-1">{text}</span>
              </button>
            );
          })}
        </div>
        {allowMultiple && !confirmed && (
          <button 
            onClick={handleConfirm} 
            disabled={selectedValues.length === 0} 
            className="mt-8 w-full py-6 rounded-2xl bg-slate-900 text-white font-bold text-[13px] tracking-widest uppercase hover:bg-black transition-all disabled:opacity-30 shadow-xl shadow-slate-900/10 active:scale-[0.98]"
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

  const renderedContent = useMemo(() => {
    if (!message.content) return '';
    try {
      return marked.parse(message.content);
    } catch (e) {
      return message.content;
    }
  }, [message.content]);

  const hasVisualContent = message.content || message.media;
  const isPDF = message.media?.mimeType === 'application/pdf';
  
  return (
    <div className={`flex flex-col w-full mb-12 ${isAssistant ? 'items-start' : 'items-end'}`}>
      {hasVisualContent && (
        <div className={`max-w-[84%] md:max-w-[80%] rounded-[1.75rem] px-7 py-6 transition-all duration-500 animate-in slide-in-from-bottom-2 ${isAssistant ? 'bg-white text-slate-800 border border-slate-100 shadow-slate-200/10 shadow-2xl rounded-tl-none' : 'bg-[#F9FBFF] text-slate-900 border border-slate-200/30 shadow-slate-100/20 shadow-xl rounded-tr-none'}`}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 flex justify-between items-center"><span className={isAssistant ? 'text-indigo-600' : 'text-slate-600'}>{isAssistant ? t.spark : t.you}</span><span className="font-semibold">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div>
          {message.media && !isPDF && <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm"><img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Context" className="max-h-[350px] w-full object-cover" /></div>}
          {message.media && isPDF && <div className="mb-6 p-5 bg-white border border-slate-100 rounded-2xl flex items-center gap-4 shadow-sm"><div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0"><span className="text-xl">📄</span></div><div className="flex flex-col min-w-0"><span className="text-[13px] font-bold text-slate-800 truncate">{message.media.name || 'Artifact'}</span><span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-0.5">{t.documentArtifact}</span></div></div>}
          {message.content && <div className="markdown-content transition-opacity duration-700" dangerouslySetInnerHTML={{ __html: renderedContent }} />}
        </div>
      )}
      {isAssistant && (message.stats || message.intentData || message.quizData) && (
        <div className="flex flex-col gap-8 mt-6 w-full animate-in fade-in slide-in-from-top-4 duration-1000">
          {message.stats && (
            <div className="w-full max-w-xl bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-4"><span className="text-sm">📊</span><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">{t.sessionCheck}</h4></div>
               <p className="text-[14px] text-slate-600 leading-relaxed font-medium">{message.stats.split('|')[1]?.trim() || message.stats}</p>
               <div className="mt-4 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{message.stats.split('|')[0].trim()}</div>
            </div>
          )}
          {message.intentData && <IntentCheckCard intent={message.intentData} onSelect={onIntentSelect || (() => {})} />}
          {message.quizData && <ReflectionCard quiz={message.quizData} onCorrect={onQuizCorrect || (() => {})} />}
        </div>
      )}
    </div>
  );
});

// Internal helper to avoid name collision with IntentCheck interface
const IntentCheckCard = IntentCard;

export default ChatBubble;
