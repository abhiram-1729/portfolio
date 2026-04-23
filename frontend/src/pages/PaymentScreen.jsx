import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { ordersAPI } from '../services/api';
import { ArrowLeft, Banknote, Smartphone, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', icon: Banknote, color: 'from-emerald-500 to-emerald-600', shadow: 'shadow-emerald-600/30' },
  { id: 'UPI', label: 'UPI', icon: Smartphone, color: 'from-orange-500 to-orange-600', shadow: 'shadow-orange-600/30' },
  { id: 'CARD', label: 'Card', icon: CreditCard, color: 'from-emerald-700 to-emerald-800', shadow: 'shadow-emerald-800/30' },
  { id: 'CASH_UPI', label: 'Cash + UPI', icon: Banknote, color: 'from-blue-500 to-blue-600', shadow: 'shadow-blue-600/30', isSplit: true },
];

export default function PaymentScreen() {
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cashReceived, setCashReceived] = useState('');
  const [splitAmounts, setSplitAmounts] = useState({ cash: '', upi: '' });
  const { items, customerMobile, customerName, clearCart, totalAmount } = useCartStore();
  const { user } = useUserStore();
  const navigate = useNavigate();

  const changeDue = (parseFloat(cashReceived) || 0) - totalAmount;

  // Auto-fill split amounts logic
  const handleSplitInput = (field, value) => {
    const numValue = parseFloat(value) || 0;
    if (field === 'cash') {
      const remaining = Math.max(0, totalAmount - numValue);
      setSplitAmounts({ cash: value, upi: remaining.toFixed(2) });
    } else {
      const remaining = Math.max(0, totalAmount - numValue);
      setSplitAmounts({ upi: value, cash: remaining.toFixed(2) });
    }
  };

  // Fix: Move navigation out of render cycle
  useEffect(() => {
    if (items.length === 0 && !loading) {
      // Only redirect if we're not currently processing a payment
      // (as handlePayment clears the cart right before success navigation)
      const timer = setTimeout(() => {
        if (window.location.pathname === '/payment') {
            navigate('/');
        }
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [items.length, navigate, loading]);

  const handlePayment = async () => {
    if (!selected) return toast.error('Please select a payment method');
    
    if (selected === 'CASH_UPI') {
      const cash = parseFloat(splitAmounts.cash) || 0;
      const upi = parseFloat(splitAmounts.upi) || 0;
      if (Math.abs((cash + upi) - totalAmount) > 0.01) {
        return toast.error(`Total must equal ₹${totalAmount.toFixed(2)}`);
      }
    }

    setLoading(true);
    try {
      // Step 1: Create order from cart
      const { data: order } = await ordersAPI.createFromCart({
        mobile: customerMobile || undefined,
        customerName: customerName || undefined,
        items: items.map(i => ({ productId: i.productId, quantity: i.quantity })),
      });

      // Step 2: Complete payment
      await ordersAPI.completePayment({
        orderId: order.id,
        paymentMode: selected,
        cashAmount: selected === 'CASH_UPI' ? parseFloat(splitAmounts.cash) : undefined,
        upiAmount: selected === 'CASH_UPI' ? parseFloat(splitAmounts.upi) : undefined,
      });

      clearCart();
      navigate(`/success/${order.id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-[calc(var(--safe-bottom)+2rem)]">
      {/* Header with Safe Area */}
      <div className="sticky top-0 z-40 px-5 pt-[calc(var(--safe-top)+0.5rem)] pb-3 flex items-center gap-4 bg-white border-b border-gray-100 max-w-lg mx-auto transition-all duration-300">
        <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl hover:bg-emerald-50 active:scale-90 transition-all bg-white shadow-sm border border-emerald-100 text-emerald-700">
          <ArrowLeft size={22} strokeWidth={2.5} />
        </button>
        <h1 className="text-xl font-black text-emerald-950 tracking-tight">Select Payment</h1>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
        {/* Amount Card */}
        <div className="glass rounded-[1.5rem] p-6 text-center bg-white/70 border-white shadow-sm relative overflow-hidden">
          {/* Decorative background blur */}
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-emerald-500/10 to-transparent blur-[40px] pointer-events-none" />
          
          <p className="text-emerald-800/40 font-black uppercase tracking-[0.2em] text-[9px] mb-2 relative z-10">Payable Amount</p>
          <p className="text-[2.5rem] font-black text-emerald-950 tracking-tighter leading-none relative z-10">₹{totalAmount.toFixed(2)}</p>
          <div className="flex flex-wrap justify-center gap-2 mt-6 relative z-10">
            {customerName && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100">
                  <span className="text-sm font-black text-emerald-900 capitalize">{customerName}</span>
              </div>
            )}
            {customerMobile && (
              <div className="inline-flex items-center gap-2 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100">
                  <Smartphone size={14} className="text-emerald-500" />
                  <span className="text-sm font-black text-emerald-900">{customerMobile}</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Options Grid */}
        <div className="space-y-4">
          <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] px-2">Choose Method</p>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_MODES.map((mode) => {
              const Icon = mode.icon;
              const isSelected = selected === mode.id;
              return (
                <button
                  key={mode.id}
                  id={`payment-${mode.id.toLowerCase()}`}
                  onClick={() => {
                    setSelected(mode.id);
                    if (mode.id !== 'CASH') setCashReceived('');
                    if (mode.id === 'CASH_UPI' && !splitAmounts.cash) {
                      setSplitAmounts({ cash: totalAmount.toFixed(2), upi: '0.00' });
                    }
                  }}
                  className={`flex flex-col items-center gap-2.5 py-4 px-1 rounded-2xl transition-all duration-300 active:scale-95 border ${
                    isSelected
                      ? `bg-gradient-to-br ${mode.color} text-white shadow-xl scale-105 border-transparent ${mode.shadow}`
                      : 'bg-white text-emerald-900/40 hover:bg-emerald-50 shadow-sm border-emerald-50 hover:border-emerald-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? 'bg-white/20 shadow-inner' : 'bg-emerald-50/50 border border-emerald-50'}`}>
                    <Icon size={isSelected ? 20 : 18} strokeWidth={isSelected ? 3 : 2.5} className={isSelected ? 'text-white drop-shadow-sm' : 'text-emerald-300'} />
                  </div>
                  <span className={`text-[0.55rem] font-black uppercase tracking-widest text-center px-1 leading-tight ${isSelected ? 'text-white' : 'text-emerald-900/40'}`}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cash Calculator Wrapper */}
        {selected === 'CASH' && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
            {/* Input & Return Display */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-[1.5rem] p-3.5 border border-emerald-100/50 shadow-sm relative group">
                <p className="text-[9px] font-black text-emerald-800/40 uppercase tracking-[0.2em] mb-1">Customer Given Cash</p>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-emerald-950">₹</span>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xl font-black text-emerald-950 bg-transparent border-none outline-none focus:ring-0 placeholder:text-emerald-100/50"
                    autoFocus
                  />
                </div>
              </div>
              <div className={`rounded-[1.5rem] p-3.5 border transition-all duration-300 shadow-sm ${changeDue >= 0 ? 'bg-orange-50 border-orange-100/50' : 'bg-slate-50 border-slate-200 opacity-50'}`}>
                <p className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${changeDue >= 0 ? 'text-orange-800/40' : 'text-slate-400'}`}>Return Amount</p>
                <div className={`text-xl font-black ${changeDue >= 0 ? 'text-orange-600' : 'text-slate-400'}`}>
                  ₹{changeDue > 0 ? changeDue.toFixed(2) : '0.00'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Split Payment Calculator */}
        {selected === 'CASH_UPI' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="grid grid-cols-2 gap-3">
              {/* Cash Portion */}
              <div className="bg-white rounded-[2rem] p-5 border border-emerald-100/50 shadow-sm hover:border-emerald-200 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg">
                    <Banknote size={14} className="text-emerald-600" />
                  </div>
                  <p className="text-[9px] font-black text-emerald-800/40 uppercase tracking-[0.2em]">Cash Amount</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-emerald-950">₹</span>
                  <input
                    type="number"
                    value={splitAmounts.cash}
                    onChange={(e) => handleSplitInput('cash', e.target.value)}
                    className="w-full text-xl font-black text-emerald-950 bg-transparent border-none outline-none focus:ring-0"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* UPI Portion */}
              <div className="bg-white rounded-[2rem] p-5 border border-orange-100/50 shadow-sm hover:border-orange-200 transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-orange-50 rounded-lg">
                    <Smartphone size={14} className="text-orange-600" />
                  </div>
                  <p className="text-[9px] font-black text-orange-800/40 uppercase tracking-[0.2em]">UPI Amount</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg font-black text-orange-950">₹</span>
                  <input
                    type="number"
                    value={splitAmounts.upi}
                    onChange={(e) => handleSplitInput('upi', e.target.value)}
                    className="w-full text-xl font-black text-orange-950 bg-transparent border-none outline-none focus:ring-0"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Total Check */}
            <div className="flex items-center justify-between px-6 py-4 bg-emerald-950 rounded-[1.5rem] shadow-xl">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-emerald-400/50 uppercase tracking-[0.2em]">Total Combined</span>
                  <span className="text-lg font-black text-white">
                    ₹{( (parseFloat(splitAmounts.cash)||0) + (parseFloat(splitAmounts.upi)||0) ).toFixed(2)}
                  </span>
               </div>
               <div className="flex items-center gap-2">
                  {Math.abs(((parseFloat(splitAmounts.cash)||0) + (parseFloat(splitAmounts.upi)||0)) - totalAmount) < 0.01 ? (
                    <div className="flex items-center gap-2 bg-emerald-400/20 text-emerald-400 px-3 py-1 rounded-full border border-emerald-400/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Balanced</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-orange-400/20 text-orange-400 px-3 py-1 rounded-full border border-orange-400/30">
                      <div className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Unbalanced</span>
                    </div>
                  )}
               </div>
            </div>
          </div>
        )}

        {/* Confirm Button */}
        <div className="pt-4 pb-8">
            <button
            id="confirm-payment-btn"
            onClick={handlePayment}
            disabled={
              !selected || 
              loading || 
              (selected === 'CASH' && (!cashReceived || parseFloat(cashReceived) < totalAmount)) ||
              (selected === 'CASH_UPI' && Math.abs(((parseFloat(splitAmounts.cash)||0) + (parseFloat(splitAmounts.upi)||0)) - totalAmount) > 0.01)
            }
            className={`w-full font-black text-lg py-5 rounded-[2rem] active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${
                !selected || loading || (selected === 'CASH' && (!cashReceived || parseFloat(cashReceived) < totalAmount)) || (selected === 'CASH_UPI' && Math.abs(((parseFloat(splitAmounts.cash)||0) + (parseFloat(splitAmounts.upi)||0)) - totalAmount) > 0.01)
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-70 shadow-none'
                : 'bg-emerald-600 text-white shadow-2xl shadow-emerald-600/30 hover:bg-emerald-700'
            }`}
            >
            <span className="relative z-10 flex items-center gap-3 uppercase text-xs tracking-[0.2em]">
                {loading ? (
                    <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                    `Complete ${selected || ''} Payment`
                )}
            </span>
            </button>
        </div>
      </div>
    </div>
  );
}
