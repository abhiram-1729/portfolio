import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Truck,
  Package,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ShoppingCart,
  Coins,
  MapPin,
  Bell,
  Target,
  Box,
  Receipt,
  PieChart,
  Briefcase
} from 'lucide-react';

import { useUserStore } from '../../store/userStore';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationPopover from '../admin/NotificationPopover';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logo from '../../assets/VillagKart_Logo.png';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function TenantLayout() {
  const { clearUser, user } = useUserStore();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  const navItems = [
    { to: '/tenant', icon: LayoutDashboard, label: 'Organization', end: true },
    { to: '/tenant/admins', icon: Briefcase, label: 'Admin Management' },
    { to: '/tenant/users', icon: Users, label: 'All Staff' },
    { to: '/tenant/vehicles', icon: Truck, label: 'Fleet' },
    { to: '/tenant/reports', icon: BarChart3, label: 'Analytics' },
    { to: '/tenant/notifications', icon: Bell, label: 'System Logs' },
    { to: '/tenant/settings', icon: Settings, label: 'Org Settings' },
  ];

  return (
    <div className="min-h-screen bg-emerald-50/30 flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-emerald-100 px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img src={logo} alt="VillagKart" className="h-10 w-auto" />
          <div className="h-6 w-[1.5px] bg-emerald-100 hidden md:block" />
          <h1 className="text-lg font-black text-emerald-600 hidden md:block uppercase tracking-tight">Tenant Portal</h1>
        </div>
        
        <div className="flex items-center gap-4 relative">
          <div className="flex flex-col items-end hidden sm:flex">
             <span className="text-sm font-black text-slate-900">{user?.tenantName || 'Organization'}</span>
             <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">{user?.name}</span>
          </div>

          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative p-2 transition-colors rounded-xl ${isNotifOpen ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}
          >
            <Bell size={20} strokeWidth={2.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-black text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <NotificationPopover 
            isOpen={isNotifOpen} 
            onClose={() => setIsNotifOpen(false)} 
          />

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-emerald-50 flex-col shadow-xl z-40">
        <div className="p-6 mb-4 flex items-center gap-3 border-b border-emerald-50">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <h2 className="text-lg font-black text-emerald-600 leading-tight">Tenant</h2>
            <p className="text-[10px] text-orange-500 uppercase tracking-widest font-black">Control Center</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-black transition-all duration-300",
                isActive
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={18} strokeWidth={isActive ? 3 : 2} />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-6 mt-auto border-t border-emerald-50">
           <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                 <Target size={18} />
              </div>
              <div>
                 <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Growth Plan</p>
                 <p className="text-xs font-black text-orange-950 uppercase tracking-tighter">Strategic</p>
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-emerald-100 flex items-center justify-around px-2 py-3 md:hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] rounded-t-[2.5rem]">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all duration-300 min-w-[64px]",
              isActive ? "text-emerald-600 scale-110" : "text-slate-400"
            )}
          >
            {({ isActive }) => (
              <>
                <div className={cn("p-2 rounded-xl transition-all", isActive && "bg-emerald-50")}>
                  <item.icon size={20} className={cn(isActive && "stroke-[3px]")} />
                </div>
                <span className="text-[9px] font-black uppercase tracking-tighter">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-300 min-w-[64px]",
            isMobileMenuOpen ? "text-emerald-600" : "text-slate-400"
          )}
        >
          <div className={cn("p-2 rounded-xl", isMobileMenuOpen && "bg-emerald-50")}>
            <Menu size={20} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">More</span>
        </button>
      </nav>

      {/* Mobile Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-emerald-950/20 backdrop-blur-sm md:hidden flex items-end" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="w-full bg-white rounded-t-[3rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-500"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">Organization</h3>
                <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none mt-1">Strategic Management</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="w-10 h-10 bg-emerald-50 flex items-center justify-center rounded-2xl text-emerald-400">
                <X size={20} strokeWidth={3} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {navItems.slice(4).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex flex-col gap-3 p-5 rounded-3xl border transition-all duration-300",
                    isActive
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xl shadow-emerald-600/20"
                      : "bg-emerald-50/50 text-slate-600 border-transparent active:bg-emerald-100"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={24} strokeWidth={isActive ? 3 : 2} />
                      <span className="text-sm font-black tracking-tight">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
