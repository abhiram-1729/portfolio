import React from 'react';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const DenominationGrid = ({ denominations, label }) => {
  if (!denominations || Object.keys(denominations).length === 0) return null;
  const nonZero = denominationsList.filter(d => denominations[d] > 0);
  if (nonZero.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="grid grid-cols-3 gap-1.5">
        {nonZero.map(d => (
          <div key={d} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
            <span className="text-[9px] font-black text-gray-400 block">₹{d}</span>
            <span className="text-xs font-black text-gray-700">× {denominations[d]}</span>
            <span className="text-[8px] text-gray-400 block">= ₹{(d * denominations[d]).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DenominationGrid;
