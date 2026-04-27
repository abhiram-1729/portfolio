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
  X,
  Play,
  Square,
  Activity,
  ShieldCheck,
  Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useUserStore } from '../store/userStore';
import * as routeService from '../services/routeService';
import * as locationService from '../services/locationService';
import * as shiftService from '../services/shiftService';
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

  const handleMarkCoverage = async (shift) => {
    if (markingSlot) return;
    setMarkingSlot(shift.id || shift.name);
    try {
      await routeService.markCoverage({ 
        shiftId: shift.id, 
        shiftName: shift.name,
        slot: shift.name.toUpperCase() // For backward compatibility
      });
      toast.success(`${shift.name} coverage marked!`);
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to mark ${shift.name}`);
    } finally {
      setMarkingSlot(null);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStatus();
  };

  const [checkingIn, setCheckingIn] = useState(false);
  const [activeShift, setActiveShift] = useState(null);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [activeVillageVisit, setActiveVillageVisit] = useState(null);
  const [villageActionLoading, setVillageActionLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchActiveShift();
  }, []);

  const fetchActiveShift = async () => {
    try {
      const { data } = await shiftService.getShiftStatus();
      setActiveShift(data.activeShift);
      setAvailableShifts(data.shifts || []);
      if (data.activeShift?.activities?.length > 0) {
        const latest = data.activeShift.activities[0];
        if (!latest.endTime) setActiveVillageVisit(latest);
      }
    } catch (err) {
      console.error('Failed to fetch shift status');
    }
  };

  const handleStartShift = async (type) => {
    setActionLoading(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const coords = pos.coords;
      
      if (coords.accuracy > 2000) {
        throw new Error(`GPS accuracy too low (${Math.round(coords.accuracy)}m).`);
      }

      await shiftService.startShift({
        lat: coords.latitude,
        lon: coords.longitude,
        accuracy: coords.accuracy,
        facePhoto: "base64_face_data_placeholder",
        shiftType: parseInt(type)
      });

      toast.success('Shift Started ✅');
      locationService.startLiveTracking();
      fetchActiveShift();
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to start shift');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndShift = async () => {
    if (!activeShift) return;
    setActionLoading(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const coords = pos.coords;
      
      await shiftService.endShift({
        shiftLogId: activeShift.id,
        lat: coords.latitude,
        lon: coords.longitude,
        accuracy: coords.accuracy
      });

      toast.success('Shift Ended ✅');
      locationService.stopLiveTracking();
      setActiveShift(null);
      fetchActiveShift();
      fetchStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to end shift');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVillageVisit = async (action) => {
    if (!activeShift) {
      toast.error('Start your shift first in the Shift Tracking menu.');
      return;
    }
    
    setVillageActionLoading(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });
      const { latitude, longitude, accuracy } = pos.coords;

      if (accuracy > 2000) {
        toast.error(`GPS accuracy too low (${Math.round(accuracy)}m).`);
        return;
      }

      if (action === 'start') {
        const { data } = await api.post('/village-activities/start', {
          lat: latitude,
          lon: longitude,
          accuracy,
          villageId: today.villageId,
          shiftLogId: activeShift.id
        });
        setActiveVillageVisit(data.activity);
        toast.success('Village Visit Started ✅');
      } else {
        await api.post('/village-activities/end', {
          lat: latitude,
          lon: longitude,
          accuracy,
          activityId: activeVillageVisit.id
        });
        setActiveVillageVisit(null);
        toast.success('Village Visit Ended ✅');
      }
      fetchActiveShift();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Action failed');
    } finally {
      setVillageActionLoading(false);
    }
  };

  const handleLocationCheckIn = () => {
    if (!hasPlan) return;
    
    if (!activeShift) {
      toast.error('Please start your shift in the "Shift Tracking" menu first.');
      return;
    }

    setCheckingIn(true);

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      setCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude, accuracy } = position.coords;
          
          if (accuracy > 2000) {
            toast.error(`GPS accuracy too low (${Math.round(accuracy)}m). Please move to an open area.`);
            setCheckingIn(false);
            return;
          }

          // Legacy check-in (compatibility)
          await routeService.locationCheckIn({
            latitude,
            longitude,
            villageName: today.villageName
          });

          // Start continuous live tracking
          locationService.startLiveTracking();
          setIsTracking(true);
          
          toast.success("Location tracking active!");
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
      },
      { enableHighAccuracy: true }
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

  const { today, tomorrow, tomorrowLabel, coverage, shifts: configShifts } = statusData;
  const hasPlan = today && !today.message && !today.noVillage;
  const hasTomorrow = tomorrow && !tomorrow.message && !tomorrow.noVillage;
  
  const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
  const currentShift = (configShifts || []).find(s => currentTime >= s.startTime && currentTime <= s.endTime) || (configShifts ? configShifts[0] : null);
  const sessionName = currentShift ? currentShift.name : (new Date().getHours() < 14 ? 'Morning' : 'Evening');

  return (
    <div className="min-h-screen pb-28 pt-6">
      <div className="max-w-lg mx-auto px-5 space-y-5">
        {/* ── Shift Tracking (Embedded) ────────────────── */}
        {!activeShift ? (
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-5 animate-in slide-in-from-top duration-500">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                <ShieldCheck size={28} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">Start Your Day</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Select your shift to begin</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {availableShifts.map((shift, idx) => (
                <button 
                  key={shift.id || idx}
                  onClick={() => handleStartShift(idx + 1)}
                  disabled={actionLoading}
                  className={`w-full ${idx % 2 === 0 ? 'bg-emerald-600' : 'bg-indigo-600'} text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
                >
                  {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                  Start {shift.name} ({shift.startTime})
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-5 border border-emerald-100 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity size={20} className="animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">
                  On Duty: {availableShifts[activeShift.shift - 1]?.name || (activeShift.shift === 1 ? 'Morning' : 'Evening')}
                </h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                  Started at {activeShift.startTime ? new Date(activeShift.startTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                </p>
              </div>
            </div>
            <button 
              onClick={handleEndShift}
              disabled={actionLoading}
              className="bg-gray-100 text-gray-400 p-2.5 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90"
              title="End Shift"
            >
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={16} />}
            </button>
          </div>
        )}

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
                  {sessionName.toLowerCase().includes('evening') || sessionName.toLowerCase().includes('night') ? <Moon size={12} /> : <Sun size={12} />}
                  {sessionName} Session
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
              ) : isTracking ? (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl border bg-blue-100 text-blue-700 border-blue-200">
                  <Activity size={16} className="animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Live Tracking</span>
                </div>
              ) : (
                <button
                  onClick={handleLocationCheckIn}
                  disabled={checkingIn}
                  className="bg-blue-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {checkingIn ? <Loader2 size={14} className="animate-spin" /> : <MapPin size={14} />}
                  Turn ON Location
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Village Visit Controls ─────────────────── */}
        {hasPlan && (
          <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm space-y-4">
             <div className="flex items-center justify-between">
                <div>
                   <h4 className="font-black text-gray-900 text-sm">Village Visit</h4>
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      {activeVillageVisit ? 'Visit in progress...' : 'Ready to start visit?'}
                   </p>
                </div>
                {activeVillageVisit && (
                   <div className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black animate-pulse">
                      LIVE
                   </div>
                )}
             </div>

             <div className="flex gap-3">
                {!activeVillageVisit ? (
                   <button 
                      onClick={() => handleVillageVisit('start')}
                      disabled={villageActionLoading || !activeShift}
                      className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                      {villageActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                      Start Village Visit
                   </button>
                ) : (
                   <button 
                      onClick={() => handleVillageVisit('end')}
                      disabled={villageActionLoading}
                      className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                   >
                      {villageActionLoading ? <Loader2 size={14} className="animate-spin" /> : <Square size={14} />}
                      End Village Visit
                   </button>
                )}
             </div>
             {!activeShift && (
                <p className="text-[9px] text-rose-500 font-black uppercase text-center tracking-widest">
                   ⚠️ Start shift in "Shift Tracking" menu first
                </p>
             )}
          </div>
        )}

        {/* ── Coverage Tracking ──────────────────────── */}
        {hasPlan && (
          <div className="space-y-3">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Coverage Tracking</h4>

            {(statusData.shifts || []).map((shift) => {
              const isDone = coverage.shiftStatus?.[shift.name] || (shift.name.toUpperCase() === 'MORNING' && coverage.morningDone) || (shift.name.toUpperCase() === 'EVENING' && coverage.eveningDone);
              const isPM = shift.startTime >= '12:00';
              
              return (
                <div key={shift.id || shift.name} className={`rounded-2xl p-4 border transition-all ${isDone
                  ? 'bg-emerald-50/80 border-emerald-200 shadow-sm'
                  : 'bg-white border-gray-100 shadow-sm'
                  }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDone
                        ? 'bg-emerald-100 text-emerald-600'
                        : (isPM ? 'bg-indigo-50 text-indigo-500' : 'bg-amber-50 text-amber-500')
                        }`}>
                        {isPM ? <Moon size={22} strokeWidth={2.5} /> : <Sun size={22} strokeWidth={2.5} />}
                      </div>
                      <div>
                        <h5 className="font-bold text-gray-900 text-sm">{shift.name}</h5>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          {isDone ? 'Completed' : `${shift.startTime} - ${shift.endTime}`}
                        </p>
                      </div>
                    </div>

                    {isDone ? (
                      <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-700 px-3 py-2 rounded-xl">
                        <CheckCircle2 size={16} strokeWidth={3} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Done</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleMarkCoverage(shift)}
                        disabled={markingSlot === (shift.id || shift.name)}
                        className={`${isPM ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-amber-500 shadow-amber-500/20'} text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2`}
                      >
                        {markingSlot === (shift.id || shift.name) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                        Mark Done
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Completion Status */}
            {coverage.status === 'BOTH_DONE' && (
              <div className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-center shadow-lg shadow-emerald-500/20">
                <div className="flex items-center justify-center gap-2 text-white mb-1">
                  <CheckCircle2 size={20} strokeWidth={3} />
                  <span className="font-black text-sm uppercase tracking-wider">All Coverage Complete!</span>
                </div>
                <p className="text-[10px] text-emerald-100 font-bold">All configured shifts are done for today.</p>
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
