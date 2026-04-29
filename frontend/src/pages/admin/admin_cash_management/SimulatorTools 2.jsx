import React from 'react';
import { Clock } from 'lucide-react';

const SimulatorTools = ({ resetStoreCashRegister, fetchStoreRegister, date, setDate, toast }) => {
  return (
    <div className="flex items-center gap-3 mb-6 bg-slate-900/5 p-4 rounded-[2rem] border border-slate-200 border-dashed">
      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
        <Clock size={20} />
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Simulator Tools</h4>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">Test your safe transition workflow</p>
      </div>
      <div className="ml-auto flex gap-2">
        <button
          onClick={async () => {
            try {
              await resetStoreCashRegister(date);
              toast.success('Safe reset for today');
              fetchStoreRegister();
            } catch (e) {
              toast.error('Failed to reset safe');
            }
          }}
          className="px-4 py-2 bg-rose-100 text-rose-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-rose-200 transition-all border border-rose-200"
        >
          Reset Today
        </button>
        <button
          onClick={() => {
            const tomorrow = new Date(date);
            tomorrow.setDate(tomorrow.getDate() + 1);
            setDate(new Date(tomorrow).toISOString().split('T')[0]);
            toast.success('Jumped to Tomorrow');
          }}
          className="px-4 py-2 bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-200 transition-all border border-emerald-200"
        >
          Jump to Next Day
        </button>
        <button
          onClick={() => {
            const yesterday = new Date(date);
            yesterday.setDate(yesterday.getDate() - 1);
            setDate(new Date(yesterday).toISOString().split('T')[0]);
            toast.success('Jumped to Yesterday');
          }}
          className="px-4 py-2 bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-amber-200 transition-all border border-amber-200"
        >
          Back to Yesterday
        </button>
      </div>
    </div>
  );
};

export default SimulatorTools;
