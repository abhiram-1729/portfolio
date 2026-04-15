import React from 'react';
import { X, MapPin, Truck, BarChart, User, LogOut, Package, Wallet, Calendar, ChevronRight, PackageSearch, Target, Box, Store, History } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/userStore';

export default function Sidebar({ isOpen, onClose }) {
  const { user, clearUser } = useUserStore();
  const location = useLocation();

  const handleLogout = () => {
    clearUser();
    onClose();
  };

  const menuItems = [
    { name: 'Sales Grid', path: '/', icon: PackageSearch, color: 'text-emerald-600', bg: 'bg-emerald-50', module: 'SALES' },
    { name: 'Today\'s Plan', path: '/today-plan', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', module: 'ROUTES' },
    { name: 'Vehicle & Stock', path: user?.assignedVehicleId ? `/agent-inventory/${user.assignedVehicleId}` : '/agent-inventory/none', icon: Truck, color: user?.assignedVehicleId ? 'text-slate-600' : 'text-rose-400', bg: user?.assignedVehicleId ? 'bg-slate-50' : 'bg-rose-50', module: 'INVENTORY' },
    { name: 'Cash Reconciliation', path: '/closing-cash', icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50', module: 'CASH' },
    { name: 'Cash Wallet', path: '/wallet', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50', module: 'CASH' },
    { name: 'Sales Analytics', path: '/reports', icon: BarChart, color: 'text-blue-600', bg: 'bg-blue-50', module: 'REPORTS' },
    { name: 'My Targets', path: '/targets', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', module: 'TARGETS' },
    { name: 'My Assets', path: '/my-assets', icon: Box, color: 'text-cyan-600', bg: 'bg-cyan-50', module: 'ASSETS' },
    { name: 'My Activities', path: '/activity-logs', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { name: 'My Profile', path: '/profile', icon: User, color: 'text-purple-600', bg: 'bg-purple-50' }, // Profile is always allowed
  ].filter(item => {
    if (!item.module || user?.role === 'TENANT_OWNER') return true;
    const perms = user?.permissions?.[item.module] || [];
    return perms.includes('READ');
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Desktop (Fixed) & Mobile (Drawer) */}
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-200 flex flex-col z-[70] transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} h-screen overflow-hidden`}>
        
        {/* Store Context Layer */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3">
            <Store size={14} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Store Context</span>
          </div>
          
          <div className="group relative flex items-center gap-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50 shadow-sm transition-all hover:bg-emerald-50">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/50">
              <Store size={20} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="text-sm font-black text-slate-900 tracking-tight truncate leading-tight">
                 {user?.storeName || user?.tenantName || 'VillagKart'}
               </h3>
               <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Sales Outlet</p>
            </div>
          </div>
        </div>

        {/* Navigation Content - Flex Grow with hidden scrollbar */}
        <div className="flex-1 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden pb-8">
          <div className="space-y-0.5">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Operations</p>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive 
                    ? `bg-emerald-600 text-white shadow-lg shadow-emerald-200` 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <item.icon size={16} strokeWidth={isActive ? 3 : 2.5} className={isActive ? 'text-white' : item.color} />
                  <span className="flex-1 font-black text-xs uppercase tracking-wide">{item.name}</span>
                  {isActive && <ChevronRight size={14} strokeWidth={3} className="text-white/50" />}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">System Status</p>
            <div className="px-4 py-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Synchronized</span>
            </div>
          </div>
        </div>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="mx-2 p-3 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-sm border border-emerald-100/50 shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black text-slate-900 truncate tracking-tight uppercase leading-none">{user?.name}</p>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate mt-1">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-5 py-2.5 mt-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"
          >
            <LogOut size={14} strokeWidth={3} />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>
    </>
  );
}
