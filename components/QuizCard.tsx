
import React, { useState } from 'react';
import { Quiz } from '../types';

interface QuizCardProps {
  quiz: Quiz;
  onCorrect: () => void;
}

const QuizCard: React.FC<QuizCardProps> = ({ quiz, onCorrect }) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const handleSelect = (idx: number) => {
    if (isLocked) return;
    setSelectedIdx(idx);
    if (quiz.options[idx].isCorrect) {
      setIsLocked(true);
      onCorrect();
    }
  };

  return (
    <div className="w-full py-8 flex justify-center animate-in fade-in zoom-in-95 duration-500">
      <div className="w-full max-w-lg glass rounded-3xl p-8 border border-slate-100">
        <div className="flex flex-col items-center">
          <div className="mb-6 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-2">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Neural Checkpoint</span>
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-8 text-center leading-tight">
            {quiz.question}
          </h3>

          <div className="w-full space-y-2.5">
            {quiz.options.map((opt, idx) => {
              const isSelected = selectedIdx === idx;
              const isCorrect = opt.isCorrect;
              let style = "w-full p-4 rounded-2xl border transition-all text-sm font-medium text-left flex items-center justify-between ";
              
              if (isSelected) {
                style += isCorrect ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-rose-50 border-rose-300 text-rose-700 animate-shake";
              } else {
                style += "bg-white border-slate-100 text-slate-600 hover:border-slate-300";
              }
              if (isLocked && !isSelected && !isCorrect) style += " opacity-30 grayscale";

              return (
                <button key={idx} disabled={isLocked} onClick={() => handleSelect(idx)} className={style}>
                  <span>{opt.text}</span>
                  {isSelected && <span className="text-base">{isCorrect ? '✓' : '✕'}</span>}
                </button>
              );
            })}
          </div>

          {isLocked && (
            <div className="mt-8 pt-6 border-t border-slate-100 w-full animate-in slide-in-from-top-2">
              <p className="text-[11px] text-slate-500 leading-relaxed italic text-center">
                <span className="font-bold text-slate-900 not-italic uppercase tracking-widest text-[9px] mr-2">Insight</span>
                {quiz.explanation}
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-indigo-500">
                <span className="text-[10px] font-black uppercase tracking-widest">+1 Spark Earned</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizCard;
