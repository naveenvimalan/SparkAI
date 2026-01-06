
import React from 'react';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    questions: number;
    responses: number;
    intentDecisions: number;
    agency: number;
    sparks: number;
  };
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  // Visual representation of cognitive focus
  // Focus is driven by Sparks and Intent decisions
  const focusPoints = (stats.sparks * 2) + stats.intentDecisions;
  const infoPoints = stats.responses;
  const totalPoints = Math.max(1, focusPoints + infoPoints);
  const focusPercent = (focusPoints / totalPoints) * 100;
  
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.agency / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/40 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}>
      <div 
        className="bg-white rounded-[3.5rem] shadow-[0_32px_80px_-20px_rgba(0,0,0,0.08)] w-full max-w-sm overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 pb-2 flex justify-between items-center">
          <h2 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em]">Synthesis</h2>
          <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-full transition-all text-slate-300 hover:text-slate-900 active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-8 pb-12 pt-4 flex flex-col items-center">
          {/* Circular Agency Gauge */}
          <div className="relative w-56 h-56 flex items-center justify-center mb-10">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r={radius} fill="none" stroke="#F8FAFC" strokeWidth="5" />
              <circle
                cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="5"
                className="text-indigo-600 transition-all duration-[1.5s] ease-out"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
            </svg>
            <div className="flex flex-col items-center">
              <div className="flex items-baseline">
                <span className="text-6xl font-normal text-slate-900 tracking-tight leading-none">
                  {stats.agency}
                </span>
                <span className="text-xl font-medium text-slate-300 ml-1">%</span>
              </div>
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-4">Agency</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="w-full grid grid-cols-2 gap-4 mb-10">
            <div className="bg-slate-50/50 border border-slate-100/50 rounded-[2.5rem] p-6 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{stats.intentDecisions}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Decisions</span>
            </div>
            <div className="bg-slate-50/50 border border-slate-100/50 rounded-[2.5rem] p-6 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-slate-900">{stats.sparks}</span>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Sparks</span>
            </div>
          </div>

          {/* Cognitive Balance Bar */}
          <div className="w-full space-y-5 px-2">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
              <span>Focus</span>
              <span>Information</span>
            </div>
            <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden flex border border-slate-50">
              <div 
                className="h-full bg-indigo-600 transition-all duration-1000 ease-in-out" 
                style={{ width: `${focusPercent}%` }} 
              />
            </div>
            <div className="flex justify-between text-[13px] font-semibold text-slate-900">
              <span>{focusPoints} units</span>
              <span className="text-slate-300">{infoPoints} units</span>
            </div>
          </div>
        </div>

        <div className="px-10 py-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-center">
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Cognitive Layer {Math.floor(stats.sparks/5) + 1} • {stats.agency > 50 ? 'Active Synthesis' : 'Guided Flow'}
           </span>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
