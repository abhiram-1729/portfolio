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

  // Detailed stock context from backend
  const warehouseStock = item.warehouseStock ?? item.stock ?? 0;
  const vehicleStock = item.vehicleStock ?? 0;
  const totalStock = item.totalStock ?? (warehouseStock + vehicleStock);

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 animate-in fade-in ${isFree ? 'bg-emerald-50/50 border-emerald-100' : 'bg-gray-50 border-gray-100 group hover:border-emerald-200'}`}>
      <div className="flex flex-col flex-1">
        <span className={`text-sm font-bold ${isFree ? 'text-emerald-900' : 'text-gray-700'}`}>{item.name}</span>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Store</span>
            <span className="text-[10px] font-black text-emerald-700">{warehouseStock}</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest">Vehicles</span>
            <span className="text-[10px] font-black text-amber-700">{vehicleStock}</span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1.5">
            <span className="text-[7px] font-black text-gray-400 uppercase tracking-widest">Total</span>
            <span className="text-[10px] font-black text-gray-900">{totalStock}</span>
          </div>
          
          {isReturn && (
            <div className="flex items-center gap-2 border-l border-gray-200 pl-3 ml-1">
              <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter">In This Vehicle: {currentStock || 0}</span>
            </div>
          )}
        </div>
        {qty > 0 && !isReturn && (
          <span className="text-[9px] font-bold text-emerald-600 mt-1">Operation Value: ₹{displayAmount.toFixed(2)}</span>
        )}
      </div>

      <div className="flex flex-col items-center gap-1 ml-4">
        {canWrite ? (
          <input
            type="number"
            placeholder="0"
            step="any"
            min="0"
            onWheel={(e) => e.target.blur()}
            className={`w-16 bg-white border rounded-lg px-2 py-1.5 text-sm text-center font-bold focus:ring-2 outline-none transition-all shadow-sm ${qty > (isReturn ? (currentStock || 0) : warehouseStock) ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200 focus:ring-emerald-500/20 focus:border-emerald-300'}`}
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
        {qty > (isReturn ? (currentStock || 0) : warehouseStock) && (
          <span className="text-[7px] font-black text-rose-600 uppercase animate-pulse">
            Insufficient {isReturn ? 'Vehicle' : 'Store'} Stock
          </span>
        )}
      </div>
    </div>
  );
});
