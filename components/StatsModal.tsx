
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
  
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const visualAgency = hasData ? stats.agency : 0;
  const offset = circumference - (visualAgency / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={onClose}>
      <div 
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Cognitive Dashboard</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200/50 rounded-full transition-all text-slate-400 hover:text-slate-600 active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-10">
          {/* Agency Gauge */}
          <div className="flex flex-col items-center text-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-100" />
                <circle
                  cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8"
                  className={`${hasData ? (stats.agency < 40 ? 'text-orange-500' : 'text-indigo-600') : 'text-slate-200'} transition-all duration-1000 ease-out shadow-sm`}
                  strokeDasharray={circumference}
                  strokeDashoffset={hasData ? offset : circumference}
                  strokeLinecap="round" transform="rotate(-90 60 60)"
                />
              </svg>
              <div className="flex flex-col items-center">
                <span className="text-5xl font-black text-slate-900 leading-none">{hasData ? stats.agency : '--'}<span className="text-xl">%</span></span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">Agency Share</span>
              </div>
            </div>
            
            <div className="mt-6 flex gap-2">
               <div className="bg-slate-50 px-4 py-2 rounded-full border border-slate-100 shadow-sm flex items-center gap-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">{stats.sparks} Sparks ✨</span>
              </div>
              <div className="bg-indigo-600 px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
                <span className="text-[10px] font-black text-white uppercase tracking-wider">Level {Math.floor(stats.sparks/5) + 1}</span>
              </div>
            </div>
          </div>

          {/* Word Contribution Visualizer */}
          <div className="space-y-4">
            <div className="flex justify-between items-end px-2">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">You</span>
                <span className="text-xl font-black text-slate-900">{stats.userWords} <span className="text-xs font-medium text-slate-400">words</span></span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Spark AI</span>
                <span className="text-xl font-black text-slate-900">{stats.aiWords} <span className="text-xs font-medium text-slate-400">words</span></span>
              </div>
            </div>
            
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex p-1 border border-slate-50 relative">
              <div className="h-full bg-indigo-600 rounded-full transition-all duration-1000 ease-in-out" style={{ width: `${hasData ? Math.max(2, userWordPercent) : 0}%` }} />
              <div className={`h-full ${hasData ? 'bg-slate-300' : 'bg-slate-100'} rounded-full transition-all duration-1000 ease-in-out ml-1 flex-1`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center transition-all duration-300 group">
              <span className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">{stats.questions}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Questions</span>
            </div>
            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex flex-col items-center justify-center transition-all duration-300 group">
              <span className="text-3xl font-black text-slate-900 group-hover:scale-110 transition-transform">{stats.responses}</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Responses</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-900 text-slate-100 flex items-center gap-5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/10">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-xs leading-relaxed font-medium text-slate-400">
            Every answered <span className="text-indigo-400 font-bold">Checkpoint</span> strengthens your neural pathways. Keep going!
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
