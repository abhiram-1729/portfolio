import React from 'react';
import { Package, Gift } from 'lucide-react';

export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}

// Memoized row component for massive lists to prevent full-page re-renders
export const StockItemRow = React.memo(({ item, quantity, onChange, isFree, currentStock, mode = 'load', canWrite = true }) => {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(item.price) || 0;
  const isReturn = mode === 'return';

  const displayAmount = qty * price;
  const stockAmount = (parseFloat(currentStock) || 0) * price;

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 animate-in fade-in ${isFree ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100 group hover:border-emerald-200'}`}>
      <div className="flex flex-col flex-1">
        <span className={`text-sm font-bold ${isFree ? 'text-emerald-900' : 'text-gray-700'}`}>{item.name}</span>
        <div className="flex items-center gap-2 mt-0.5">
          {item.unit && (
            <span className="text-[10px] font-black text-gray-500 bg-white border border-gray-100 px-1.5 py-0.5 rounded uppercase tracking-tighter">
              {item.unitValue || ''} {item.unit.type}
            </span>
          )}
          {isReturn ? (
            <div className="flex gap-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase transition-colors group-hover:text-blue-600 font-mono">In Vehicle: {currentStock || 0}</span>
              <span className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">₹{stockAmount.toFixed(2)}</span>
            </div>
          ) : (
            qty > 0 && (
              <span className="text-[10px] font-bold text-emerald-600 animate-in slide-in-from-left-1 duration-200">Value: ₹{displayAmount.toFixed(2)}</span>
            )
          )}
        </div>
      </div>

      <div className="flex flex-col items-center gap-1">
        {canWrite ? (
          <input
            type="number"
            placeholder="0"
            step="any"
            min="0"
            onWheel={(e) => e.target.blur()}
            className={`w-16 bg-white border rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:ring-2 outline-none transition-all shadow-sm ${qty > (currentStock || 0) && isReturn ? 'border-rose-500 ring-2 ring-rose-500/20' : (isReturn ? 'border-gray-200 focus:ring-orange-500/20 focus:border-orange-300' : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-300')}`}
            value={quantity || ''}
            onChange={(e) => {
              const val = Math.max(0, parseFloat(e.target.value) || 0);
              onChange(item.id, val);
            }}
          />
        ) : (
          <div className="w-16 h-10 flex items-center justify-center bg-white/50 rounded-lg border border-gray-100 text-sm font-black text-gray-400">
            {quantity || 0}
          </div>
        )}
        {isReturn && qty > (currentStock || 0) && (
          <span className="text-[7px] font-black text-rose-600 uppercase animate-pulse">Exceeds Store Stock</span>
        )}
      </div>
    </div>
  );
});
