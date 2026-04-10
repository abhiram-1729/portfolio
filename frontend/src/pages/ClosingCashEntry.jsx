import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Sun, Moon, Lock } from 'lucide-react';
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
  const [activeShift, setActiveShift] = useState(1);

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
      setStatus(data);

      // Auto-select the correct shift to close
      const s1 = data?.shifts?.shift1;
      const s2 = data?.shifts?.shift2;

      if (s1?.openingAssigned && !s1?.closingSubmitted) {
        setActiveShift(1);
      } else if (s1?.closingSubmitted && s2?.openingAssigned && !s2?.closingSubmitted) {
        setActiveShift(2);
      } else if (!s1?.openingAssigned && s2?.openingAssigned) {
        setActiveShift(2);
      }
    } catch (err) {
      toast.error('Failed to load cash status');
    } finally {
      setFetching(false);
    }
  };

  const handleCountChange = (denom, value) => {
    const val = value === '' ? '' : Math.max(0, parseInt(value) || 0);
    setCounts((prev) => ({ ...prev, [denom]: val }));
  };

  const actualCash = DENOMINATIONS.reduce((sum, d) => {
    return sum + d * (counts[d] || 0);
  }, 0);

  const currentShift = activeShift === 1 ? status?.shifts?.shift1 : status?.shifts?.shift2;
  const shift1 = status?.shifts?.shift1;
  const shift2 = status?.shifts?.shift2;

  // Calculate expected based on THIS shift's own data (independent)
  const shiftOpening = currentShift?.openingCash || 0;
  const shiftSales = currentShift?.cashSales || 0;
  const shiftExpenses = currentShift?.expenses || 0;
  const expectedCash = shiftOpening + shiftSales - shiftExpenses;
  const difference = actualCash - expectedCash;

  const canCloseShift2 = shift1?.closingSubmitted || !shift1?.openingAssigned;
  const isCurrentShiftClosed = currentShift?.closingSubmitted;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (difference !== 0 && !remark.trim()) {
      toast.error('Please provide a remark for the cash difference');
      return;
    }

    setLoading(true);
    try {
      await submitClosingCash({
        vehicleId: user.assignedVehicle?.id || user.assignedVehicleId,
        actualCash,
        denominations: counts,
        remark,
        shift: activeShift,
      });
      toast.success(`Shift ${activeShift} closing submitted successfully`);
      
      // If shift 1 just closed and shift 2 is assigned, switch to shift 2
      if (activeShift === 1 && shift2?.openingAssigned) {
        setCounts(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
        setRemark('');
        loadStatus();
      } else {
        navigate('/reports');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit closing cash');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <div className="p-10 text-center font-bold">Loading status...</div>;

  const anyOpening = shift1?.openingAssigned || shift2?.openingAssigned;

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
          <p className="text-slate-500 font-bold">Reconcile cash for each shift</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => navigate('/opening-cash')}
            className="flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-700 transition-all duration-200"
          >
            Start Day
          </button>
          <button
            type="button"
            className="flex-1 py-3 px-2 rounded-xl text-xs font-black uppercase tracking-wider bg-white text-slate-900 shadow-sm"
          >
            End Day
          </button>
        </div>

        {!anyOpening ? (
          <div className="glass rounded-[2rem] p-10 border border-rose-100 bg-white shadow-xl shadow-rose-200/20 text-center space-y-6">
            <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center text-rose-500 mx-auto border border-rose-100 shadow-inner">
              <AlertCircle size={40} strokeWidth={2.5} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Assignment Missing</h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed max-w-[280px] mx-auto">
                No opening float has been assigned by the admin. Please contact your supervisor.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95 hover:bg-black"
            >
              Back to Sales
            </button>
          </div>
        ) : (
          <>
            {/* Shift Selector */}
            <div className="flex gap-3">
              {[
                { id: 1, label: 'Shift 1', sub: 'Morning', icon: Sun, color: 'amber', data: shift1 },
                { id: 2, label: 'Shift 2', sub: 'Afternoon', icon: Moon, color: 'indigo', data: shift2 },
              ].map(s => {
                const isAssigned = s.data?.openingAssigned;
                const isClosed = s.data?.closingSubmitted;
                const isLocked = s.id === 2 && !canCloseShift2;
                const isActive = activeShift === s.id;
                
                return (
                  <button
                    key={s.id}
                    type="button"
                    disabled={!isAssigned || isLocked}
                    onClick={() => {
                      if (isAssigned && !isLocked) {
                        setActiveShift(s.id);
                        setCounts(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
                        setRemark('');
                      }
                    }}
                    className={`flex-1 flex items-center gap-3 p-4 rounded-2xl border-2 transition-all ${
                      isActive
                        ? s.color === 'amber'
                          ? 'border-amber-400 bg-amber-50'
                          : 'border-indigo-400 bg-indigo-50'
                        : !isAssigned || isLocked
                          ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                          : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isClosed ? 'bg-emerald-100 text-emerald-600' :
                      isActive ? (s.color === 'amber' ? 'bg-amber-200 text-amber-700' : 'bg-indigo-200 text-indigo-700') :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {isClosed ? <CheckCircle2 size={18} /> : isLocked ? <Lock size={18} /> : <s.icon size={18} />}
                    </div>
                    <div className="text-left">
                      <span className={`text-[10px] font-black block ${
                        isClosed ? 'text-emerald-600' : isActive ? (s.color === 'amber' ? 'text-amber-700' : 'text-indigo-700') : 'text-gray-400'
                      }`}>
                        {s.label}
                      </span>
                      <span className="text-[8px] font-bold text-gray-400 uppercase">
                        {isClosed ? 'Submitted' : !isAssigned ? 'Not assigned' : isLocked ? 'Close S1 first' : s.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Status Overview Card */}
            <div className="glass rounded-[2rem] p-6 border border-slate-200 bg-white shadow-xl shadow-slate-200/50 space-y-6 text-center animate-in fade-in slide-in-from-bottom duration-500">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">S{activeShift} Opening</span>
                  <span className="text-lg font-black text-slate-900">₹{shiftOpening.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50 block mb-1">S{activeShift} Sales</span>
                  <span className="text-lg font-black text-emerald-600">₹{shiftSales.toLocaleString()}</span>
                </div>
                <div className="bg-rose-50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-500/50 block mb-1">S{activeShift} Expenses</span>
                  <span className="text-lg font-black text-rose-600">₹{shiftExpenses.toLocaleString()}</span>
                </div>
              </div>

              <div className="bg-slate-900 p-5 rounded-2xl text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Expected Cash in Hand</span>
                <span className="text-3xl font-black text-white tracking-tighter">₹{expectedCash.toLocaleString()}</span>
              </div>
            </div>

            {/* Physical Cash Count Form */}
            {currentShift?.openingAssigned && (
              <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom duration-700">
                <div className="glass rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                  <div className={`p-4 flex justify-between items-center px-6 ${activeShift === 1 ? 'bg-amber-50 text-amber-900' : 'bg-indigo-50 text-indigo-900'}`}>
                    <span className="font-black text-xs uppercase tracking-widest">Shift {activeShift} — Physical Cash Count</span>
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
                            min="0"
                            value={counts[denom]}
                            disabled={isCurrentShiftClosed}
                            onChange={(e) => handleCountChange(denom, e.target.value)}
                            onWheel={(e) => e.target.blur()}
                            className={`w-24 bg-slate-50 border-2 border-transparent outline-none rounded-xl py-3 px-4 text-right font-black transition-all text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isCurrentShiftClosed
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
                          disabled={isCurrentShiftClosed}
                          onChange={(e) => setRemark(e.target.value)}
                          className={`w-full border-2 outline-none rounded-2xl p-4 font-bold transition-all h-24 ${isCurrentShiftClosed
                            ? 'bg-slate-50 border-slate-200 text-slate-500 cursor-not-allowed opacity-70'
                            : 'bg-rose-50/50 border-rose-100 focus:border-rose-300 focus:bg-white text-slate-900 placeholder:text-rose-300'
                            }`}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={loading || isCurrentShiftClosed}
                    onClick={() => {
                      const reason = window.prompt("Please enter the reason for No Service (e.g., Vehicle Damage, Flat Tyre):");
                      if (reason) {
                        setLoading(true);
                        submitClosingCash({
                          vehicleId: user.assignedVehicle?.id || user.assignedVehicleId,
                          actualCash: 0,
                          denominations: {},
                          remark: reason,
                          shift: activeShift,
                          isNoService: true
                        }).then(() => {
                          toast.success(`Shift ${activeShift} marked as No Service`);
                          if (activeShift === 1 && shift2?.openingAssigned) {
                            // Instead of auto-loading, we stay here and the main button will become "Proceed to Shift 2"
                            window.location.reload(); // Simplest way to refresh state
                          } else {
                            navigate('/reports');
                          }
                        }).catch(err => {
                          toast.error(err.response?.data?.message || 'Failed to submit');
                        }).finally(() => setLoading(false));
                      }
                    }}
                    className={`flex-1 font-black text-sm uppercase tracking-widest py-5 rounded-[1.5rem] border-2 transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${
                      isCurrentShiftClosed 
                        ? 'border-gray-100 text-gray-300 cursor-not-allowed'
                        : 'border-rose-200 text-rose-500 hover:bg-rose-50'
                    }`}
                  >
                    <AlertCircle size={18} />
                    {activeShift === 1 ? 'S1 Damage' : 'S2 Damage'}
                  </button>

                  <button
                    type={isCurrentShiftClosed && !(activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted) ? "button" : "submit"}
                    disabled={loading || (isCurrentShiftClosed && !(activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted))}
                    onClick={() => {
                      if (activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted) {
                        setActiveShift(2);
                      }
                    }}
                    className={`flex-[2] font-black text-xl py-5 rounded-[1.5rem] shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-3 group ${
                      isCurrentShiftClosed && !(activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted)
                        ? 'bg-slate-300 text-white cursor-not-allowed'
                        : activeShift === 1
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-200'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'
                    }`}
                  >
                    {activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted ? (
                      <>
                        <ArrowRight className="rotate-180" size={20} />
                        Next Shift (Afternoon)
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : isCurrentShiftClosed ? (
                      `Shift ${activeShift} Already Submitted`
                    ) : loading ? (
                      'Submitting...'
                    ) : (
                      <>
                        Submit Shift {activeShift}
                        <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
