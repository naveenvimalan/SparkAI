
import React, { useState } from 'react';
import { Message, Quiz, IntentCheck } from '../types';

interface ChatBubbleProps {
  message: Message;
  onQuizCorrect?: () => void;
  onIntentSelect?: (labels: string[]) => void;
}

declare const marked: any;

const ReflectionCard: React.FC<{ quiz: Quiz; onCorrect: () => void }> = ({ quiz, onCorrect }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isSolved, setIsSolved] = useState(false);

  const handleSelect = (idx: number) => {
    if (isSolved) return;
    setSelectedIdx(idx);
    if (quiz.options[idx]?.isCorrect) {
      setIsSolved(true);
      onCorrect();
    }
  };

  return (
    <div className="w-full max-w-xl animate-in slide-in-from-top-4 fade-in duration-700">
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shadow-sm border border-slate-100">
            <span className="text-lg">💭</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Reflection</h4>
            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Synthesis Required</span>
          </div>
        </div>
        
        <p className="text-[18px] leading-snug font-bold text-slate-800 mb-8">
          {quiz.question}
        </p>

        <div className="space-y-3">
          {quiz.options.map((opt, idx) => {
            const isSelected = selectedIdx === idx;
            const isCorrect = opt.isCorrect;
            let btnStyle = "w-full p-5 rounded-[1.5rem] border-2 transition-all duration-300 text-[15px] font-medium text-left flex items-center justify-between ";
            if (isSelected) {
              btnStyle += isCorrect ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm" : "bg-rose-50 border-rose-300 text-rose-900 animate-shake";
            } else {
              btnStyle += "bg-white border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50/50";
            }
            if (isSolved && !isSelected && !isCorrect) btnStyle += " opacity-30 grayscale pointer-events-none";

            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={isSolved} className={btnStyle}>
                <span className="flex-1 pr-4">{opt.text}</span>
                {isSelected && (
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isCorrect ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'} text-xs`}>
                    {isCorrect ? '✓' : '✕'}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {isSolved && (
          <div className="mt-8 pt-6 border-t border-slate-200 animate-in slide-in-from-top-2 duration-500 text-center">
            <p className="text-[13px] text-slate-500 leading-relaxed italic">
              {quiz.explanation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const IntentCard: React.FC<{ intent: IntentCheck; onSelect: (labels: string[]) => void }> = ({ intent, onSelect }) => {
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);

  const toggleChoice = (val: string) => {
    if (confirmed) return;
    if (intent.allowMultiple) {
      setSelectedValues(prev => 
        prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
      );
    } else {
      setSelectedValues([val]);
      setConfirmed(true);
      const label = intent.options.find(o => o.value === val)?.text || val;
      onSelect([label]);
    }
  };

  const handleConfirm = () => {
    if (selectedValues.length === 0) return;
    setConfirmed(true);
    const labels = selectedValues.map(v => intent.options.find(o => o.value === v)?.text || v);
    onSelect(labels);
  };

  return (
    <div className="w-full max-w-xl animate-in slide-in-from-top-4 fade-in duration-700">
      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-10 shadow-2xl shadow-indigo-500/5">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100">
            <span className="text-lg">🎯</span>
          </div>
          <div className="flex flex-col">
            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.25em]">Intent Check</h4>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Focus Decision</span>
          </div>
        </div>
        
        <p className="text-[20px] leading-snug font-bold text-slate-900 mb-8">
          {intent.question}
        </p>

        <div className="grid grid-cols-1 gap-4">
          {intent.options.map((opt, idx) => {
            const isSelected = selectedValues.includes(opt.value);
            return (
              <button 
                key={idx} 
                onClick={() => toggleChoice(opt.value)} 
                disabled={confirmed}
                className={`w-full p-6 rounded-[1.5rem] border-2 transition-all duration-300 text-[16px] font-medium text-left flex items-center gap-4 ${
                  isSelected 
                  ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-md' 
                  : 'bg-white border-slate-50 text-slate-600 hover:border-slate-200'
                } ${confirmed && !isSelected ? 'opacity-40' : ''}`}
              >
                {intent.allowMultiple && (
                  <div className={`w-5 h-5 rounded-lg border-2 shrink-0 flex items-center justify-center transition-colors ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200'}`}>
                    {isSelected && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                  </div>
                )}
                {opt.text}
              </button>
            );
          })}
        </div>

        {intent.allowMultiple && !confirmed && (
          <button 
            onClick={handleConfirm}
            disabled={selectedValues.length === 0}
            className="mt-8 w-full py-5 rounded-2xl bg-slate-900 text-white font-bold text-[13px] tracking-widest uppercase hover:bg-black transition-all disabled:opacity-30"
          >
            Confirm Focus Areas
          </button>
        )}
      </div>
    </div>
  );
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onQuizCorrect, onIntentSelect }) => {
  const isAssistant = message.role === 'assistant';

  const renderedContent = React.useMemo(() => {
    if (!message.content) return '';
    try {
      return marked.parse(message.content);
    } catch (e) { return message.content; }
  }, [message.content]);

  // Only render the main bubble if there is something to show
  const hasVisualContent = message.content || message.media;

  return (
    <div className={`flex flex-col w-full mb-12 ${isAssistant ? 'items-start' : 'items-end'}`}>
      {hasVisualContent && (
        <div className={`max-w-[84%] md:max-w-[72%] rounded-[1.75rem] px-7 py-6 transition-all duration-300 animate-in slide-in-from-bottom-2 duration-400 ${
          isAssistant 
            ? 'bg-white text-slate-800 border border-slate-100 shadow-slate-200/10 shadow-2xl rounded-tl-none' 
            : 'bg-[#F9FBFF] text-slate-900 border border-slate-200/30 shadow-slate-100/20 shadow-xl rounded-tr-none'
        }`}>
          <div className="text-[9px] font-black uppercase tracking-[0.2em] opacity-30 mb-4 flex justify-between items-center">
            <span className={isAssistant ? 'text-indigo-600' : 'text-slate-600'}>
              {isAssistant ? 'Spark' : 'You'}
            </span>
            <span className="font-semibold">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          
          {message.media && (
            <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm">
              <img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Context" className="max-h-[350px] w-full object-cover" />
            </div>
          )}

          {message.content && (
            <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />
          )}
        </div>
      )}

      {isAssistant && (message.stats || message.intentData || message.quizData) && (
        <div className="flex flex-col gap-8 mt-6 w-full animate-in fade-in slide-in-from-top-4 duration-1000">
          {message.stats && (
            <div className="w-full max-w-xl bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
               <div className="flex items-center gap-3 mb-4">
                 <span className="text-sm">📊</span>
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Session Check</h4>
               </div>
               <p className="text-[14px] text-slate-600 leading-relaxed font-medium">
                 {message.stats.split('|')[1]?.trim() || message.stats}
               </p>
               <div className="mt-4 text-[9px] font-bold text-indigo-400 uppercase tracking-widest">
                 {message.stats.split('|')[0].trim()}
               </div>
            </div>
          )}

          {message.intentData && (
            <IntentCard intent={message.intentData} onSelect={onIntentSelect || (() => {})} />
          )}

          {message.quizData && (
            <ReflectionCard quiz={message.quizData} onCorrect={onQuizCorrect || (() => {})} />
          )}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
