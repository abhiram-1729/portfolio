import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Coins, ArrowRight, Info, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { submitOpeningCash, getCashStatus } from '../services/cashService';
import toast from 'react-hot-toast';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function OpeningCashEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const [counts, setCounts] = useState(
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {})
  );
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [openingSubmitted, setOpeningSubmitted] = useState(false);

  useEffect(() => {
    if (!user?.assignedVehicle) {
      toast.error('No vehicle assigned. Access denied.', { id: 'no-vehicle' });
      navigate('/', { replace: true });
      return;
    }
    checkStatus();
  }, [user?.assignedVehicle, navigate]);

  const checkStatus = async () => {
    try {
      const status = await getCashStatus();
      if (status.openingSubmitted) {
        setOpeningSubmitted(true);
        if (status.openingDenominations) {
          setCounts(status.openingDenominations);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChecking(false);
    }
  };

  const handleCountChange = (denom, value) => {
    const val = value === '' ? '' : parseInt(value) || 0;
    setCounts((prev) => ({ ...prev, [denom]: val }));
  };

  const totalAmount = DENOMINATIONS.reduce((sum, d) => {
    return sum + d * (counts[d] || 0);
  }, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (totalAmount <= 0) {
      toast.error('Total opening cash must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      await submitOpeningCash({
        vehicleId: user.assignedVehicle?.id,
        denominations: counts,
        totalOpeningCash: totalAmount,
      });
      toast.success('Opening cash submitted successfully');
      setOpeningSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit opening cash');
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-5 pb-10 relative">
      {openingSubmitted && (
        <button 
          onClick={() => navigate('/')} 
          className="absolute top-5 left-5 p-2 bg-white rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors z-10 shadow-sm"
        >
          <ArrowLeft size={20} />
        </button>
      )}

      <div className="max-w-lg mx-auto w-full space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-2 mt-8">
          <div className="inline-flex p-4 rounded-3xl bg-emerald-600 shadow-xl shadow-emerald-200 text-white mb-4">
            <Coins size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Start Your Day</h1>
          <p className="text-slate-500 font-bold">Please record your opening cash float</p>
        </div>

        {/* Tab Navigation */}
        {openingSubmitted && (
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
        )}

        {/* Vehicle Info Card */}
        {user?.assignedVehicle && (
          <div className="glass rounded-3xl p-5 border border-emerald-100 bg-white/70 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Truck size={24} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600/40 leading-none mb-1.5">Active Vehicle</p>
                <p className="text-lg font-black text-slate-900 leading-none">{user.assignedVehicle.vehicleNumber}</p>
              </div>
            </div>
            <div className="bg-emerald-500/10 px-3 py-1.5 rounded-full">
              <span className="text-[10px] font-black text-emerald-700 uppercase">{user.assignedVehicle.vehicleName || 'Standard'}</span>
            </div>
          </div>
        )}

        {/* Denomination Table */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="glass rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex justify-between items-center">
              <span className="font-black text-sm uppercase tracking-widest">Denominations</span>
              <span className="font-black text-xs opacity-50 uppercase tracking-widest">Counts</span>
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
                      disabled={openingSubmitted}
                      onChange={(e) => handleCountChange(denom, e.target.value)}
                      className={`w-24 bg-slate-50 border-2 border-transparent outline-none rounded-xl py-3 px-4 text-right font-black transition-all text-lg ${
                        openingSubmitted
                          ? 'opacity-50 cursor-not-allowed text-slate-500' 
                          : 'focus:border-emerald-500 focus:bg-white text-slate-950'
                      }`}
                    />
                    <div className="w-24 text-right">
                      <span className="text-xs font-black text-slate-400 block leading-none mb-1">Total</span>
                      <span className="font-black text-slate-900">₹{(denom * (counts[denom] || 0)).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Final Total Section */}
            <div className="bg-emerald-50 p-6 flex items-center justify-between border-t border-emerald-100">
              <div>
                <span className="text-xs font-black text-emerald-800/40 uppercase tracking-widest block mb-1">Total Float Amount</span>
                <span className="text-3xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-emerald-100 text-emerald-600">
                <Info size={20} />
              </div>
            </div>
          </div>

          {openingSubmitted ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
                <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-emerald-800">The daily opening float has been assigned and confirmed by the administrator.</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/', { replace: true })}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl py-5 rounded-[1.5rem] shadow-xl shadow-emerald-200 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                Continue to Sales
                <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          ) : (
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-10 text-center space-y-4 shadow-xl shadow-rose-200/20">
               <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-rose-500 mx-auto shadow-sm border border-rose-50">
                  <Info size={32} strokeWidth={2.5} />
               </div>
               <h3 className="text-xl font-black text-slate-900 tracking-tight">Access Restricted</h3>
               <p className="text-sm font-bold text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                  Opening cash entry is now managed by the administrator. Please wait for the daily float to be assigned.
               </p>
               <button 
                type="button"
                onClick={() => navigate('/')}
                className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest"
               >
                 Go Back
               </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
