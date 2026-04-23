import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, ArrowRight, AlertCircle, CheckCircle2, ArrowLeft, Sun, Moon, Lock, Clock, XCircle } from 'lucide-react';
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

      const s1 = data?.shifts?.shift1;
      const s2 = data?.shifts?.shift2;

      let selectedShift = 1;
      if (s1?.openingAssigned && !s1?.closingSubmitted) {
        selectedShift = 1;
      } else if (s1?.closingSubmitted && s2?.openingAssigned && !s2?.closingSubmitted) {
        selectedShift = 2;
      } else if (!s1?.openingAssigned && s2?.openingAssigned) {
        selectedShift = 2;
      }
      setActiveShift(selectedShift);

      // Pre-fill denomination fields with submitted values if shift is closed
      const selectedShiftData = selectedShift === 1 ? s1 : s2;
      if (selectedShiftData?.closingSubmitted && selectedShiftData?.closingDenominations) {
        const submittedDenoms = selectedShiftData.closingDenominations;
        setCounts(
          DENOMINATIONS.reduce((acc, d) => ({
            ...acc,
            [d]: submittedDenoms[String(d)] !== undefined ? submittedDenoms[String(d)] : ''
          }), {})
        );
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

  const shiftOpening = currentShift?.openingCash || 0;
  const shiftSales = currentShift?.cashSales || 0;
  const shiftExpenses = currentShift?.expenses || 0;
  const expectedCash = shiftOpening + shiftSales - shiftExpenses;
  const difference = actualCash - expectedCash;

  const canCloseShift2 = shift1?.closingSubmitted || !shift1?.openingAssigned;
  const reviewStatus = currentShift?.reviewStatus;
  const isCurrentShiftClosed = currentShift?.closingSubmitted && reviewStatus !== 'REJECTED';
  const isPending = reviewStatus === 'PENDING';
  const isRejected = reviewStatus === 'REJECTED';
  const isApproved = reviewStatus === 'APPROVED';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (Math.abs(difference) > 0.01 && !remark.trim()) {
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

  if (fetching) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Loading Cash Status...</p>
      </div>
    </div>
  );

  const anyOpening = shift1?.openingAssigned || shift2?.openingAssigned;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans max-w-lg mx-auto border-x border-slate-100 shadow-2xl relative">
      {/* --- STICKY HEADER --- */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-md animate-in fade-in slide-in-from-top duration-500">
        <div className="px-4 py-2.5 space-y-2.5">
          {/* Top Row: Back, Title, Nav */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => navigate('/')}
                className="p-1.5 bg-slate-100 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-base font-black text-slate-900 leading-tight tracking-tight">End Day</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Reconcile Cash</p>
              </div>
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg gap-0.5">
              <button
                onClick={() => navigate('/opening-cash')}
                className="px-2.5 py-1 rounded-md text-[10px] font-black text-slate-500 hover:bg-white/50 transition-all uppercase tracking-tighter"
              >
                Start
              </button>
              <button className="px-2.5 py-1 rounded-md text-[10px] font-black bg-white text-slate-900 shadow-sm uppercase tracking-tighter">
                End
              </button>
            </div>
          </div>

          {/* Shift Selector: Minimal */}
          <div className="flex gap-1.5">
            {[
              { id: 1, label: 'Shift 1', icon: Sun, color: 'emerald', data: shift1 },
              { id: 2, label: 'Shift 2', icon: Moon, color: 'indigo', data: shift2 },
            ].map(s => {
              const isAssigned = s.data?.openingAssigned;
              const isClosed = s.data?.closingSubmitted;
              const isLocked = s.id === 2 && !canCloseShift2;
              const isActive = activeShift === s.id;
              
              return (
                <button
                  key={s.id}
                  disabled={!isAssigned || isLocked}
                  onClick={() => {
                    if (isAssigned && !isLocked) {
                      setActiveShift(s.id);
                      // If this shift is closed, pre-fill with submitted denominations
                      if (s.data?.closingSubmitted && s.data?.closingDenominations) {
                        const submittedDenoms = s.data.closingDenominations;
                        setCounts(
                          DENOMINATIONS.reduce((acc, d) => ({
                            ...acc,
                            [d]: submittedDenoms[String(d)] !== undefined ? submittedDenoms[String(d)] : ''
                          }), {})
                        );
                      } else {
                        setCounts(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
                      }
                      setRemark('');
                    }
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 p-1.5 rounded-lg border transition-all ${
                    isActive
                      ? s.color === 'emerald' ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : !isAssigned || isLocked
                        ? 'border-transparent bg-slate-50 opacity-40 cursor-not-allowed'
                        : 'border-slate-100 bg-white hover:border-slate-200 text-slate-400'
                  }`}
                >
                  {isClosed ? <CheckCircle2 size={12} className="text-emerald-500" /> : isLocked ? <Lock size={12} /> : <s.icon size={12} />}
                  <span className="text-[10px] font-black uppercase tracking-tighter">{s.label}</span>
                </button>
              );
            })}
          </div>

          {/* Status Bar: Pinned & Modern */}
          <div className="bg-slate-950 rounded-xl p-2.5 text-white grid grid-cols-6 gap-1 divide-x divide-white/5 shadow-inner">
            <div className="text-center px-0.5">
              <p className="text-[6px] font-black text-slate-500 uppercase mb-0.5 whitespace-nowrap">Opening</p>
              <p className="text-[9px] font-black truncate">₹{shiftOpening.toFixed(2)}</p>
            </div>
            <div className="text-center px-0.5 border-white/5">
              <p className="text-[6px] font-black text-emerald-500 uppercase mb-0.5 whitespace-nowrap">Cash</p>
              <p className="text-[9px] font-black truncate">₹{shiftSales.toFixed(2)}</p>
            </div>
            <div className="text-center px-0.5 border-white/5">
              <p className="text-[6px] font-black text-orange-500 uppercase mb-0.5 whitespace-nowrap">UPI</p>
              <p className="text-[9px] font-black truncate font-sans">₹{(currentShift?.upiSales || 0).toFixed(2)}</p>
            </div>
            <div className="text-center px-0.5 border-white/5">
              <p className="text-[6px] font-black text-blue-500 uppercase mb-0.5 whitespace-nowrap">Card</p>
              <p className="text-[9px] font-black truncate font-sans">₹{(currentShift?.cardSales || 0).toFixed(2)}</p>
            </div>
            <div className="text-center px-0.5 border-white/5">
              <p className="text-[6px] font-black text-rose-500 uppercase mb-0.5 whitespace-nowrap">Expenses</p>
              <p className="text-[9px] font-black truncate">₹{shiftExpenses.toFixed(2)}</p>
            </div>
            <div className="text-center px-1 border-white/5">
              <p className="text-[6px] font-black text-amber-500 uppercase mb-0.5 whitespace-nowrap">Expected</p>
              <p className="text-[10px] font-black truncate text-amber-400">₹{expectedCash.toFixed(2)}</p>
            </div>
          </div>

          {/* Status Badge: Review State */}
          {currentShift?.closingSubmitted && (
            <div className={`flex items-center justify-center gap-1.5 py-1 px-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-500 ${
              isApproved ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 
              isRejected ? 'bg-rose-50 border-rose-100 text-rose-600' :
              'bg-orange-50 border-orange-100 text-orange-600'
            }`}>
              {isApproved ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : <Clock size={12} className="animate-pulse" />}
              <span className="text-[9px] font-black uppercase tracking-widest">
                {isApproved ? 'Shift Approved' : isRejected ? 'Shift Rejected - Please Resubmit' : 'Awaiting Admin Review'}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* --- MAIN CONTENT (SCROLLABLE) --- */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {!anyOpening ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
            <div className="bg-rose-50 w-20 h-20 rounded-3xl flex items-center justify-center text-rose-500 border border-rose-100 shadow-inner">
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
              className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-slate-200 transition-all active:scale-95"
            >
              Back to Sales
            </button>
          </div>
        ) : (
          <div className="space-y-4 pb-24"> 
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden divide-y divide-slate-100/60">
              <div className="px-5 py-3 bg-slate-50 flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Physical Cash Count</span>
                {/* Only show Short/Extra badge when shift is NOT yet submitted */}
                {!isCurrentShiftClosed && (
                  <div className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${Math.abs(difference) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {Math.abs(difference) <= 0.01 ? 'Matched' : difference > 0 ? `Extra: ₹${difference.toFixed(2)}` : `Short: ₹${Math.abs(difference).toFixed(2)}`}
                  </div>
                )}
                {isCurrentShiftClosed && (
                  <div className="px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-slate-100 text-slate-400">
                    Submitted
                  </div>
                )}
              </div>

              {DENOMINATIONS.map((denom) => (
                <div key={denom} className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-xs border border-slate-200/50">
                      ₹{denom}
                    </div>
                    <span className="font-black text-slate-300 text-xs">×</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      min="0"
                      value={counts[denom]}
                      disabled={isCurrentShiftClosed}
                      onChange={(e) => handleCountChange(denom, e.target.value)}
                      onWheel={(e) => e.target.blur()}
                      className={`w-14 bg-transparent outline-none font-black transition-all text-base border-b-2 border-transparent focus:border-emerald-500 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isCurrentShiftClosed ? 'opacity-30' : 'text-slate-900'}`}
                    />
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Subtotal</p>
                    <p className="font-black text-slate-800 text-sm">₹{(denom * (counts[denom] || 0)).toLocaleString()}</p>
                  </div>
                </div>
              ))}

              <div className="p-5 bg-slate-50/50 space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Actual Cash Total</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">₹{actualCash.toFixed(2)}</span>
                  </div>
                  <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center text-slate-900 shadow-sm shadow-slate-100">
                    <Calculator size={18} />
                  </div>
                </div>

                {Math.abs(difference) > 0.01 && (
                  <div className="space-y-2 animate-in slide-in-from-top duration-300">
                    <label className="text-[10px] font-black uppercase tracking-widest text-rose-500 block pl-1 flex items-center gap-1">
                      <AlertCircle size={10} /> Explain Difference (Required)
                    </label>
                    <textarea
                      placeholder="Why is there a difference?"
                      value={remark}
                      disabled={isCurrentShiftClosed}
                      onChange={(e) => setRemark(e.target.value)}
                      className={`w-full border-2 outline-none rounded-2xl p-4 font-bold transition-all h-20 text-sm ${isCurrentShiftClosed
                        ? 'bg-slate-50 border-slate-100 text-slate-400 opacity-60'
                        : 'bg-white border-rose-100 focus:border-rose-400 text-slate-900 placeholder:text-rose-200'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* --- STICKY FOOTER --- */}
      {anyOpening && (
        <footer className="sticky bottom-0 z-30 p-3 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 shadow-[0_-8px_30px_rgb(0,0,0,0.04)] animate-in fade-in slide-in-from-bottom duration-500">
          <div className="flex gap-2 max-w-lg mx-auto">
            <button
              type="button"
              disabled={loading || isCurrentShiftClosed}
              onClick={() => {
                const reason = window.prompt("Please enter the reason for Damage/No Service (e.g., Vehicle Breakdown, Flat Tyre):");
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
                      window.location.reload();
                    } else {
                      navigate('/reports');
                    }
                  }).catch(err => {
                    toast.error(err.response?.data?.message || 'Failed to submit');
                  }).finally(() => setLoading(false));
                }
              }}
              className={`px-3 py-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                isCurrentShiftClosed 
                  ? 'border-transparent bg-slate-50 text-slate-300 grayscale select-none'
                  : 'border-rose-100 bg-rose-50/30 text-rose-500 hover:bg-rose-50 active:bg-rose-100'
              }`}
            >
              <AlertCircle size={14} />
              <span className="text-[8px] font-black uppercase tracking-tighter">S{activeShift} Damage</span>
            </button>

            <button
              type="button"
              disabled={loading || (isCurrentShiftClosed && !(activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted))}
              onClick={() => {
                if (activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted) {
                  setActiveShift(2);
                  setCounts(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d]: '' }), {}));
                  setRemark('');
                } else if (!isCurrentShiftClosed) {
                  handleSubmit();
                }
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-[0.98] group ${
                isCurrentShiftClosed && !(activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted)
                  ? 'bg-slate-200 text-slate-400 shadow-none cursor-not-allowed'
                  : activeShift === 1 && shift1?.closingSubmitted
                    ? 'bg-amber-500 text-white shadow-amber-200 hover:bg-amber-600'
                    : 'bg-slate-900 text-white shadow-slate-300 hover:bg-black'
              }`}
            >
              {loading ? (
                'Processing...'
              ) : activeShift === 1 && shift1?.closingSubmitted && !shift2?.closingSubmitted ? (
                <>
                  <span>Next Shift</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              ) : isCurrentShiftClosed ? (
                'Shift Submitted'
              ) : (
                <>
                  <span>Submit S{activeShift}</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
