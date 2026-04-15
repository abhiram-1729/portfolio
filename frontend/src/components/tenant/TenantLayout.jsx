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
  Briefcase,
  Store,
  Shield,
  History as HistoryIcon
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
    { to: '/tenant/stores', icon: Store, label: 'Stores' },
    { to: '/tenant/admins', icon: Briefcase, label: 'Management' },
    { to: '/tenant/privileges', icon: Shield, label: 'Privileges' },
    { to: '/tenant/vehicles', icon: Truck, label: 'Fleet' },
    { to: '/tenant/reports', icon: BarChart3, label: 'Analytics' },
    { to: '/tenant/activity-logs', icon: HistoryIcon, label: 'Audit Trail' },
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
              <span className="absolute -top-1 -right-1 flex min-w-[20px] h-[20px] px-1.5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-black text-white border-2 border-white shadow-lg shadow-orange-500/10 z-10 transition-all">
                {unreadCount}
              </span>
            )}
          </button>

          <NotificationPopover
            isOpen={isNotifOpen}
            onClose={() => setIsNotifOpen(false)}
            basePath="/tenant/notifications"
          />

          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-orange-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar - Fixed & Non-scrollable */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-emerald-50 flex-col z-40">
        {/* Compact Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-100">
              <Store size={20} strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[11px] font-black text-slate-900 leading-tight tracking-tight uppercase">Master Control</h2>
              <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest leading-none">Global Network</p>
            </div>
          </div>
        </div>

        {/* Navigation - Single Screen & Hidden Scrollbar */}
        <div className="flex-1 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-6">
          <p className="px-4 py-3 text-[9px] font-black text-slate-400 border-t border-emerald-50/50 uppercase tracking-[0.2em] mb-1">Infrastructure</p>
          <nav className="space-y-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300",
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={16} strokeWidth={isActive ? 3 : 2} />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Profile Footer - Organization Data */}
        <div className="p-4 border-t border-emerald-50 bg-emerald-50/10">
          <div className="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm mb-3">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100">
                {user?.tenantName?.charAt(0) || 'O'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-slate-900 truncate leading-none mb-1 uppercase tracking-tight">{user?.tenantName}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate">{user?.name}</p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-emerald-50/50">
              <div className="flex flex-col">
                <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest leading-none mb-0.5">Access Level</span>
                <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Super Admin</span>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[8px] font-black border border-emerald-100">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                LIVE
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-orange-50 hover:text-orange-600 transition-all border border-transparent hover:border-orange-100"
          >
            <LogOut size={14} />
            <span>Sign Out Control</span>
          </button>
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
