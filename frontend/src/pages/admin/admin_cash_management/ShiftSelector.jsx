import React from 'react';
import { Sun, Moon } from 'lucide-react';

const ShiftSelector = ({ value, onChange, disabledShifts = [] }) => (
  <div className="flex gap-2">
    {[
      { id: 1, label: 'Shift 1', sub: 'Morning', icon: Sun, color: 'amber' },
      { id: 2, label: 'Shift 2', sub: 'Afternoon', icon: Moon, color: 'indigo' },
    ].map(s => {
      const isDisabled = disabledShifts.includes(s.id);
      return (
        <button
          key={s.id}
          type="button"
          disabled={isDisabled}
          onClick={() => onChange(s.id)}
          className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${isDisabled ? 'border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50' :
            value === s.id
              ? s.color === 'amber'
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-indigo-400 bg-indigo-50 text-indigo-700'
              : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
            }`}
        >
          <s.icon size={16} />
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] font-black">{s.label}</span>
            <span className="text-[8px] font-bold opacity-60 truncate">
              {isDisabled ? 'Close S1 first' : s.sub}
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

export default ShiftSelector;
