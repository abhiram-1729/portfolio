import React from 'react';
import { 
  CheckCircle2, AlertCircle, AlertTriangle, Clock, X 
} from 'lucide-react';

const ShiftStatusBadge = ({ opening, closing }) => {
  if (closing) {
    if (closing.isNoService) return (
      <div className="flex items-center gap-1 text-rose-600">
        <AlertTriangle size={12} />
        <span className="text-[9px] font-black uppercase tracking-widest">No Service</span>
      </div>
    );

    if (closing.status === 'PENDING') return (
      <div className="flex items-center gap-1 text-orange-600">
        <Clock size={12} className="animate-pulse" />
        <span className="text-[9px] font-black uppercase tracking-widest">Pending Review</span>
      </div>
    );

    if (closing.status === 'REJECTED') return (
      <div className="flex items-center gap-1 text-rose-600">
        <X size={12} strokeWidth={3} />
        <span className="text-[9px] font-black uppercase tracking-widest">Rejected</span>
      </div>
    );

    const diff = closing.difference || 0;
    if (diff === 0) return (
      <div className="flex items-center gap-1 text-emerald-600">
        <CheckCircle2 size={12} />
        <span className="text-[9px] font-black uppercase tracking-widest">Matched</span>
      </div>
    );
    return (
      <div className="flex items-center gap-1 text-rose-600">
        <AlertCircle size={12} />
        <span className="text-[9px] font-black uppercase tracking-widest">
          {diff > 0 ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}
        </span>
      </div>
    );
  }
  if (opening) return (
    <div className="flex items-center gap-1">
      <Clock size={12} className="text-orange-500" />
      <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Open</span>
    </div>
  );
  return <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Not Assigned</span>;
};

export default ShiftStatusBadge;
