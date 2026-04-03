import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { submitClosingCash, getCashStatus } from '../services/cashService';
import toast from 'react-hot-toast';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function ClosingCashEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const [counts, setCounts] = useState(
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
  );
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [remark, setRemark] = useState('');

  useEffect(() => {
    if (!user?.assignedVehicle) {
      toast.error('No vehicle assigned. Access denied.', { id: 'no-vehicle' });
      navigate('/', { replace: true });
      return;
    }
    loadStatus();
  }, [user?.assignedVehicle, navigate]);

  const loadStatus = async () => {
    try {
      const data = await getCashStatus();
      if (!data.openingSubmitted) {
        navigate('/opening-cash', { replace: true });
        return;
      }
      setStatus(data);
    } catch (err) {
      toast.error('Failed to load cash status');
    } finally {
      setFetching(false);
    }
  };

  const handleCountChange = (denom, value) => {
    const val = value === '' ? '' : parseInt(value) || 0;
    setCounts((prev) => ({ ...prev, [denom]: val }));
  };

  const actualCash = DENOMINATIONS.reduce((sum, d) => {
    return sum + d * (counts[d] || 0);
  }, 0);

  const expectedCash = (status?.openingCash || 0) + (status?.cashSales || 0);
  const difference = actualCash - expectedCash;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (difference !== 0 && !remark.trim()) {
      toast.error('Please provide a remark for the cash difference');
      return;
    }

    setLoading(true);
    try {
      await submitClosingCash({
        vehicleId: user.assignedVehicle?.id,
        actualCash,
        denominations: counts,
        remark,
      });
      toast.success('Closing cash submitted successfully');
      navigate('/reports');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit closing cash');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10 text-center font-bold">Loading status...</div>;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-5 pb-10 relative">
      <button 
        onClick={() => navigate('/')} 
        className="absolute top-5 left-5 p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors z-10 shadow-sm"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="max-w-lg mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2 mt-8">
          <div className="inline-flex p-4 rounded-3xl bg-slate-900 shadow-xl shadow-slate-200 text-white mb-4">
            <Calculator size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">End Your Day</h1>
          <p className="text-slate-500 font-bold">Reconcile today's cash collection</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => navigate('/opening-cash')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              location.pathname === '/opening-cash'
                ? "bg-white text-emerald-600 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Start Day
          </button>
          <button
            type="button"
            onClick={() => navigate('/closing-cash')}
            className={`flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 ${
              location.pathname === '/closing-cash'
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            End Day
          </button>
        </div>

        {/* Status Overview Card */}
        <div className="glass rounded-[2rem] p-6 border border-slate-200 bg-white shadow-xl shadow-slate-200/50 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Opening Float</span>
              <span className="text-xl font-black text-slate-900">₹{status?.openingCash?.toLocaleString()}</span>
            </div>
            <div className="bg-emerald-50 p-4 rounded-2xl">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 block mb-1">Cash Sales</span>
              <span className="text-xl font-black text-emerald-600">₹{status?.cashSales?.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl text-center">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Expected Cash in Hand</span>
            <span className="text-3xl font-black text-white tracking-tighter">₹{expectedCash.toLocaleString()}</span>
          </div>
        </div>

        {/* Denominations Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-slate-100 p-4 text-slate-900 flex justify-between items-center px-6">
              <span className="font-black text-xs uppercase tracking-widest">Physical Cash Count</span>
              <span className="font-black text-xs opacity-50 uppercase tracking-widest">Actual</span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {DENOMINATIONS.map((denom) => (
                <div key={denom} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-950 font-black text-sm">
                      ₹{denom}
                    </div>
                    <span className="font-black text-slate-400">×</span>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={counts[denom]}
                      disabled={status?.closingSubmitted}
                      onChange={(e) => handleCountChange(denom, e.target.value)}
                      className={`w-24 bg-slate-50 border-2 border-transparent outline-none rounded-xl py-3 px-4 text-right font-black transition-all text-lg ${
                        status?.closingSubmitted
                          ? 'opacity-50 cursor-not-allowed text-slate-500'
                          : 'focus:border-emerald-500 focus:bg-white text-slate-950'
                      }`}
                    />
                    <div className="w-24 text-right">
                      <span className="text-xs font-black text-slate-400 block leading-none mb-1">Row Sum</span>
                      <span className="font-black text-slate-900">₹{(denom * (counts[denom] || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Reconciliation section */}
            <div className="p-6 space-y-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-1">Actual Cash Total</span>
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{actualCash.toLocaleString()}</span>
                </div>
                {difference === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100">
                    <CheckCircle2 size={18} />
                    <span className="text-xs font-black uppercase">Matched</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${difference > 0 ? 'text-blue-600 bg-blue-50 border-blue-100' : 'text-rose-600 bg-rose-50 border-rose-100'}`}>
                    <AlertCircle size={18} />
                    <span className="text-xs font-black uppercase">
                      {difference > 0 ? `Extra: ₹${difference}` : `Short: ₹${Math.abs(difference)}`}
                    </span>
                  </div>
                )}
              </div>

              {difference !== 0 && (
                <div className="space-y-2 pt-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-rose-600 block pl-1">
                    Explain the difference (Required)
                  </label>
                  <textarea
                    placeholder="Enter reason for difference..."
                    value={remark}
                    disabled={status?.closingSubmitted}
                    onChange={(e) => setRemark(e.target.value)}
                    className={`w-full border-2 outline-none rounded-2xl p-4 font-bold transition-all h-24 ${
                      status?.closingSubmitted
                        ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed opacity-70'
                        : 'bg-rose-50/50 border-rose-100 focus:border-rose-300 focus:bg-white text-slate-900 placeholder:text-rose-300'
                    }`}
                  />
                </div>
              )}
            </div>
          </div>

          <button
            type={status?.closingSubmitted ? "button" : "submit"}
            disabled={loading || status?.closingSubmitted}
            className="w-full bg-slate-900 hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black text-xl py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
          >
            {status?.closingSubmitted ? 'Already Submitted for Today' : (
              loading ? 'Submitting...' : (
                <>
                  Submit Closing Report
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </>
              )
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
