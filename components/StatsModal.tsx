
import React from 'react';
import { SessionStats } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SessionStats;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  // Visual representation of cognitive focus
  const focusPoints = (stats.sparks * 3) + (stats.intentDecisions * 2);
  const infoPoints = stats.responses + stats.questions;
  const totalPoints = Math.max(1, focusPoints + infoPoints);
  const focusPercent = (focusPoints / totalPoints) * 100;
  
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.agency / 100) * circumference;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500" onClick={onClose}>
      <div 
        className="bg-white rounded-[3rem] shadow-[0_32px_120px_-20px_rgba(0,0,0,0.12)] w-full max-w-2xl h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 flex justify-between items-center border-b border-slate-50 shrink-0">
          <div className="flex flex-col">
            <h2 className="text-[11px] font-black text-slate-300 uppercase tracking-[0.4em]">Strategy Dossier</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-slate-900">Session Artifact</span>
              <span className="w-1 h-1 rounded-full bg-slate-200"></span>
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Active Synthesis</span>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-300 hover:text-slate-900 active:scale-90 border border-transparent hover:border-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
          
          {/* Top Section: Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="flex justify-center relative py-4">
              <svg className="w-48 h-48 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#F8FAFC" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
                  className="text-indigo-600 transition-all duration-[2s] ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-normal text-slate-900 tracking-tight">{stats.agency}%</span>
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1">Agency</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  <span>Synthesis Balance</span>
                  <span className="text-indigo-500">Focus Dominant</span>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden flex border border-slate-50/50">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-1000 ease-in-out" 
                    style={{ width: `${focusPercent}%` }} 
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Your session is driven by <span className="text-slate-900 font-bold">{Math.round(focusPercent)}% intentional choice</span>, minimizing passive consumption.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-slate-50 rounded-3xl border border-slate-100">
                   <div className="text-2xl font-bold text-slate-900">{stats.intentDecisions}</div>
                   <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Intents</div>
                </div>
                <div className="p-4 bg-indigo-50/30 rounded-3xl border border-indigo-100/50">
                   <div className="text-2xl font-bold text-indigo-600">{stats.sparks}</div>
                   <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Sparks</div>
                </div>
              </div>
            </div>
          </div>

          {/* Detailed Strategy Logs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Intent Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-sm">🎯</span>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Decision Path</h3>
              </div>
              
              <div className="space-y-4">
                {stats.intentLog.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">No explicit focus areas selected yet.</p>
                ) : (
                  stats.intentLog.map((intent, i) => (
                    <div key={i} className="flex gap-4 group">
                      <div className="flex flex-col items-center">
                        <div className="w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {i + 1}
                        </div>
                        {i < stats.intentLog.length - 1 && <div className="w-px flex-1 bg-slate-100 my-1" />}
                      </div>
                      <p className="text-sm text-slate-600 font-medium leading-relaxed pt-0.5">
                        {intent}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Insights Column */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <span className="text-sm">✨</span>
                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Verified Insights</h3>
              </div>

              <div className="space-y-3">
                {stats.verifiedInsights.length === 0 ? (
                  <p className="text-xs text-slate-300 italic">Complete reflection checks to secure insights.</p>
                ) : (
                  stats.verifiedInsights.map((insight, i) => (
                    <div key={i} className="p-4 bg-indigo-50/50 border border-indigo-100/30 rounded-2xl flex gap-3 items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                      <p className="text-[13px] text-indigo-900/80 font-semibold leading-snug">
                        {insight}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-10 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between shrink-0">
           <span className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">
            Cognitive Layer {Math.floor(stats.sparks/5) + 1}
           </span>
           <button 
             onClick={onClose}
             className="px-6 py-2.5 bg-slate-900 text-white text-[11px] font-bold rounded-xl uppercase tracking-widest hover:bg-black transition-all active:scale-95 shadow-lg shadow-slate-900/10"
           >
            Close Artifact
           </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
