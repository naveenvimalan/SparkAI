
import React from 'react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    questions: number;
    responses: number;
    userWords: number;
    aiWords: number;
    agency: number;
    sparks: number;
  };
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  const totalWords = stats.userWords + stats.aiWords;
  const hasData = totalWords > 0;
  
  const userWordPercent = hasData ? (stats.userWords / totalWords) * 100 : 0;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const visualAgency = hasData ? stats.agency : 0;
  const offset = circumference - (visualAgency / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/60 backdrop-blur-xl animate-in fade-in duration-500" onClick={onClose}>
      <div 
        className="bg-white rounded-[3rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-4 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-[0.2em]">Synthesis</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-full transition-all text-slate-300 hover:text-slate-900 active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-10 pb-12 pt-4 flex flex-col items-center">
          {/* Minimalist Gauge */}
          <div className="relative w-48 h-48 flex items-center justify-center mb-10">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#F1F5F9" strokeWidth="4" />
              <circle
                cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="4"
                className={`${hasData ? 'text-indigo-600' : 'text-slate-200'} transition-all duration-1000 ease-out`}
                strokeDasharray={circumference}
                strokeDashoffset={hasData ? offset : circumference}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center">
              <span className="text-5xl font-light text-slate-900 tracking-tight leading-none">
                {hasData ? stats.agency : '0'}<span className="text-lg font-normal text-slate-400 ml-0.5">%</span>
              </span>
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em] mt-3">Agency</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100 mb-8">
            <div className="bg-white p-6 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900">{stats.questions}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Queries</span>
            </div>
            <div className="bg-white p-6 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900">{stats.sparks}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sparks</span>
            </div>
          </div>

          {/* Contribution bar */}
          <div className="w-full space-y-4">
            <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <span>You</span>
              <span>Spark AI</span>
            </div>
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-indigo-600 transition-all duration-1000" 
                style={{ width: `${hasData ? Math.max(5, userWordPercent) : 50}%` }} 
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-900">
              <span>{stats.userWords} words</span>
              <span className="text-slate-400">{stats.aiWords} words</span>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-center">
           <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Level {Math.floor(stats.sparks/5) + 1} Thinking
           </span>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
