import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsAPI } from '../services/api';
import { useUserStore } from '../store/userStore';
import { ArrowLeft, TrendingUp, ShoppingBag, Banknote, Smartphone, CreditCard, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Reports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isToday, setIsToday] = useState(true);
  const { user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchReport();
  }, [selectedDate]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const isTodayDate = selectedDate === today;
      setIsToday(isTodayDate);

      const { data } = isTodayDate
        ? await reportsAPI.today({ agentId: user?.id })
        : await reportsAPI.byDate({ date: selectedDate, agentId: user?.id });

      setReport(data);
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="glass rounded-[2rem] p-6 flex items-center gap-5 bg-white/70 border border-white shadow-sm relative overflow-hidden group hover:bg-white transition-all duration-300">
      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
        <Icon size={26} className="text-white drop-shadow-md" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] mb-1">{label}</p>
        <p className="font-black text-emerald-950 text-2xl tracking-tighter">{value}</p>
      </div>
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full translate-x-12 -translate-y-12" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-[calc(var(--safe-bottom)+2rem)]">

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
        {/* Date Selector */}
        <div className="glass rounded-[1.5rem] p-1.5 flex items-center gap-3 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
          <div className="bg-emerald-50 p-2.5 rounded-xl text-emerald-500 ml-1">
            <Calendar size={20} strokeWidth={2.5} />
          </div>
          <input
            id="report-date-picker"
            type="date"
            value={selectedDate}
            max={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-transparent outline-none text-emerald-950 font-black text-[0.95rem] py-2"
          />
          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-md shadow-emerald-600/20 mr-1"
          >
            Today
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="glass rounded-[2rem] p-8 h-28 animate-pulse bg-white/50 border border-emerald-50" />
            ))}
          </div>
        ) : report ? (
          <div className="space-y-4 animate-slide-up">
            {/* Target Progress Bar */}
            <div className="glass rounded-[2rem] p-6 bg-white/70 border border-emerald-100 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-end mb-4 px-1">
                <div>
                  <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] mb-1">Daily Sales Goal</p>
                  <p className="font-black text-emerald-950 text-xl tracking-tighter">
                    ₹{report.totalSales?.toFixed(2)} <span className="text-emerald-800/30 font-bold text-sm">/ ₹{report.dailyTarget?.toLocaleString()}</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xl font-black tracking-tighter ${report.totalSales >= report.dailyTarget ? 'text-emerald-600' : 'text-orange-500'}`}>
                    {Math.round((report.totalSales / report.dailyTarget) * 100)}%
                  </span>
                </div>
              </div>
              <div className="h-4 bg-emerald-100/50 rounded-full overflow-hidden p-1 shadow-inner border border-emerald-50">
                <div
                  className={`h-full rounded-full transition-all duration-1000 cubic-bezier(0.16, 1, 0.3, 1) shadow-sm ${report.totalSales >= report.dailyTarget
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : 'bg-gradient-to-r from-orange-400 to-orange-500'
                    }`}
                  style={{ width: `${Math.min((report.totalSales / report.dailyTarget) * 100, 100)}%` }}
                />
              </div>
              {report.totalSales >= report.dailyTarget && (
                <div className="mt-3 flex items-center gap-2 px-1 animate-bounce-subtle">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Target Achieved!</span>
                </div>
              )}
            </div>

            <StatCard
              icon={ShoppingBag}
              label="Orders Processed"
              value={report.totalOrders}
              color="from-emerald-500 to-emerald-600 shadow-emerald-500/20"
            />
            <StatCard
              icon={TrendingUp}
              label="Revenue Generated"
              value={`₹${report.totalSales?.toFixed(2) || '0.00'}`}
              color="from-orange-500 to-orange-600 shadow-orange-500/20"
            />
            <StatCard
              icon={Banknote}
              label="Net Profit Generated"
              value={`₹${report.totalProfit?.toFixed(2) || '0.00'}`}
              color="from-amber-400 to-yellow-500 shadow-amber-400/20"
            />

            <div className="glass rounded-[2.5rem] p-8 bg-white/70 border border-emerald-50 shadow-sm">
              <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.2em] mb-6 px-1">Channel Breakdown</p>
              <div className="space-y-5">
                {[
                  { label: 'Cash Sales', value: report.paymentBreakdown?.cash, icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Digital UPI', value: report.paymentBreakdown?.upi, icon: Smartphone, color: 'text-orange-500', bg: 'bg-orange-50', border: 'border-orange-100' },
                  { label: 'Card Swipe', value: report.paymentBreakdown?.card, icon: CreditCard, color: 'text-emerald-700', bg: 'bg-indigo-50/30', border: 'border-indigo-100/30' },
                ].map(({ label, value, icon: Icon, color, bg, border }) => (
                  <div key={label} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${bg} ${border} border flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                        <Icon size={20} className={color} strokeWidth={3} />
                      </div>
                      <span className="text-[0.95rem] font-black text-emerald-950/60 uppercase tracking-tight">{label}</span>
                    </div>
                    <span className="font-black text-emerald-950 text-lg tracking-tighter">₹{value?.toFixed(2) || '0.00'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-emerald-800/20 gap-4">
            <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
              <TrendingUp size={40} strokeWidth={1.5} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em]">No Activity Found</p>
          </div>
        )}
      </div>
    </div>
  );
}
