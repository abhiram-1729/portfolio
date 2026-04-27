import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  MapPin, 
  Clock, 
  Play, 
  Square, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Navigation,
  ShieldCheck,
  Activity
} from 'lucide-react';
import * as shiftService from '../services/shiftService';
import * as locationService from '../services/locationService';
import toast from 'react-hot-toast';

export default function ShiftTracking() {
  const [activeShift, setActiveShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    fetchShiftStatus();
    return () => stopCamera();
  }, []);

  const fetchShiftStatus = async () => {
    try {
      const { data } = await shiftService.getShiftStatus();
      setActiveShift(data.activeShift);
    } catch (err) {
      toast.error('Failed to load shift status');
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(s);
      if (videoRef.current) videoRef.current.srcObject = s;
    } catch (err) {
      toast.error('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const getGPSLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => reject(err),
        { enableHighAccuracy: true }
      );
    });
  };

  const handleStartShift = async (type) => {
    setActionLoading(true);
    try {
      const coords = await getGPSLocation();
      
      if (coords.accuracy > 2000) {
        throw new Error(`GPS accuracy too low (${Math.round(coords.accuracy)}m). Please wait.`);
      }

      // Mock face photo (in real app, use canvas to capture from videoRef)
      const facePhoto = "base64_face_data_placeholder";

      await shiftService.startShift({
        lat: coords.latitude,
        lon: coords.longitude,
        accuracy: coords.accuracy,
        facePhoto,
        shiftType: type
      });

      toast.success('Shift Started ✅');
      locationService.startLiveTracking();
      fetchShiftStatus();
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
      const coords = await getGPSLocation();
      
      await shiftService.endShift({
        shiftLogId: activeShift.id,
        lat: coords.latitude,
        lon: coords.longitude,
        accuracy: coords.accuracy
      });

      toast.success('Shift Ended ✅');
      locationService.stopLiveTracking();
      fetchShiftStatus();
    } catch (err) {
      toast.error(err.message || 'Failed to end shift');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-24 px-5">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Shift Tracking</h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Village Ops Presence</p>
          </div>
          {activeShift && (
            <div className="flex items-center gap-2 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200">
              <Activity size={14} className="animate-pulse" />
              <span className="text-[10px] font-black uppercase">Active: {activeShift.shift === 1 ? 'Morning' : 'Evening'}</span>
            </div>
          )}
        </div>

        {/* Action Card */}
        {!activeShift ? (
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-gray-200/50 space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-600">
                <ShieldCheck size={40} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Start Your Day</h3>
                <p className="text-xs text-gray-400 font-medium px-4">Ensure you are at the Hub/Store before starting your shift.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <button 
                onClick={() => handleStartShift(1)}
                disabled={actionLoading}
                className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                Start Morning Shift (5:45 AM)
              </button>
              <button 
                onClick={() => handleStartShift(2)}
                disabled={actionLoading}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                Start Evening Shift (3:30 PM)
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-xl shadow-emerald-600/10 space-y-8">
             <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <Clock size={32} strokeWidth={2.5} />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Shift Started At</p>
                    <h4 className="text-xl font-black text-gray-900">{new Date(activeShift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</h4>
                </div>
             </div>

             <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <MapPin size={18} className="text-rose-500" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Base HUB</p>
                            <p className="text-sm font-black text-gray-900">{activeShift.store?.name || 'Main Hub'}</p>
                        </div>
                    </div>
                    <CheckCircle2 size={20} className="text-emerald-500" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                        <Navigation size={18} className="text-blue-500" />
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Live Tracking</p>
                            <p className="text-sm font-black text-gray-900">Active</p>
                        </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                </div>
             </div>

             <button 
                onClick={handleEndShift}
                disabled={actionLoading}
                className="w-full bg-gray-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-gray-900/20 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="animate-spin" /> : <Square size={20} />}
                End Shift & Return to Hub
              </button>
          </div>
        )}

        {/* Info Cards */}
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${activeShift ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <span className="text-xs font-black uppercase">{activeShift ? 'On Duty' : 'Off Duty'}</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Last Sync</p>
                <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-gray-400" />
                    <span className="text-xs font-black uppercase">Just Now</span>
                </div>
            </div>
        </div>

        {/* GPS Alert */}
        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex gap-3">
            <AlertTriangle className="text-amber-500 shrink-0" size={20} />
            <p className="text-[10px] text-amber-900 font-bold leading-relaxed">
                <span className="uppercase">Notice:</span> High-accuracy GPS and face verification are mandatory for every shift report. Ensure you have clear sky visibility.
            </p>
        </div>
      </div>
    </div>
  );
}
