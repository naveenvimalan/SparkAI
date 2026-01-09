
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
  
  const { activeContribution, passiveWeight } = useMemo(() => {
    // Exact copy of the logic in App.tsx for visual consistency
    // Note: In a larger app, this logic should be extracted to a shared utility
    const delegationSignals = [
      'entscheide du', 'mach du', 'sag du mir', 'übernimm du', 'entscheidest du', 
      'decide for me', 'you decide', 'what should i do', 'tell me what to do',
      'mach mal fertig', 'schreib das für mich'
    ];
    
    const isDelegatingWork = (text: string) => delegationSignals.some(s => text.toLowerCase().includes(s));
    
    const isGibberish = (text: string) => {
      const t = text.toLowerCase().trim();
      if (t.length === 0) return true;
      if (/(.+?)\1{3,}/.test(t)) return true;
      if (t.length > 30 && !t.includes(' ')) return true;
      return false;
    };

    const activeActions = (stats.intentDecisions * 5.0) + (stats.sparks * 9.0);
    
    const articulationBonus = messages.reduce((acc, m) => {
      if (m.role !== 'user' || m.isIntentDecision) return acc;
      
      const content = m.content;
      // 1. FILTER: No points for Noise/Gibberish UNLESS media is attached (which implies curation)
      if (isGibberish(content) && !m.media) return acc;

      let score = acc;

      // 2. CURATION BONUS: Uploading artifacts is High Agency
      if (m.media) {
        score += 15.0;
      }

      const isDelegating = isDelegatingWork(content);
      if (isDelegating) return score - 5.0; // Penalty aligned with App.tsx

      const len = content.length;
      // 3. THRESHOLD: No points for phatic UNLESS media is attached
      if (len < 12 && !m.media) return score; 

      if (len < 30) return score + 0.5;
      if (len < 60) return score + 2.0;
      if (len < 150) return score + 6.0;
      if (len < 400) return score + 12.0;
      return score + 18.0;
    }, 0);

    const noiseFactor = messages.reduce((acc, m, idx) => {
      if (m.role !== 'assistant') return acc;
      
      // MODE D DETECTION (Consistency with App.tsx)
      const isAgencyDefense = m.content.includes("strukturell nicht verarbeiten") || 
                              m.content.includes("cannot process this input structurally");
      if (isAgencyDefense) return acc;

      const prevUserMsg = messages[idx - 1];
      if (!prevUserMsg || prevUserMsg.role !== 'user') return acc;
      
      const userEffort = prevUserMsg.content.length;
      const userProvidedMedia = !!prevUserMsg.media;

      const isDelegating = isDelegatingWork(prevUserMsg.content);
      // High effort is either long text OR provided media
      const isHighEffort = (userEffort > 150 || userProvidedMedia) && !isDelegating;
      // Trap only if short text AND NO media
      const isDelegationTrap = isDelegating || (userEffort < 25 && !prevUserMsg.isIntentDecision && !userProvidedMedia);
      
      const len = m.content.length;
      let weight = 0;
      if (len < 200) weight = 0.2;
      else if (len < 600) weight = 1.0;
      else weight = 2.5;
      
      if (isHighEffort) weight *= 0.3;
      if (isDelegationTrap) weight *= 3.0;
      return acc + weight;
    }, 0);

    return { 
      activeContribution: activeActions + articulationBonus, 
      passiveWeight: noiseFactor 
    };
  }, [stats.intentDecisions, stats.sparks, messages]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/20 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose}>
      <div className="bg-white rounded-[3rem] shadow-[0_48px_120px_-32px_rgba(0,0,0,0.15)] w-full max-w-md h-[80vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 border border-slate-100 flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-10 pb-6 flex justify-between items-start shrink-0">
          <div className="flex flex-col"><h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">{t.epistemicLog}</h2><span className="text-2xl font-bold text-slate-900 tracking-tighter">{t.agencyArtifact}</span></div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-full transition-colors text-slate-300 hover:text-slate-900 active:scale-90"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        <div className="flex-1 overflow-y-auto p-10 pt-0 space-y-10 scrollbar-hide">
          <div className="bg-slate-50/50 rounded-[2.5rem] p-8 border border-slate-100 flex flex-col items-center">
            <div className="relative mb-6"><svg className="w-40 h-40 -rotate-90" viewBox="0 0 120 120"><circle cx="60" cy="60" r={radius} fill="none" stroke="#E2E8F0" strokeWidth="6" /><circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-indigo-600 transition-all duration-[2s] ease-out" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" /></svg><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-4xl font-normal text-slate-900 tracking-tighter">{stats.agency.toFixed(1)}%</span><span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">{t.agency}</span></div></div>
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
          <div className="space-y-8 pb-10">
            <div className="flex items-center gap-3"><div className="h-px flex-1 bg-slate-100"></div><h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{t.timeline}</h3><div className="h-px flex-1 bg-slate-100"></div></div>
            <div className="space-y-4">
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
