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

  if (loading) return null;

  const shift1 = status?.shifts?.shift1;
  const shift2 = status?.shifts?.shift2;
  const anyShiftAssigned = shift1?.openingAssigned || shift2?.openingAssigned;

  const ShiftCard = ({ shiftNum, data, icon: Icon, color, gradientFrom, gradientTo }) => {
    const denominations = data?.openingDenominations;
    return (
      <div className={`rounded-[2rem] border overflow-hidden shadow-xl ${data?.openingAssigned ? `border-${color}-200 shadow-${color}-100/30` : 'border-gray-100 shadow-gray-100/30'}`}>
        {/* Shift Header */}
        <div className={`p-5 flex items-center justify-between ${data?.openingAssigned ? `bg-gradient-to-r from-${color}-500 to-${color}-600 text-white` : 'bg-gray-100 text-gray-400'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${data?.openingAssigned ? 'bg-white/20' : 'bg-white'}`}>
              <Icon size={20} className={data?.openingAssigned ? 'text-white' : 'text-gray-300'} />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest">Shift {shiftNum}</h3>
              <p className="text-[9px] font-bold uppercase tracking-wider opacity-70">
                {shiftNum === 1 ? 'Morning Session' : 'Afternoon Session'}
              </p>
            </div>
          </div>
          {data?.openingAssigned ? (
            <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
              <CheckCircle2 size={12} />
              <span className="text-[9px] font-black uppercase tracking-widest">Assigned</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full">
              <Clock size={12} className="text-gray-400" />
              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Pending</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <div className="p-6 bg-white">
          {data?.openingAssigned ? (
            <div className="space-y-4">
              {data.isNoService ? (
                <div className="text-center py-4 space-y-3">
                  <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-500 border border-rose-100">
                    <AlertCircle size={24} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-black text-rose-600 uppercase tracking-widest block">No Service Day</span>
                    <p className="text-[10px] font-bold text-gray-400 max-w-[180px] mx-auto leading-relaxed">
                      This shift has been marked as No Service by admin (Vehicle Damage/Maintenance).
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">Opening Float</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">₹{(data.openingCash || 0).toLocaleString()}</span>
                  </div>

                  {/* Denomination breakdown */}
                  {denominations && (
                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {DENOMINATIONS.filter(d => denominations[d] > 0).map(d => (
                        <div key={d} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                          <span className="text-[9px] font-black text-slate-400 block">₹{d}</span>
                          <span className="text-xs font-black text-slate-700">× {denominations[d]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto border border-gray-100">
                <Clock size={24} className="text-gray-300" />
              </div>
              <p className="text-xs font-bold text-gray-400">Awaiting admin assignment</p>
            </div>
          )}
        </div>
      </div>
    );
  };

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
          <div className="inline-flex p-4 rounded-3xl bg-emerald-600 shadow-xl shadow-emerald-200 text-white mb-4">
            <Coins size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Start Your Day</h1>
          <p className="text-slate-500 font-bold">Your daily opening cash floats (Admin assigned)</p>
        </div>

        {/* Tab Navigation */}
        {anyShiftAssigned && (
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

        {/* Two Shift Cards */}
        <div className="space-y-4">
          <ShiftCard shiftNum={1} data={shift1} icon={Sun} color="amber" />
          <ShiftCard shiftNum={2} data={shift2} icon={Moon} color="indigo" />
        </div>

        {/* Navigation */}
        {anyShiftAssigned ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
              <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-bold text-emerald-800">
                {shift1?.openingAssigned && shift2?.openingAssigned
                  ? 'Both shifts have been assigned. You are ready to start selling!'
                  : shift1?.openingAssigned
                    ? 'Shift 1 float assigned. Shift 2 will be assigned by admin later.'
                    : 'Shift 2 float assigned. Check with admin for Shift 1.'
                }
              </p>
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
               Opening cash is managed by the admin. Please wait for the daily float to be assigned for at least one shift.
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
      </div>
    </div>
  );
}
