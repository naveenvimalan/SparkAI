
import React from 'react';
import { t } from '../services/i18n';
import { FrictionLevel } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  frictionLevel: FrictionLevel;
  onFrictionChange: (level: FrictionLevel) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, isDarkMode, onToggleDarkMode, frictionLevel, onFrictionChange 
}) => {
  if (!isOpen) return null;

  const getMultiplier = (level: FrictionLevel) => {
    switch (level) {
      case 'low': return '0.5x';
      case 'medium': return '1.0x';
      case 'high': return '1.5x';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/10 dark:bg-black/40 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
        <div className="p-8 pb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{t.settings}</h2>
          <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 dark:text-slate-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="p-8 pt-2 space-y-8">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg">
                {isDarkMode ? '🌙' : '☀️'}
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t.darkMode}</span>
            </div>
            <button 
              onClick={onToggleDarkMode}
              className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}
            >
              <div className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
          </div>

          {/* Friction Settings */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
               <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{t.cognitiveFriction}</span>
               <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${frictionLevel === 'low' ? 'bg-rose-100 text-rose-600' : frictionLevel === 'high' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                 {getMultiplier(frictionLevel)}
               </span>
            </div>
            
            <div className="flex flex-col gap-2">
              {(['low', 'medium', 'high'] as FrictionLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => onFrictionChange(level)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between group ${
                    frictionLevel === level 
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' 
                      : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider">
                    {level === 'low' ? t.frictionLow : level === 'medium' ? t.frictionMedium : t.frictionHigh}
                  </span>
                  {frictionLevel === level && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
                </button>
              ))}
            </div>
            
            <p className="text-[11px] font-medium leading-relaxed text-center pt-2">
              {frictionLevel === 'low' && <span className="text-rose-500">{t.lowFrictionWarning}</span>}
              {frictionLevel === 'high' && <span className="text-emerald-600 dark:text-emerald-400">{t.highFrictionBonus}</span>}
              {frictionLevel === 'medium' && <span className="text-slate-400 dark:text-slate-500">Optimale Balance für den Alltag.</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
