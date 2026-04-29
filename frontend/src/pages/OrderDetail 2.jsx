import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../services/api';
import { ArrowLeft, Printer, Package, Smartphone, IndianRupee, Calendar, ShieldCheck, User, MapPin, Hash, CheckCircle2, Edit3, Trash2, RotateCcw, XCircle, Minus, Plus, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  // Edit state
  const [editingItem, setEditingItem] = useState(null);
  const [editQty, setEditQty] = useState(1);
  // Return state
  const [returningItem, setReturningItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  // Cancel state
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => { fetchOrderDetails(); }, [id]);

  const fetchOrderDetails = async () => {
    try {
      const { data } = await ordersAPI.getById(id);
      setOrder(data);
    } catch (err) {
      toast.error('Failed to load order details');
      navigate('/sales-history');
    } finally { setLoading(false); }
  };

  const canEdit = order && !['CANCELLED', 'RETURNED'].includes(order.status);

  const handleEditQty = async () => {
    if (!editingItem || editQty < 1) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.editItem(order.id, editingItem.id, { quantity: editQty });
      setOrder(data);
      setEditingItem(null);
      toast.success('Quantity updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setActionLoading(false); }
  };

  const handleRemoveItem = async (itemId) => {
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.removeItem(order.id, itemId);
      setOrder(data);
      toast.success('Item removed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove');
    } finally { setActionLoading(false); }
  };

  const handleReturn = async () => {
    if (!returningItem || returnQty < 1) return;
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.returnItems(order.id, {
        items: [{ orderItemId: returningItem.id, returnQty }],
        reason: returnReason || undefined
      });
      setOrder(data);
      setReturningItem(null);
      setReturnReason('');
      toast.success('Return processed');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to return');
    } finally { setActionLoading(false); }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      const { data } = await ordersAPI.cancelOrder(order.id, { reason: cancelReason || undefined });
      setOrder(data);
      setShowCancelConfirm(false);
      toast.success('Order cancelled');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel');
    } finally { setActionLoading(false); }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!order) return null;

  const totalMRP = order.items?.reduce((sum, i) => sum + (Number(i.mrp || 0) || Number(i.price || 0)) * i.quantity, 0);
  const totalSavings = totalMRP - order.totalAmount;
  const totalUnits = order.items?.reduce((sum, i) => sum + i.quantity, 0);
  const totalReturned = order.returns?.reduce((sum, r) => sum + r.returnAmount, 0) || 0;

  const statusColor = {
    COMPLETED: 'bg-emerald-500', PENDING: 'bg-orange-400', CANCELLED: 'bg-red-500',
    RETURNED: 'bg-red-400', PARTIALLY_RETURNED: 'bg-amber-500'
  }[order.status] || 'bg-slate-400';

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
          <button onClick={() => window.print()} className="p-2.5 bg-slate-50 text-slate-600 rounded-2xl active:scale-95 transition-all hover:bg-slate-100">
            <Printer size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
        {/* Status Card */}
        <div className="rounded-[2.5rem] p-8 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-2xl shadow-emerald-900/30 relative overflow-hidden border border-white/20">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/20 blur-[80px] rounded-full translate-x-10 -translate-y-10 animate-pulse" />
          <div className="relative z-10 flex justify-between items-start">
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-xl border border-white/30 shadow-inner">
                  <ShieldCheck size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100 opacity-90">Payment Status</p>
                  <p className="text-xs font-bold text-white/80">{order.status === 'COMPLETED' ? 'Verified Receipt' : order.status}</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-emerald-100 opacity-80 italic">₹</span>
                  <p className="text-5xl font-black tracking-tighter leading-none">{order.totalAmount.toFixed(2)}</p>
                </div>
                {totalReturned > 0 && (
                  <p className="text-xs font-bold text-red-200 mt-1">Returns: -₹{totalReturned.toFixed(2)}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  <div className="px-2.5 py-1 bg-white/10 rounded-lg backdrop-blur-md border border-white/10">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-50">{order.paymentMode}</span>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-100/90">{format(new Date(order.createdAt), 'dd MMM, hh:mm a')}</span>
                </div>
              </div>
            </div>
            <div className={`px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg backdrop-blur-xl border border-white/40 text-white ${statusColor}`}>
              {order.status}
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="glass rounded-[1.5rem] p-4 bg-white border border-emerald-50 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mb-3"><User size={12} /> Customer</div>
            <p className="font-black text-emerald-950 text-sm leading-tight capitalize">{order.customerName || 'Walk-in'}</p>
            <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1"><Smartphone size={10} /> {order.mobile || 'N/A'}</p>
          </div>
          <div className="glass rounded-[1.5rem] p-4 bg-white border border-emerald-50 shadow-sm">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600/50 uppercase tracking-widest mb-3"><MapPin size={12} /> Location</div>
            <p className="font-black text-emerald-950 text-sm leading-tight truncate">{order.villageName || 'Unspecified'}</p>
            <p className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest mt-1">{order.coverageType || 'TOWN'}</p>
          </div>
        </div>

        {/* Items List with Actions */}
        <div className="glass rounded-[2rem] bg-white border border-emerald-50 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-emerald-50/30 border-b border-emerald-100/50 flex justify-between items-center">
            <span className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Order Items</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{order.items?.length} SKUs</span>
              <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{totalUnits} Units</span>
            </div>
          </div>
          <div className="divide-y divide-emerald-50">
            {order.items?.map((item, idx) => (
              <div key={idx} className="p-5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 relative overflow-hidden shrink-0">
                    {item.product?.image ? <img src={item.product.image} alt="" className="w-full h-full object-cover" /> : <Package size={24} className="text-slate-300" />}
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-lg border-2 border-white shadow-sm">{item.quantity}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-emerald-950 leading-tight truncate">{item.product?.name || 'Product'}</p>
                    <p className="text-[10px] font-bold text-emerald-600/60 mt-1">₹{item.price.toFixed(2)} / unit</p>
                    {item.returnedQty > 0 && (
                      <p className="text-[9px] font-black text-red-500 mt-0.5 flex items-center gap-1"><RotateCcw size={8} /> {item.returnedQty} returned</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-emerald-950">₹{(item.price * item.quantity).toFixed(2)}</p>
                    {item.mrp > item.price && <p className="text-[9px] font-bold text-orange-400 line-through">₹{(item.mrp * item.quantity).toFixed(2)}</p>}
                  </div>
                </div>

                {/* Action Buttons */}
                {canEdit && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-emerald-50">
                    <button onClick={() => { setEditingItem(item); setEditQty(item.quantity); }} className="flex items-center gap-1 px-3 py-1.5 bg-sky-50 text-sky-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-sky-100 transition-all">
                      <Edit3 size={10} /> Edit Qty
                    </button>
                    {item.returnableQty > 0 && (
                      <button onClick={() => { setReturningItem(item); setReturnQty(1); }} className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all">
                        <RotateCcw size={10} /> Return
                      </button>
                    )}
                    {order.items.length > 1 && (
                      <button onClick={() => { if (confirm('Remove this item?')) handleRemoveItem(item.id); }} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-500 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-100 transition-all ml-auto">
                        <Trash2 size={10} /> Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bill */}
          <div className="p-6 bg-slate-50/50 space-y-3">
            <div className="flex justify-between text-xs font-bold text-slate-500"><span>Subtotal (MRP)</span><span className="line-through">₹{totalMRP.toFixed(2)}</span></div>
            {totalSavings > 0 && <div className="flex justify-between text-xs font-black text-orange-600 uppercase tracking-widest"><span>Savings</span><span>- ₹{totalSavings.toFixed(2)}</span></div>}
            {totalReturned > 0 && <div className="flex justify-between text-xs font-black text-red-500 uppercase tracking-widest"><span>Returns</span><span>- ₹{totalReturned.toFixed(2)}</span></div>}
            <div className="flex justify-between items-center pt-3 border-t border-emerald-100">
              <span className="text-sm font-black text-emerald-950 uppercase tracking-widest">Total</span>
              <span className="text-xl font-black text-emerald-600 tracking-tighter">₹{order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Returns History */}
        {order.returns?.length > 0 && (
          <div className="glass rounded-[1.5rem] bg-red-50/50 border border-red-100/50 p-5 space-y-3">
            <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest flex items-center gap-2"><RotateCcw size={12} /> Return History</p>
            {order.returns.map((r, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-red-100/30 last:border-0">
                <div>
                  <p className="text-xs font-black text-red-800">Qty: {r.returnQty} • ₹{r.returnAmount.toFixed(2)}</p>
                  {r.reason && <p className="text-[9px] font-bold text-red-500/70 mt-0.5">{r.reason}</p>}
                </div>
                <span className="text-[9px] font-bold text-red-400">{format(new Date(r.createdAt), 'dd MMM, hh:mm a')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cancel Order Button */}
        {canEdit && (
          <button onClick={() => setShowCancelConfirm(true)} className="w-full py-4 bg-red-50 text-red-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-red-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-center gap-2">
            <XCircle size={16} /> Cancel Entire Order
          </button>
        )}

        {/* Metadata */}
        <div className="glass rounded-[1.5rem] p-6 bg-slate-100/50 border border-slate-200/50 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 bg-slate-300 rounded-full" />
            <div className="flex-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Metadata</p>
              <div className="grid grid-cols-2 gap-y-1 mt-2">
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Hash size={8} /> ID: <span className="text-slate-700">{order.id.slice(-8).toUpperCase()}</span></div>
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><Calendar size={8} /> {format(new Date(order.createdAt), 'dd MMMM yyyy')}</div>
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><CheckCircle2 size={8} /> {order.paymentMode}</div>
                <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1"><MapPin size={8} /> {order.villageName || 'Default'}</div>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => navigate('/sales-history')} className="w-full py-4 bg-white text-emerald-600 text-xs font-black uppercase tracking-widest rounded-2xl border border-emerald-100 shadow-sm active:scale-[0.98] transition-all">
          Back to History
        </button>
      </div>

      {/* ── EDIT QTY MODAL ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setEditingItem(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-emerald-950 uppercase tracking-widest">Edit Quantity</h3>
            <p className="text-xs font-bold text-slate-500">{editingItem.product?.name}</p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setEditQty(Math.max(1, editQty - 1))} className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Minus size={20} /></button>
              <input type="number" value={editQty} onChange={e => setEditQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-20 text-center text-2xl font-black text-emerald-950 bg-slate-50 rounded-2xl py-3 border border-slate-100 outline-none" />
              <button onClick={() => setEditQty(editQty + 1)} className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Plus size={20} /></button>
            </div>
            <button onClick={handleEditQty} disabled={actionLoading} className="w-full py-4 bg-emerald-600 text-white font-black text-sm rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />} Confirm
            </button>
          </div>
        </div>
      )}

      {/* ── RETURN MODAL ── */}
      {returningItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setReturningItem(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest flex items-center gap-2"><RotateCcw size={14} /> Return Item</h3>
            <p className="text-xs font-bold text-slate-500">{returningItem.product?.name} • Max returnable: {returningItem.returnableQty}</p>
            <div className="flex items-center justify-center gap-4">
              <button onClick={() => setReturnQty(Math.max(1, returnQty - 1))} className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Minus size={20} /></button>
              <input type="number" value={returnQty} onChange={e => setReturnQty(Math.min(returningItem.returnableQty, Math.max(1, parseInt(e.target.value) || 1)))} className="w-20 text-center text-2xl font-black text-amber-800 bg-amber-50 rounded-2xl py-3 border border-amber-100 outline-none" />
              <button onClick={() => setReturnQty(Math.min(returningItem.returnableQty, returnQty + 1))} className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center active:scale-90 transition-all"><Plus size={20} /></button>
            </div>
            <p className="text-center text-xs font-black text-red-500">Refund: ₹{(returnQty * returningItem.price).toFixed(2)}</p>
            <input type="text" placeholder="Reason (optional)" value={returnReason} onChange={e => setReturnReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" />
            <button onClick={handleReturn} disabled={actionLoading} className="w-full py-4 bg-amber-500 text-white font-black text-sm rounded-2xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <RotateCcw size={16} />} Process Return
            </button>
          </div>
        </div>
      )}

      {/* ── CANCEL CONFIRM MODAL ── */}
      {showCancelConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end justify-center" onClick={() => setShowCancelConfirm(false)}>
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] p-6 space-y-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center"><AlertTriangle size={24} /></div>
              <div>
                <h3 className="text-sm font-black text-red-600 uppercase tracking-widest">Cancel Order</h3>
                <p className="text-[10px] font-bold text-slate-400">This will restore all stock and reverse payments</p>
              </div>
            </div>
            <input type="text" placeholder="Cancellation reason..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} className="w-full px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 outline-none placeholder:text-slate-300" />
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowCancelConfirm(false)} className="py-4 bg-slate-100 text-slate-600 font-black text-xs uppercase rounded-2xl">Keep Order</button>
              <button onClick={handleCancel} disabled={actionLoading} className="py-4 bg-red-500 text-white font-black text-xs uppercase rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />} Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
