
import React from 'react';
import { Goal } from '../types';

interface GoalSelectorProps {
  onSelect: (goal: Goal) => void;
}

const goals: { label: string; value: Goal; icon: string; description: string }[] = [
  { label: 'Learn', value: 'Learn', icon: '📖', description: 'Deep conceptual understanding' },
  { label: 'Implement', value: 'Implement', icon: '🛠️', description: 'Practical execution & code' },
  { label: 'Debug', value: 'Debug', icon: '🐛', description: 'Problem solving & fixes' },
  { label: 'Explore', value: 'Explore', icon: '🚀', description: 'Broad perspectives & ideas' },
];

const GoalSelector: React.FC<GoalSelectorProps> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
      {goals.map((g) => (
        <button
          key={g.value}
          onClick={() => onSelect(g.value)}
          className="flex flex-col items-start p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition-all group text-left"
        >
          <span className="text-2xl mb-2 group-hover:scale-110 transition-transform">{g.icon}</span>
          <span className="font-semibold text-slate-900">{g.label}</span>
          <span className="text-xs text-slate-500 mt-1">{g.description}</span>
        </button>
      ))}
    </div>
  );
};

export default GoalSelector;
