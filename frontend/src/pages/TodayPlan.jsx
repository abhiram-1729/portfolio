import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  ChevronRight,
  Loader2,
  Bell,
  BellOff,
  ArrowLeft,
  Calendar,
  Truck,
  RefreshCw,
  AlertTriangle,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import * as routeService from '../services/routeService';
import toast from 'react-hot-toast';
export default function TodayPlan() {
  const { user } = useUserStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [statusData, setStatusData] = useState(null);
  const [markingSlot, setMarkingSlot] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const data = await routeService.getCoverageStatus();
      setStatusData(data);
    } catch (err) {
      console.error('Failed to load coverage status:', err);
      toast.error('Failed to load today\'s plan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleMarkCoverage = async (slot) => {
    if (markingSlot) return;
    setMarkingSlot(slot);
    try {
      await routeService.markCoverage(slot);
      toast.success(`${slot === 'MORNING' ? 'Morning' : 'Evening'} coverage marked!`);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to mark ${slot.toLowerCase()}`);
    } finally {
      setMarkingSlot(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const [checkingIn, setCheckingIn] = useState(false);

  const handleLocationCheckIn = () => {
    if (!hasPlan) return;
    setCheckingIn(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          await routeService.locationCheckIn({
            latitude,
            longitude,
            villageName: today.villageName
          });
          toast.success("Location tracked successfully!");
          fetchStatus();
        } catch (err) {
          toast.error("Failed to track location");
        } finally {
          setCheckingIn(false);
        }
      },
      (error) => {
        toast.error("Unable to retrieve your location. Please enable location services.");
        setCheckingIn(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen pt-12">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Loading Plan...</p>
        </div>
      </div>
    );
  }

  if (!statusData?.vehicleAssigned) {
    return (
      <div className="min-h-screen pt-8">
        <div className="max-w-lg mx-auto px-5">
          <div className="bg-amber-50 rounded-3xl p-8 border border-amber-200 text-center">
            <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-bold text-amber-900 mb-2">No Vehicle Assigned</h3>
            <p className="text-sm text-amber-700">Contact your admin to assign a vehicle to your profile to view today's route plan.</p>
          </div>
        </div>
      </div>
    );
  }

  const { today, tomorrow, tomorrowLabel, coverage } = statusData;
  const hasPlan = today && !today.message && !today.noVillage;
  const hasTomorrow = tomorrow && !tomorrow.message && !tomorrow.noVillage;
  const currentHour = new Date().getHours();
  const isBeforeNoon = currentHour < 14;

  return (
    <div className="min-h-screen pb-28 pt-6">
      <div className="max-w-lg mx-auto px-5 space-y-5">
        {/* Simplified Title Section */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Today's Village</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm transition-all ${refreshing ? 'animate-spin' : 'hover:bg-violet-50 active:scale-90 hover:text-violet-600'}`}
          >
            <RefreshCw size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Today's Village Card ──────────────────────── */}
        {hasPlan ? (
          <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-700 rounded-3xl p-6 shadow-2xl shadow-emerald-600/20 relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full" />
            <div className="absolute -bottom-16 -left-8 w-32 h-32 bg-white/5 rounded-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-inner">
                  <MapPin size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-0.5">Today's Village</p>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-tight">{today.villageName}</h3>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-wider border border-white/10">
                  {today.routeName}
                </span>
                <span className="bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-xl text-[10px] font-black text-white uppercase tracking-wider border border-white/10 flex items-center gap-1.5">
                  {isBeforeNoon ? <Sun size={12} /> : <Moon size={12} />}
                  {isBeforeNoon ? 'Morning Session' : 'Evening Session'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-3xl p-8 border border-dashed border-gray-200 text-center">
            <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-base font-bold text-gray-600 mb-1">No Plan Today</h3>
            <p className="text-xs text-gray-400">No village is scheduled for today on your route.</p>
          </div>
        )}
        {/* ── Location Check-in Card ─────────────────── */}
        {hasPlan && (
          <div className={`rounded-3xl p-5 border transition-all ${statusData.checkIn ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100 shadow-sm'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${statusData.checkIn ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                  <MapPin size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 text-sm">Location reached?</h4>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {statusData.checkIn ? `Checked in at ${new Date(statusData.checkIn.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Track your arrival'}
                  </p>
                </div>
              </div>

              {statusData.checkIn ? (
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border ${statusData.checkIn.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                  <CheckCircle2 size={16} strokeWidth={3} />
                  <span className="text-[10px] font-black uppercase tracking-widest">
                    {statusData.checkIn.status === 'ON_TIME' ? 'On Time' : 'Late'}
                  </span>
                </div>
              ) : (
                <button
                  onClick={handleLocationCheckIn}
                  disabled={checkingIn}
                  className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {checkingIn ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                  Turn ON Location
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Coverage Tracking ──────────────────────── */}
        {hasPlan && (
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Coverage Tracking</h4>

            {/* Morning Slot */}
            <div className={`rounded-2xl p-4 border transition-all ${coverage.morningDone
              ? 'bg-emerald-50/80 border-emerald-200 shadow-sm'
              : 'bg-white border-gray-100 shadow-sm'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${coverage.morningDone
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-amber-50 text-amber-500'
                    }`}>
                    <Sun size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">Morning — Part A</h5>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {coverage.morningDone ? 'Completed' : 'Before 2:00 PM'}
                    </p>
                  </div>
                </div>

                {coverage.morningDone ? (
                  <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl">
                    <CheckCircle2 size={16} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMarkCoverage('MORNING')}
                    disabled={markingSlot === 'MORNING'}
                    className="bg-amber-500 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {markingSlot === 'MORNING' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Mark Done
                  </button>
                )}
              </div>
            </div>

            {/* Evening Slot */}
            <div className={`rounded-2xl p-4 border transition-all ${coverage.eveningDone
              ? 'bg-emerald-50/80 border-emerald-200 shadow-sm'
              : 'bg-white border-gray-100 shadow-sm'
              }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${coverage.eveningDone
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-indigo-50 text-indigo-500'
                    }`}>
                    <Moon size={22} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm">Evening — Part B</h5>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {coverage.eveningDone ? 'Completed' : 'After 2:00 PM'}
                    </p>
                  </div>
                </div>

                {coverage.eveningDone ? (
                  <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl">
                    <CheckCircle2 size={16} strokeWidth={3} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                  </div>
                ) : (
                  <button
                    onClick={() => handleMarkCoverage('EVENING')}
                    disabled={markingSlot === 'EVENING'}
                    className="bg-indigo-500 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {markingSlot === 'EVENING' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Mark Done
                  </button>
                )}
              </div>
            </div>

            {/* Completion Status */}
            {coverage.status === 'BOTH_DONE' && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-center shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-center gap-2 text-white mb-1">
                  <CheckCircle2 size={20} strokeWidth={3} />
                  <span className="font-black text-sm uppercase tracking-wider">All Coverage Complete!</span>
                </div>
                <p className="text-[10px] text-emerald-100 font-bold">Both morning and evening sessions are done for today.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tomorrow's Preview ──────────────────────── */}
        <div className="space-y-3">
          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Next: {tomorrowLabel || 'Tomorrow'}</h4>

          {hasTomorrow ? (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-500 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h5 className="font-bold text-gray-900 text-sm truncate">{tomorrow.villageName}</h5>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{tomorrow.routeName}</p>
                </div>
                <ChevronRight size={18} className="text-gray-300" />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200">
              <p className="text-xs text-gray-400 text-center font-medium italic">No plan scheduled for tomorrow</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
