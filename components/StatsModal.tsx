
import React, { useMemo } from 'react';
import { SessionStats, Message } from '../types';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SessionStats;
  messages: Message[];
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats, messages }) => {
  if (!isOpen) return null;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (stats.agency / 100) * circumference;

  // Sync Logic with App.tsx
  const activeContribution = (stats.intentDecisions * 12) + (stats.sparks * 15);
  const passiveWeight = useMemo(() => {
    return messages.reduce((acc, m, idx) => {
      if (m.role !== 'assistant') return acc;
      const prevUserMsg = messages[idx - 1];
      const isDelegation = prevUserMsg && prevUserMsg.role === 'user' && prevUserMsg.content.length < 25 && !prevUserMsg.isIntentDecision;
      const len = m.content.length;
      let weight = 0;
      if (len < 150) weight = 0;
      else if (len < 400) weight = 2;
      else weight = 5;
      if (isDelegation && weight > 0) weight *= 2.5;
      return acc + weight;
    }, 0);
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/20 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}>
      <div 
        className="bg-white rounded-[3rem] shadow-[0_48px_120px_-32px_rgba(0,0,0,0.15)] w-full max-w-md h-[80vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dossier Header */}
        <div className="p-10 pb-6 flex justify-between items-start shrink-0">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Epistemic Log</h2>
            <span className="text-2xl font-bold text-slate-900 tracking-tighter">Agency Artifact</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300 hover:text-slate-900 active:scale-90">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10 pt-0 space-y-10 scrollbar-hide">
          
          {/* Status Overview */}
          <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col items-center">
            <div className="relative mb-6">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="6" />
                <circle
                  cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="6"
                  className="text-indigo-600 transition-all duration-[2s] ease-out"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-normal text-slate-900 tracking-tighter">{stats.agency}%</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Agency</span>
              </div>
            </div>

            {/* Source Attribution Breakdown */}
            <div className="w-full space-y-4 mb-8">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-indigo-500">User Contribution</span>
                  <span className="text-slate-900">+{activeContribution} pts</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, activeContribution)}%` }} />
                </div>
                <p className="text-[8px] text-slate-400 font-bold italic tracking-wide">Earned via Intents & Verified Sparks</p>
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest">
                  <span className="text-slate-400">AI Passive Weight</span>
                  <span className="text-slate-500">-{passiveWeight} pts</span>
                </div>
                <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-400 transition-all duration-1000" style={{ width: `${Math.min(100, (passiveWeight / (activeContribution || 1)) * 100)}%` }} />
                </div>
                <p className="text-[8px] text-slate-300 font-bold italic tracking-wide">Accelerated by Cognitive Delegation</p>
              </div>
            </div>

            <div className="w-full flex justify-between px-4 border-t border-slate-100 pt-6">
               <div className="text-center">
                  <div className="text-2xl font-bold text-slate-900">{stats.intentDecisions}</div>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Intents</div>
               </div>
               <div className="w-px h-10 bg-slate-200"></div>
               <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{stats.sparks}</div>
                  <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">Sparks</div>
               </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-8 pb-10">
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100"></div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Timeline</h3>
              <div className="h-px flex-1 bg-slate-100"></div>
            </div>
            
            <div className="space-y-4">
              {stats.intentLog.length === 0 && stats.verifiedInsights.length === 0 ? (
                <div className="py-20 text-center">
                   <p className="text-xs text-slate-300 font-medium italic">Establishing neural path...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.intentLog.map((intent, i) => (
                    <div key={`int-${i}`} className="p-5 bg-white border border-slate-100 rounded-3xl flex gap-5 items-start">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Decision</span>
                        <p className="text-[14px] text-slate-700 font-medium leading-relaxed">{intent}</p>
                      </div>
                    </div>
                  ))}
                  {stats.verifiedInsights.map((insight, i) => (
                    <div key={`ins-${i}`} className="p-5 bg-indigo-50/30 border border-indigo-100/50 rounded-3xl flex gap-5 items-start">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-xs text-white shrink-0">
                        ✨
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">Insight</span>
                        <p className="text-[14px] text-indigo-900/80 font-bold leading-snug">{insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-10 pt-4 bg-white border-t border-slate-50 shrink-0">
          <button 
            onClick={onClose}
            className="w-full py-5 bg-slate-900 text-white text-[12px] font-bold rounded-[1.5rem] uppercase tracking-[0.25em] hover:bg-black transition-all active:scale-[0.97] shadow-xl shadow-slate-900/10"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
