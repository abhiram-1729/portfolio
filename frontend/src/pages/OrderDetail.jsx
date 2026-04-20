import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { ArrowLeft, Printer, Package, Smartphone, IndianRupee, Calendar, ShieldCheck, User, MapPin, Hash, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const { data } = await ordersAPI.getById(id);
      setOrder(data);
    } catch (err) {
      toast.error('Failed to load order details');
      navigate('/sales-history');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const totalMRP = order.items?.reduce((sum, i) => sum + (Number(i.mrp || 0) || Number(i.price || 0)) * i.quantity, 0);
  const totalSavings = totalMRP - order.totalAmount;

  const totalUnits = order.items?.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-12">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 px-5 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl active:scale-95 transition-all">
              <ArrowLeft size={20} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-lg font-black text-emerald-950 tracking-tight">Order Details</h1>
              <p className="text-[10px] font-black text-emerald-600/50 uppercase tracking-[0.2em]">#{order.displayId || order.orderNumber}</p>
            </div>
          </div>
          <button 
            onClick={() => window.print()}
            className="p-2.5 bg-slate-50 text-slate-600 rounded-2xl active:scale-95 transition-all hover:bg-slate-100"
          >
            <Printer size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
        {/* Transaction Status Card */}
        <div className="rounded-[2.5rem] p-8 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-2xl shadow-emerald-900/30 relative overflow-hidden border border-white/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 blur-[80px] rounded-full translate-x-10 -translate-y-10 animate-pulse" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-400/20 blur-[60px] rounded-full -translate-x-10 translate-y-10" />
          
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-xl border border-white/30 shadow-inner">
                   <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100 opacity-90">Payment Status</p>
                  <p className="text-xs font-bold text-white/80">{order.status === 'COMPLETED' ? 'Verified Receipt' : 'Awaiting Confirmation'}</p>
                </div>
              </div>
              
              <div className="space-y-1">
                 <div className="flex items-baseline gap-1">
                   <span className="text-xl font-bold text-emerald-100 opacity-80 italic">₹</span>
                   <p className="text-5xl font-black tracking-tighter leading-none">{order.totalAmount.toFixed(2)}</p>
                 </div>
                 <div className="flex items-center gap-2 pt-2">
                   <div className="px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">{order.paymentMode}</span>
                   </div>
                   <div className="w-1.5 h-1.5 bg-white/30 rounded-full" />
                   <span className="text-[11px] font-bold text-emerald-100/90">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</span>
                 </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-3">
              <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg backdrop-blur-xl border flex items-center gap-2 ${
                order.status === 'COMPLETED' 
                ? 'bg-white/20 border-white/40 text-white' 
                : 'bg-orange-500/20 border-orange-400/40 text-orange-100'
              }`}>
                {order.status === 'COMPLETED' && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />}
                {order.status}
              </div>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
           {/* Customer Box */}
           <div className="glass rounded-[1.5rem] p-4 bg-white border border-emerald-50 shadow-sm">
             <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mb-3">
               <User size={12} /> Customer
             </div>
             <p className="font-black text-emerald-950 text-sm leading-tight capitalize">{order.customerName || 'Walk-in'}</p>
             <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1">
               <Smartphone size={10} /> {order.mobile || 'N/A'}
             </p>
           </div>
           {/* Route Box */}
           <div className="glass rounded-[1.5rem] p-4 bg-white border border-emerald-50 shadow-sm">
             <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mb-3">
               <MapPin size={12} /> Location
             </div>
             <p className="font-black text-emerald-950 text-sm leading-tight truncate">{order.villageName || 'Unspecified'}</p>
             <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">{order.coverageType || 'TOWN'}</p>
           </div>
        </div>

        {/* Items List */}
        <div className="glass rounded-[2rem] bg-white border border-emerald-50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50/30 border-b border-emerald-100/50 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Order Summary</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100 tracking-widest">{order.items?.length} SKUs</span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 tracking-widest">{totalUnits} Units</span>
            </div>
          </div>
          <div className="divide-y divide-emerald-50">
            {order.items?.map((item, idx) => (
              <div key={idx} className="p-6 flex items-center gap-4 hover:bg-slate-50/50 transition-colors">
                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 relative group overflow-hidden">
                   {item.product?.image ? (
                     <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <Package size={24} className="text-slate-300 group-hover:text-emerald-400 transition-colors" />
                   )}
                   <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-lg border-2 border-white shadow-sm">
                     {item.quantity}
                   </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black text-emerald-950 leading-tight">{item.product?.name || 'Product Name'}</p>
                  <p className="text-[10px] font-bold text-emerald-600/60 mt-1">₹{item.price.toFixed(2)} / unit</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-950 tracking-tight">₹{(item.price * item.quantity).toFixed(2)}</p>
                  {item.mrp > item.price && (
                    <p className="text-[9px] font-bold text-orange-400 line-through tracking-tighter italic">₹{(item.mrp * item.quantity).toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Bill Calculation */}
          <div className="p-6 bg-slate-50/50 space-y-3">
             <div className="flex justify-between text-xs font-bold text-slate-500">
               <span>Subtotal (MRP)</span>
               <span className="line-through">₹{totalMRP.toFixed(2)}</span>
             </div>
             {totalSavings > 0 && (
               <div className="flex justify-between text-xs font-black text-orange-600 uppercase tracking-widest">
                 <span>Savings</span>
                 <span>- ₹{totalSavings.toFixed(2)}</span>
               </div>
             )}
             <div className="flex justify-between items-center pt-3 border-t border-emerald-100">
               <span className="text-sm font-black text-emerald-950 uppercase tracking-widest">Total Paid</span>
               <span className="text-xl font-black text-emerald-600 tracking-tighter">₹{order.totalAmount.toFixed(2)}</span>
             </div>
          </div>
        </div>

        {/* Technical Footer Info */}
        <div className="glass rounded-[1.5rem] p-6 bg-slate-100/50 border border-slate-200/50 space-y-4">
           <div className="flex items-center gap-3">
              <div className="w-1 h-10 bg-slate-300 rounded-full" />
              <div className="flex-1">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Metadata</p>
                 <div className="grid grid-cols-2 gap-y-1 mt-2">
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Hash size={8}/> ID: <span className="text-slate-700">{order.id.slice(-8).toUpperCase()}</span></div>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Calendar size={8}/> Date: <span className="text-slate-700">{format(new Date(order.createdAt), 'dd MMMM yyyy')}</span></div>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><CheckCircle2 size={8}/> Mode: <span className="text-slate-700">{order.paymentMode}</span></div>
                    <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MapPin size={8}/> Region: <span className="text-slate-700">{order.villageName || 'Default'}</span></div>
                 </div>
              </div>
           </div>
        </div>

        <button 
          onClick={() => navigate('/sales-history')}
          className="w-full py-4 bg-white text-emerald-600 text-xs font-black uppercase tracking-widest rounded-2xl border border-emerald-100 shadow-sm active:scale-[0.98] transition-all"
        >
          Back to History
        </button>
      </div>
    </div>
  );
}
