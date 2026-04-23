import { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import { ArrowLeft, Search, ShoppingBag, Calendar, User, IndianRupee, Clock, ChevronRight, PackageOpen, LayoutGrid, ListFilter, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function SalesHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, COMPLETED, PENDING, CANCELLED, RETURNED
  const [timeFilter, setTimeFilter] = useState('ALL'); // ALL, TODAY, WEEK, MONTH
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await ordersAPI.getMyHistory();
      setOrders(data);
    } catch (err) {
      toast.error('Failed to load sales history');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = !search ||
      o.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      o.displayId?.toLowerCase().includes(search.toLowerCase()) ||
      o.mobile?.includes(search);

    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus ||
      (filterStatus === 'RETURNED' && ['RETURNED', 'PARTIALLY_RETURNED'].includes(o.status));

    let matchesTime = true;
    if (timeFilter !== 'ALL') {
      const orderDate = new Date(o.createdAt);
      const now = new Date();
      if (timeFilter === 'TODAY') {
        matchesTime = orderDate.toDateString() === now.toDateString();
      } else if (timeFilter === 'WEEK') {
        const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesTime = orderDate >= lastWeek;
      } else if (timeFilter === 'MONTH') {
        matchesTime = orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
      }
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header & Sticky Controls */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-emerald-100/50 pt-4 pb-2 px-4">
        <div className="max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl active:scale-90 transition-all"
              >
                <ArrowLeft size={18} strokeWidth={2.5} />
              </button>
              <h1 className="text-lg font-black text-emerald-950 tracking-tight">Sales History</h1>
            </div>
            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{filteredOrders.length} records</span>
            </div>
          </div>

          {/* Compact Search Bar */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400 group-focus-within:text-emerald-600 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by customer, ID, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-100/50 border border-transparent focus:border-emerald-500/30 focus:bg-white rounded-2xl text-xs font-bold text-emerald-950 placeholder:text-slate-400 transition-all outline-none shadow-inner"
            />
          </div>

          {/* Quick Filter Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none no-scrollbar">
            <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-full">
              {['ALL', 'TODAY', 'WEEK', 'MONTH'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeFilter(t)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${timeFilter === t
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-transparent text-slate-400'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <div className="w-[1px] h-4 bg-slate-200 self-center mx-1" />
            <div className="flex items-center gap-1 bg-white border border-slate-100 p-1 rounded-full">
              {['ALL', 'COMPLETED', 'PENDING', 'CANCELLED', 'RETURNED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${filterStatus === s
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-transparent text-slate-400'
                    }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 max-w-xl mx-auto w-full px-4 pt-4 pb-12 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-20 text-center animate-slide-up">
            <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center mb-6 border border-emerald-100/50 shadow-inner">
              <PackageOpen size={28} className="text-emerald-200" />
            </div>
            <h3 className="text-lg font-black text-emerald-950 mb-1">No Results</h3>
            <p className="text-xs font-bold text-slate-400">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => navigate(`/order-detail/${order.id}`)}
                className="group bg-white hover:bg-emerald-50/20 active:bg-emerald-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all active:scale-[0.98] shadow-sm flex items-center p-3 gap-3"
              >
                {/* Visual Accent */}
                <div className={`w-1 h-8 rounded-full ${order.status === 'COMPLETED' ? 'bg-emerald-500' :
                  order.status === 'CANCELLED' ? 'bg-red-500' :
                    order.status === 'RETURNED' || order.status === 'PARTIALLY_RETURNED' ? 'bg-amber-500' :
                      'bg-orange-400'}`} />

                {/* Main Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-emerald-950 truncate max-w-[65%] leading-tight capitalize">{order.customerName || 'Walk-in'}</h4>
                    <span className="text-sm font-black text-emerald-700 tracking-tighter">₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">#{order.displayId || 'SO-00'}</span>
                    <div className="w-1 h-1 bg-slate-200 rounded-full" />
                    <span className="text-[9px] font-black text-emerald-600/40 uppercase tracking-widest">{format(new Date(order.createdAt), 'dd MMM, hh:mm')}</span>
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-2 pl-2 border-l border-slate-50">
                  {order.paymentMode === 'UPI' ? (
                    <ShieldCheck size={14} className="text-blue-500" />
                  ) : (
                    <IndianRupee size={12} className="text-emerald-600" />
                  )}
                  <ChevronRight size={14} className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
