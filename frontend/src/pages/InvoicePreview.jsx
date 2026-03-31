import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { ArrowLeft, ArrowRight, Package, Smartphone } from 'lucide-react';

export default function InvoicePreview() {
  const { items, customerMobile } = useCartStore();
  const navigate = useNavigate();
  const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totalMRP = items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0);
  const totalSavings = totalMRP - totalAmount;

  if (items.length === 0) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-[calc(var(--safe-bottom)+8rem)]">
      {/* Header */}
      <div className="glass sticky top-0 z-40 px-5 pt-[calc(var(--safe-top)+0.5rem)] pb-3 flex items-center gap-4 border-b border-emerald-100/50 max-w-lg mx-auto transition-all duration-300">
        <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl hover:bg-emerald-50 active:scale-90 transition-all bg-white shadow-sm border border-emerald-100 text-emerald-700">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-xl font-black text-emerald-950 tracking-tight">Invoice Preview</h1>
          <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mt-0.5">{items.length} units scheduled</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5">
        {/* Customer Info */}
        <div className="glass rounded-[1.5rem] p-5 shadow-sm border border-emerald-50 bg-white/70">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-3 px-1">Billed To</p>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-[1.25rem] bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                <Smartphone size={22} strokeWidth={3} />
            </div>
            <div>
                <p className="font-black text-emerald-950 text-[1.1rem] leading-none">
                    {customerMobile ? customerMobile : 'Walk-in Customer'}
                </p>
                <p className="text-[10px] font-bold text-emerald-600/50 uppercase tracking-widest mt-1.5">Direct Sale</p>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="glass rounded-[2rem] overflow-hidden shadow-sm border border-emerald-50 bg-white/70">
          <div className="px-6 py-4 border-b border-emerald-100/50 flex text-[10px] uppercase tracking-widest text-emerald-800/40 font-black bg-emerald-50/30">
            <span className="flex-1">Description</span>
            <span className="w-16 text-center">Qty</span>
            <span className="w-20 text-right">Subtotal</span>
          </div>
          <div className="divide-y divide-emerald-50">
            {items.map((item) => (
                <div key={item.productId} className="px-6 py-5 flex items-center gap-2 group hover:bg-white transition-colors">
                <div className="flex-1 min-w-0">
                    <p className="text-[0.95rem] font-black text-emerald-950 truncate leading-tight">{item.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-xs font-black text-emerald-600 tracking-tight">₹{item.price.toFixed(2)}</span>
                        {item.mrp > item.price && (
                            <span className="text-[10px] font-bold text-emerald-900/30 line-through">₹{item.mrp.toFixed(2)}</span>
                        )}
                    </div>
                </div>
                <div className="w-16 flex justify-center">
                    <span className="bg-emerald-50 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-black border border-emerald-100 shadow-inner">{item.quantity}</span>
                </div>
                <span className="w-20 text-right text-[1rem] font-black text-emerald-950 tracking-tighter">
                    ₹{(item.price * item.quantity).toFixed(2)}
                </span>
                </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div className="glass rounded-[2rem] p-8 space-y-4 shadow-sm border border-emerald-50 bg-white/70 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/20 blur-3xl rounded-full translate-x-12 -translate-y-12" />
          <div className="flex justify-between items-center text-xs font-black text-emerald-800/40 uppercase tracking-widest px-1">
            <span>Bill Subtotal</span>
            <span className="text-emerald-900/60">₹{totalMRP.toFixed(2)}</span>
          </div>
          {totalSavings > 0 && (
            <div className="flex justify-between items-center text-xs font-black text-orange-600 uppercase tracking-widest px-1">
              <span>Total Savings</span>
              <span>- ₹{totalSavings.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between items-center font-black pt-5 border-t border-emerald-100/50">
            <span className="text-xl text-emerald-950 uppercase tracking-tighter">Total Amount</span>
            <span className="text-3xl text-emerald-600 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed bottom-[calc(var(--safe-bottom)+1rem)] left-0 right-0 max-w-lg mx-auto z-30 flex gap-4 px-5 animate-slide-up">
        <button
          onClick={() => navigate(-1)}
          className="w-16 h-16 rounded-[1.5rem] bg-white text-emerald-600 font-bold active:scale-95 transition-all shadow-xl shadow-emerald-900/5 border border-emerald-100 hover:bg-emerald-50 flex items-center justify-center flex-shrink-0"
        >
          <ArrowLeft size={24} strokeWidth={3} />
        </button>
        <button
          id="proceed-to-payment"
          onClick={() => navigate('/payment')}
          className="bg-emerald-600 text-white flex-1 h-16 text-lg font-black rounded-[1.5rem] shadow-2xl shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 hover:bg-emerald-700 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative z-10 flex items-center gap-3 uppercase text-xs tracking-[0.2em]">
            Proceed to Payment <ArrowRight size={20} strokeWidth={3} />
          </span>
        </button>
      </div>
    </div>
  );
}
