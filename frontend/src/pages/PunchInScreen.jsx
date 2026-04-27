import { useState, useEffect, useRef, useCallback } from 'react';
import { attendanceAPI } from '../services/api';
import { Fingerprint, Clock, MapPin, Loader2, Camera, RefreshCw, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PunchInScreen({ onPunchIn }) {
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState('idle');
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null); // data URL
  const [capturedBlob, setCapturedBlob] = useState(null);   // blob for upload
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = front camera
  const [locationName, setLocationName] = useState('');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-start camera on mount
  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Camera access denied. Please enable camera permissions.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    // Small delay to allow cleanup
    setTimeout(() => startCamera(), 300);
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    // Mirror for front camera
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    // Add timestamp overlay
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px sans-serif';
    const now = new Date();
    const timeStr = now.toLocaleString('en-IN', { 
      dateStyle: 'medium', 
      timeStyle: 'medium' 
    });
    ctx.fillText(`📅 ${timeStr}`, 10, canvas.height - 35);
    ctx.fillText(`📍 Punch-In Photo Proof`, 10, canvas.height - 12);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(dataUrl);

    // Convert to blob
    canvas.toBlob((blob) => {
      setCapturedBlob(blob);
    }, 'image/jpeg', 0.8);

    stopCamera();
  }, [facingMode]);

  const retakePhoto = () => {
    setCapturedPhoto(null);
    setCapturedBlob(null);
    startCamera();
  };

  const handlePunchIn = async () => {
    if (!capturedPhoto || !capturedBlob) {
      toast.error('Please capture your photo first');
      return;
    }

    setLoading(true);
    let lat = null, lng = null, fetchedLocationName = locationName;

    // Get location
    try {
      setLocationStatus('requesting');
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { 
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
      setLocationStatus('granted');
      
      // Reverse geocode to get location name
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          fetchedLocationName = data.display_name;
          setLocationName(fetchedLocationName);
        }
      } catch (e) {
        console.error('Reverse geocoding failed', e);
      }
    } catch {
      setLocationStatus('denied');
    }

    try {
      const formData = new FormData();
      formData.append('photo', capturedBlob, `punchin-${Date.now()}.jpg`);
      if (lat) formData.append('lat', lat);
      if (lng) formData.append('lng', lng);
      if (fetchedLocationName) formData.append('locationAddress', fetchedLocationName);

      const { data } = await attendanceAPI.punchIn(formData);
      toast.success(data.message || 'Punched in successfully!');
      onPunchIn(data.attendance);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to punch in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-50 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full bg-emerald-100/50 blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[50vw] h-[50vw] rounded-full bg-orange-100/30 blur-[120px]" />
      </div>

      <div className="z-10 w-full max-w-sm flex flex-col items-center">
        {/* Time Display */}
        <div className="mb-5 text-center">
          <div className="text-4xl font-black text-emerald-900 tracking-tight tabular-nums">
            {formatTime(currentTime)}
          </div>
          <p className="text-emerald-600/70 text-xs font-bold mt-1 tracking-wide">
            {formatDate(currentTime)}
          </p>
        </div>

        {/* Card */}
        <div className="w-full glass rounded-[2rem] p-6 shadow-2xl shadow-emerald-900/5 border border-white relative overflow-hidden bg-white/80 backdrop-blur-2xl">
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500/0 via-emerald-500/20 to-emerald-500/0" />

          {/* Title */}
          <div className="text-center mb-4">
            <h2 className="text-xl font-black text-emerald-900 tracking-tight">Mark Attendance</h2>
            <p className="text-emerald-600/60 text-[10px] font-bold mt-0.5 uppercase tracking-widest">Capture Photo to Punch In</p>
          </div>

          {/* Camera Section */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-900 mb-4 aspect-[4/3]">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
                />
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 p-4 text-center">
                    <Camera size={40} className="text-slate-500 mb-3" />
                    <p className="text-sm text-slate-400 font-bold">{cameraError}</p>
                    <button onClick={startCamera} className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-black rounded-xl">
                      Retry
                    </button>
                  </div>
                )}
                {cameraActive && (
                  <>
                    {/* Camera controls */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button
                        onClick={switchCamera}
                        className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition-all"
                      >
                        <RefreshCw size={16} strokeWidth={2.5} />
                      </button>
                    </div>
                    {/* Capture button */}
                    <div className="absolute bottom-3 inset-x-0 flex justify-center">
                      <button
                        onClick={capturePhoto}
                        className="w-16 h-16 rounded-full bg-white border-4 border-emerald-500 flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-500" />
                      </button>
                    </div>
                    {/* Viewfinder corners */}
                    <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-white/50 rounded-tl-lg" />
                    <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-white/50 rounded-tr-lg" />
                    <div className="absolute bottom-16 left-4 w-8 h-8 border-b-2 border-l-2 border-white/50 rounded-bl-lg" />
                    <div className="absolute bottom-16 right-4 w-8 h-8 border-b-2 border-r-2 border-white/50 rounded-br-lg" />
                  </>
                )}
              </>
            ) : (
              <>
                <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
                {/* Retake button */}
                <button
                  onClick={retakePhoto}
                  className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-white transition-all"
                >
                  <RefreshCw size={12} strokeWidth={3} />
                  Retake
                </button>
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-500/90 backdrop-blur-md rounded-full">
                  <CheckCircle2 size={12} className="text-white" strokeWidth={3} />
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">Photo Captured</span>
                </div>
              </>
            )}
          </div>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Status Row */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100">
              <Clock size={12} className="text-emerald-600" />
              <span className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Live</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              locationStatus === 'granted' ? 'bg-blue-50 border-blue-100' :
              locationStatus === 'denied' ? 'bg-amber-50 border-amber-100' :
              'bg-slate-50 border-slate-100'
            }`}>
              <MapPin size={12} className={
                locationStatus === 'granted' ? 'text-blue-600' :
                locationStatus === 'denied' ? 'text-amber-600' :
                'text-slate-400'
              } />
              <div className="flex flex-col">
                <span className={`text-[9px] font-black uppercase tracking-widest ${
                  locationStatus === 'granted' ? 'text-blue-700' :
                  locationStatus === 'denied' ? 'text-amber-700' :
                  'text-slate-500'
                }`}>
                  {locationStatus === 'granted' ? 'Located' :
                   locationStatus === 'denied' ? 'No GPS' :
                   locationStatus === 'requesting' ? 'Locating...' :
                   'GPS Ready'}
                </span>
                {locationName && (
                   <span className="text-[8px] font-bold text-blue-600 leading-tight" title={locationName}>
                     {locationName}
                   </span>
                )}
              </div>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${
              capturedPhoto ? 'bg-emerald-50 border-emerald-100' : 'bg-slate-50 border-slate-100'
            }`}>
              <Camera size={12} className={capturedPhoto ? 'text-emerald-600' : 'text-slate-400'} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${
                capturedPhoto ? 'text-emerald-700' : 'text-slate-500'
              }`}>
                {capturedPhoto ? 'Captured' : 'Required'}
              </span>
            </div>
          </div>

          {/* Punch In Button */}
          <button
            onClick={handlePunchIn}
            disabled={loading || !capturedPhoto}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base py-3.5 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 group-disabled:opacity-0 transition-opacity duration-500" />
            <span className="relative z-10 font-black tracking-tight flex items-center gap-2">
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Punching In...
                </>
              ) : (
                <>
                  <Fingerprint size={20} strokeWidth={2.5} />
                  {capturedPhoto ? 'Punch In' : 'Capture Photo First'}
                </>
              )}
            </span>
          </button>

          <p className="text-center text-emerald-600/40 text-[9px] font-bold uppercase tracking-widest mt-3">
            Photo + Location + Time are recorded
          </p>
        </div>

        <p className="mt-6 text-emerald-800/40 text-[9px] font-black uppercase tracking-[0.4em]">
          VillagKart Attendance System
        </p>
      </div>
    </div>
  );
}
