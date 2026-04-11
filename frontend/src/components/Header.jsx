import { ShoppingCart, LogOut, User, BarChart, LayoutDashboard, Truck, MapPin, Bell, Menu, ArrowLeft, Home, PackageSearch } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { useNotificationStore } from '../store/notificationStore';
import { useNavigate, Link, useLocation } from 'react-router-dom';

import logo from '../assets/VillagKart_Logo.png';

export default function Header({ onMenuClick }) {
  const { user } = useUserStore();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const navigate = useNavigate();
  const location = useLocation();
  const isRoot = location.pathname === '/';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-100 pt-[calc(var(--safe-top)+0.5rem)] pb-2 transition-all duration-300 shadow-sm">
      <div className="max-w-lg mx-auto px-4 flex items-center justify-between">
        
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
                 className="p-2.5 rounded-xl text-slate-600 active:scale-90 transition-all hover:bg-white flex items-center justify-center"
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

            <Link to="/notifications" className="relative p-2 rounded-xl hover:bg-white active:scale-90 transition-all text-slate-500 flex items-center justify-center">
              <Bell size={20} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white border-2 border-white shadow-sm animate-bounce-subtle">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
          </div>
        </div>

      </div>
    </header>
  );
}
