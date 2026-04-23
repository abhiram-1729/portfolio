import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Coins, ArrowRight, Info, ArrowLeft, CheckCircle2, AlertCircle, Sun, Moon, Clock } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { getCashStatus } from '../services/cashService';
import toast from 'react-hot-toast';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function OpeningCashEntry() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);

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
      const data = await getCashStatus();
      setStatus(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Status...</p>
      </div>
    </div>
  );

  const shift1 = status?.shifts?.shift1;
  const shift2 = status?.shifts?.shift2;
  const anyShiftAssigned = shift1?.openingAssigned || shift2?.openingAssigned;

  const ShiftCard = ({ shiftNum, data, icon: Icon, color }) => {
    const denominations = data?.openingDenominations;
    const isAssigned = data?.openingAssigned;

    return (
      <div className={`rounded-3xl border overflow-hidden transition-all duration-300 ${isAssigned ? `border-${color}-200 bg-white shadow-xl shadow-${color}-100/20` : 'border-slate-100 bg-slate-50 opacity-60'}`}>
        {/* Shift Header */}
        <div className={`px-5 py-3 flex items-center justify-between ${isAssigned ? `bg-${color}-500 text-white` : 'bg-slate-100 text-slate-400'}`}>
          <div className="flex items-center gap-2.5">
            <Icon size={16} className={isAssigned ? 'text-white' : 'text-slate-300'} />
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Shift {shiftNum}</h3>
            </div>
          </div>
          {isAssigned ? (
            <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-lg">
              <CheckCircle2 size={10} />
              <span className="text-[8px] font-black uppercase tracking-widest">Assigned</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-white/60 px-2.5 py-1 rounded-lg">
              <Clock size={10} className="text-slate-400" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">Pending</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="p-5">
          {isAssigned ? (
            <div className="space-y-4">
              {data.isNoService ? (
                <div className="text-center py-2 space-y-2">
                  <div className="w-10 h-10 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-100">
                    <AlertCircle size={20} />
                  </div>
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">No Service Day</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Opening Float</span>
                      <span className={`text-3xl font-black tracking-tighter text-${color}-600`}>₹{(data.openingCash || 0).toFixed(2)}</span>
                    </div>
                    <div className={`w-8 h-8 rounded-lg bg-${color}-50 flex items-center justify-center text-${color}-500 shadow-sm border border-${color}-100/50`}>
                      <Coins size={16} />
                    </div>
                  </div>

                  {/* Denomination breakdown: Small Grid */}
                  {denominations && (
                    <div className="grid grid-cols-3 gap-1.5">
                      {DENOMINATIONS.filter(d => denominations[d] > 0).map(d => (
                        <div key={d} className="bg-slate-50/80 rounded-lg p-2 text-center border border-slate-100/50">
                          <span className="text-[8px] font-black text-slate-400 block whitespace-nowrap">₹{d}</span>
                          <span className="text-[11px] font-black text-slate-700 leading-none">× {denominations[d]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-4 space-y-1.5 opacity-50 grayscale">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto border border-slate-200">
                <Clock size={20} className="text-slate-300" />
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Awaiting Assignment</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-lg mx-auto border-x border-slate-100 shadow-2xl relative">
      {/* --- STICKY HEADER --- */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-sm animate-in fade-in slide-in-from-top duration-500">
        <div className="px-4 py-3 space-y-3">
          {/* Top Row: Back, Title, Nav */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/')}
                className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-lg font-black text-slate-900 leading-tight tracking-tight">Start Day</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opening Float</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
              <button className="px-3 py-1.5 rounded-lg text-xs font-black bg-white text-emerald-600 shadow-sm uppercase tracking-tighter">
                Start
              </button>
              <button
                onClick={() => navigate('/closing-cash')}
                className="px-3 py-1.5 rounded-lg text-xs font-black text-slate-500 hover:bg-white/50 transition-all uppercase tracking-tighter"
              >
                End
              </button>
            </div>
          </div>

          {/* Active Vehicle Bar */}
          {user?.assignedVehicle && (
            <div className="bg-emerald-50/50 rounded-xl px-3 py-2 flex items-center justify-between border border-emerald-100/50">
              <div className="flex items-center gap-2">
                <Truck size={14} className="text-emerald-500" />
                <span className="text-[10px] font-black text-slate-700 uppercase">{user.assignedVehicle.vehicleNumber}</span>
              </div>
              <span className="text-[8px] font-black text-emerald-600 uppercase bg-white px-2 py-0.5 rounded-md border border-emerald-100 shadow-sm">
                {user.assignedVehicle.vehicleName || 'Standard'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT (SCROLLABLE) --- */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-4 pb-24">
          <ShiftCard shiftNum={1} data={shift1} icon={Sun} color="amber" />
          <ShiftCard shiftNum={2} data={shift2} icon={Moon} color="indigo" />

          {!anyShiftAssigned && (
            <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 text-center space-y-4 animate-in zoom-in duration-300">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-rose-500 mx-auto shadow-sm border border-rose-50">
                <AlertCircle size={28} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900 tracking-tight">Assignment Missing</h3>
                <p className="text-xs font-bold text-slate-500 max-w-[240px] mx-auto leading-relaxed">
                  Opening cash is managed by admin. Please wait for the daily float to be assigned.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-200"
              >
                Go Back
              </button>
            </div>
          )}

          {anyShiftAssigned && (
            <div className="bg-emerald-50/80 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-500">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100/50">
                <CheckCircle2 size={16} />
              </div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-tight">
                {shift1?.openingAssigned && shift2?.openingAssigned
                  ? 'Both floats assigned. Ready to start!'
                  : 'Float assigned. Check with admin for other shift.'}
              </p>
            </div>
          )}
        </div>
      </main>

      {/* --- STICKY FOOTER --- */}
      {anyShiftAssigned && (
        <footer className="sticky bottom-0 z-30 p-3 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom duration-500">
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-3 rounded-xl shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group uppercase tracking-widest"
            >
              Continue to Sales
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
