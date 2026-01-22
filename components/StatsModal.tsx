import React from 'react';
import { SessionStats } from '../types';
import { t } from '../services/i18n';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: SessionStats;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-white/20 backdrop-blur-2xl animate-in fade-in duration-500"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-[0_48px_120px_-32px_rgba(0,0,0,0.15)] w-full max-w-md h-[85vh] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 border border-slate-100 dark:border-slate-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-10 pb-2 flex justify-between items-start shrink-0">
          <div className="flex flex-col">
            <h2 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">My Insights</h2>
            <span className="text-2xl font-bold text-slate-900 dark:text-white tracking-tighter">
              Contribution Summary
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-300 hover:text-slate-900 dark:hover:text-white active:scale-90"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-10 pt-4 space-y-8 scrollbar-hide">
          {/* Articulation Quality */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6">
              Articulation Quality
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">High Quality</span>
                <span className="text-2xl font-bold text-emerald-600">{stats.articulationQuality.high}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Medium Quality</span>
                <span className="text-2xl font-bold text-amber-600">{stats.articulationQuality.medium}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Low Quality</span>
                <span className="text-2xl font-bold text-slate-400">{stats.articulationQuality.low}</span>
              </div>
            </div>
          </div>

          {/* Comprehension Performance */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6">
              Comprehension Verification
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">First-Attempt Success</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {(stats.comprehensionRate * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Quizzes</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.quizHistory.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Sparks Earned</span>
                <span className="text-2xl font-bold text-amber-500">{stats.sparks}</span>
              </div>
            </div>
          </div>

          {/* Delegation Patterns */}
          <div className="bg-slate-50/50 dark:bg-slate-800/50 rounded-[2.5rem] p-8 border border-slate-100 dark:border-slate-700">
            <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mb-6">
              Delegation Patterns
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Delegation Detected</span>
                <span className="text-2xl font-bold text-rose-500">{stats.delegationCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Queries</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalQueries}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Articulations</span>
                <span className="text-2xl font-bold text-indigo-600">{stats.articulationCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-10 pt-4 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-5 bg-slate-900 dark:bg-indigo-600 text-white text-[12px] font-bold rounded-[1.5rem] uppercase tracking-[0.25em] hover:bg-black dark:hover:bg-indigo-500 transition-all active:scale-[0.97] shadow-xl shadow-slate-900/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
