import { ShoppingCart, LogOut, User, BarChart, LayoutDashboard, Truck, MapPin, Bell, Menu, ArrowLeft, Home, PackageSearch } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { useNotificationStore } from '../store/notificationStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import PunchOutModal from './PunchOutModal';

import logo from '../assets/VillagKart_Logo.png';

export default function Header({ onMenuClick }) {
  const { user } = useUserStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  const [attendance, setAttendance] = useState(null);
  const [durationHours, setDurationHours] = useState(0);
  const [showPunchOut, setShowPunchOut] = useState(false);

  useEffect(() => {
    if (user?.role === 'SALES_AGENT') {
      attendanceAPI.getToday().then(({ data }) => {
        if (data.punchedIn && data.attendance?.status === 'ACTIVE') {
          setAttendance(data.attendance);
        }
      }).catch(console.error);
    }
  }, [user]);

  useEffect(() => {
    if (!attendance?.punchInTime) return;
    
    const updateTime = () => {
      const now = new Date();
      const punchInTime = new Date(attendance.punchInTime);
      const diffMs = now - punchInTime;
      const hours = diffMs / (1000 * 60 * 60);
      setDurationHours(hours);
    };
    
    updateTime();
    const timer = setInterval(updateTime, 60000); // update every minute
    return () => clearInterval(timer);
  }, [attendance]);

  const handlePunchOutSuccess = (completedAttendance) => {
    setAttendance(null); // Hide button
    setShowPunchOut(false);
  };

  const isEarly = durationHours < 9;
  const hoursText = durationHours > 0 ? durationHours.toFixed(1) + 'h' : '0.0h';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 pt-[calc(var(--safe-top)+0.5rem)] pb-2 transition-all duration-300 shadow-sm">
      <div className="max-w-lg md:max-w-none mx-auto px-4 md:px-8 flex items-center justify-between">
        
        <div className="flex items-center gap-2">
          {/* Main Action Hub - Left */}
          <div className="flex items-center gap-1 bg-slate-50/80 backdrop-blur-md p-1 rounded-2xl border border-slate-100/50 shadow-inner">
             {/* Back Button - Contextual */}
             {!isRoot && (
               <button 
                 onClick={() => navigate(-1)}
                 className="p-2 rounded-xl bg-white text-emerald-600 active:scale-90 transition-all border border-emerald-100/50 shadow-sm flex items-center justify-center group"
               >
                 <ArrowLeft size={20} strokeWidth={3} className="group-hover:-translate-x-0.5 transition-transform" />
               </button>
             )}

             {/* Hamburger Menu Button */}
             {user?.role === 'SALES_AGENT' && (
               <button 
                 onClick={onMenuClick}
                 className="p-2.5 rounded-xl text-slate-600 active:scale-90 transition-all hover:bg-white flex items-center justify-center md:hidden"
               >
                 <Menu size={22} strokeWidth={2.5} />
               </button>
             )}
          </div>

          <Link to="/" className="flex items-center gap-2 group ml-1">
            <img src={logo} alt="VillagKart" className="h-7 w-auto object-contain drop-shadow-sm group-active:scale-95 transition-transform" />
            <div className="hidden xs:flex flex-col">
              <span className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none mb-0.5">{user?.storeName || user?.tenantName || 'VillagKart'}</span>
              <span className="text-[10px] font-bold text-emerald-950 leading-none truncate max-w-[80px]">{user?.name}</span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Action Hub - Right */}
          <div className="flex items-center gap-1 bg-slate-50/80 backdrop-blur-md p-1 rounded-2xl border border-slate-100/50 shadow-inner">
            
            {/* Direct Sales Entry Button (requested) */}
            <Link to="/" className={`p-2 rounded-xl transition-all active:scale-90 flex items-center justify-center ${isRoot ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-slate-500 hover:bg-white'}`}>
              <PackageSearch size={20} strokeWidth={2.5} />
            </Link>

            {/* Punch Out Button */}
            {attendance && (
              <button 
                onClick={() => setShowPunchOut(true)}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-2 border font-bold text-xs transition-all hover:shadow-md active:scale-95 ${
                  isEarly 
                    ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-orange-500/10' 
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-emerald-500/10'
                }`}
              >
                 <LogOut size={16} strokeWidth={2.5} className={isEarly ? 'text-orange-500' : 'text-emerald-500'} />
                 <div className="hidden xs:flex flex-col items-start leading-none">
                   <span className="text-[10px] uppercase tracking-wider font-black">Punch Out</span>
                   <span className="text-[8px] opacity-80 font-bold">{hoursText} ({isEarly ? 'Early' : 'On-Time'})</span>
                 </div>
              </button>
            )}

            <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white active:scale-90 transition-all text-slate-500 flex items-center justify-center">
              <Bell size={20} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex min-w-[18px] h-[18px] px-1.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border-2 border-white shadow-lg shadow-red-500/20 z-10 animate-bounce-subtle">
                  {unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

      </div>

      {showPunchOut && (
        <PunchOutModal 
          onClose={() => setShowPunchOut(false)} 
          onPunchOut={handlePunchOutSuccess} 
        />
      )}
    </header>
  );
}
