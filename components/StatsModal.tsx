
import React, { useMemo } from 'react';
import { SessionStats, Message } from '../types';
import { t } from '../services/i18n';

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

  // Determine Zone
  const zone = useMemo(() => {
    // EXTENDED NEUTRAL ZONE (Calibration Phase):
    if (messages.length < 5 && stats.agency < 30) {
        return 'neutral';
    }
    if (stats.agency >= 60) return 'high';
    if (stats.agency >= 40) return 'medium';
    return 'low';
  }, [stats.agency, messages.length]);

  // Agency Goal based on Friction Level (Intended Target)
  const agencyGoal = useMemo(() => {
    switch (stats.frictionLevel) {
      case 'low': return 45;  // Flow mode accepts lower agency for speed
      case 'high': return 75; // Deep work demands high agency
      default: return 60;     // Standard balance
    }
  }, [stats.frictionLevel]);

  const zoneColor = useMemo(() => {
    switch (zone) {
      case 'high': return 'text-emerald-500';
      case 'medium': return 'text-amber-500';
      case 'low': return 'text-rose-500';
      case 'neutral': return 'text-slate-300'; // Neutral color
    }
  }, [zone]);

  const zoneBg = useMemo(() => {
    switch (zone) {
      case 'high': return 'bg-emerald-50 border-emerald-100 text-emerald-900';
      case 'medium': return 'bg-amber-50 border-amber-100 text-amber-900';
      case 'low': return 'bg-rose-50 border-rose-100 text-rose-900';
      case 'neutral': return 'bg-slate-50 border-slate-100 text-slate-500'; // Neutral bg
    }
  }, [zone]);
  
  const { activeContribution, passiveWeight } = stats.breakdown;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/20 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-[0_48px_120px_-32px_rgba(0,0,0,0.15)] w-full max-w-md h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-10 pb-2 flex justify-between items-start shrink-0">
          <div className="flex flex-col"><h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">{t.epistemicLog}</h2><span className="text-2xl font-bold text-slate-900 tracking-tighter">{t.agencyArtifact}</span></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300 hover:text-slate-900 active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-10 pt-4 space-y-8 scrollbar-hide">
          
          {/* Main Chart Card */}
          <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col items-center relative overflow-hidden">
            
            <div className="relative mb-6">
              <svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="6" />
                <circle 
                  cx="60" cy="60" r={radius} fill="none" 
                  stroke="currentColor" strokeWidth="6" 
                  className={`${zoneColor} transition-all duration-[2s] ease-out`} 
                  strokeDasharray={circumference} 
                  strokeDashoffset={zone === 'neutral' ? circumference : offset} // Visual Reset in Neutral
                  strokeLinecap="round" 
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-normal text-slate-900 tracking-tighter">
                  {zone === 'neutral' ? '---' : `${stats.agency.toFixed(1)}%`}
                </span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{t.agency}</span>
              </div>
            </div>

            {/* Contextual Interpretation Block */}
            <div className={`w-full p-4 rounded-2xl mb-6 border ${zoneBg} animate-in slide-in-from-bottom-2 duration-700`}>
              <div className="flex items-center gap-2.5 mb-2">
                <div className={`w-2 h-2 rounded-full ${zone === 'high' ? 'bg-emerald-500' : zone === 'medium' ? 'bg-amber-500' : zone === 'low' ? 'bg-rose-500' : 'bg-slate-400'} ${zone !== 'neutral' ? 'animate-pulse' : ''}`} />
                <span className="text-[10px] font-black uppercase tracking-widest opacity-80">
                  {zone === 'high' ? t.zoneHigh : zone === 'medium' ? t.zoneMedium : zone === 'low' ? t.zoneLow : t.zoneNeutral}
                </span>
              </div>
              <p className="text-xs font-medium leading-relaxed opacity-90">
                {zone === 'high' ? t.adviceHigh : zone === 'medium' ? t.adviceMedium : zone === 'low' ? t.adviceLow : t.adviceNeutral}
              </p>
            </div>

            {/* Target & Trend */}
            <div className="w-full flex justify-between items-center mb-6 px-1">
              {/* Agency Goal (Replaces Peer Benchmark) */}
              <div className="flex flex-col gap-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t.agencyGoal}: {agencyGoal}%</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-slate-400 transition-all duration-700" style={{ width: `${agencyGoal}%` }} />
                  </div>
                </div>
              </div>
              
              {/* Trend (Only shown if activity exists) */}
              {zone !== 'neutral' && (
                <div className={`text-[10px] font-bold ${zone === 'low' ? 'text-rose-500' : 'text-slate-400'} flex items-center gap-1`}>
                   {zone === 'low' ? t.trendDown : t.trendUp}
                </div>
              )}
            </div>

            {/* Linear Bars */}
            <div className="w-full space-y-4 mb-8">
              <div className="flex flex-col gap-1.5"><div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest"><span className="text-indigo-500">{t.userContribution}</span></div><div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 transition-all duration-1000" style={{ width: `${Math.min(100, (activeContribution / (activeContribution + passiveWeight || 1)) * 100)}%` }} /></div><p className="text-[8px] text-slate-400 font-bold italic tracking-wide text-right">{t.activeEngagement}</p></div>
              <div className="flex flex-col gap-1.5"><div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest"><span className="text-slate-400">{t.aiPassiveWeight}</span></div><div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"><div className="h-full bg-slate-400 transition-all duration-1000" style={{ width: `${Math.min(100, (passiveWeight / (activeContribution + passiveWeight || 1)) * 100)}%` }} /></div><p className="text-[8px] text-slate-300 font-bold italic tracking-wide text-right">{t.cognitiveLoad}</p></div>
            </div>

            <div className="w-full flex justify-between px-4 border-t border-slate-100 pt-6">
               <div className="text-center"><div className="text-2xl font-bold text-slate-900">{stats.intentDecisions}</div><div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{t.intents}</div></div>
               <div className="w-px h-10 bg-slate-200"></div>
               <div className="text-center"><div className="text-2xl font-bold text-indigo-600">{stats.sparks}</div><div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mt-1">{t.sparks}</div></div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="space-y-8 pb-10">
            <div className="flex items-center gap-3"><div className="h-px flex-1 bg-slate-100"></div><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t.timeline}</h3><div className="h-px flex-1 bg-slate-100"></div></div>
            <div className="space-y-4">
              {stats.intentLog.length === 0 && stats.verifiedInsights.length === 0 && (
                 <div className="text-center py-8 text-slate-300 italic text-xs">Noch keine Einträge.</div>
              )}
              {stats.intentLog.map((intent, i) => (
                <div key={`int-${i}`} className="p-5 bg-white border border-slate-100 rounded-3xl flex gap-5 items-start"><div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{i + 1}</div><div className="flex flex-col"><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.decision}</span><p className="text-[14px] text-slate-700 font-medium leading-relaxed">{intent}</p></div></div>
              ))}
              {stats.verifiedInsights.map((insight, i) => (
                <div key={`ins-${i}`} className="p-5 bg-indigo-50/30 border border-indigo-100/50 rounded-3xl flex gap-5 items-start"><div className="w-8 h-8 rounded-xl bg-indigo-500 flex items-center justify-center text-xs text-white shrink-0">✨</div><div className="flex flex-col"><span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1.5">{t.insight}</span><p className="text-[14px] text-indigo-900/80 font-bold leading-snug">{insight}</p></div></div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-10 pt-4 bg-white border-t border-slate-50 shrink-0"><button onClick={onClose} className="w-full py-5 bg-slate-900 text-white text-[12px] font-bold rounded-[1.5rem] uppercase tracking-[0.25em] hover:bg-black transition-all active:scale-[0.97] shadow-xl shadow-slate-900/10">{t.acknowledge}</button></div>
      </div>
    </div>
  );
};

export default StatsModal;
