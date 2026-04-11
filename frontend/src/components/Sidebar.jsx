import React from 'react';
import { X, MapPin, Truck, BarChart, User, LogOut, Package, Wallet, Calendar, ChevronRight, PackageSearch, Target, Box, Store } from 'lucide-react';
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
    { name: 'Sales Grid', path: '/', icon: PackageSearch, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { name: 'Today\'s Plan', path: '/today-plan', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { name: 'Vehicle & Stock', path: `/agent-inventory/${user?.assignedVehicleId}`, icon: Truck, color: 'text-slate-600', bg: 'bg-slate-50' },
    { name: 'Cash Reconciliation', path: '/closing-cash', icon: Wallet, color: 'text-orange-600', bg: 'bg-orange-50' },
    { name: 'Cash Wallet', path: '/wallet', icon: Wallet, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { name: 'Sales Analytics', path: '/reports', icon: BarChart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'My Targets', path: '/targets', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50' },
    { name: 'My Assets', path: '/my-assets', icon: Box, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { name: 'My Profile', path: '/profile', icon: User, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Drawer */}
      <div className={`fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-white z-[70] transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col pt-[calc(var(--safe-top)+1rem)]`}>
        
        {/* Store Context Layer */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Store size={14} className="text-emerald-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Store Context</span>
          </div>
          
          <div className="group relative flex items-center gap-4 p-4 bg-emerald-50/50 rounded-[2rem] border border-emerald-100/50 shadow-sm transition-all hover:bg-emerald-50">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200/50">
              <Store size={22} strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
               <h3 className="text-base font-black text-slate-900 tracking-tight truncate leading-tight">
                 {user?.storeName || user?.tenantName || 'VillagKart'}
               </h3>
               <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">Sales Outlet</p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center justify-between px-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Merchant Portal</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>

        {/* User Profile Summary */}
        <div className="mx-6 p-3 rounded-2xl bg-slate-50 border border-slate-100 mb-4 flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
            <User size={20} strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-slate-900 truncate tracking-tight font-sans uppercase">{user?.name}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="p-2.5 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90"
            title="Logout"
          >
            <LogOut size={16} strokeWidth={3} />
          </button>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-4 pb-4">
          <div className="space-y-1">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Operations</p>
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all active:scale-[0.98] ${isActive 
                    ? `${item.bg} ${item.color} shadow-sm border border-${item.color.split('-')[1]}-100` 
                    : 'text-slate-600 hover:bg-slate-50'}`}
                >
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-white shadow-sm' : 'bg-transparent'}`}>
                    <item.icon size={18} strokeWidth={isActive ? 3 : 2.5} />
                  </div>
                  <span className="flex-1 font-black text-[0.85rem] tracking-tight">{item.name}</span>
                  {isActive && <ChevronRight size={14} strokeWidth={3} />}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="px-4 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">System</p>
            <div className="px-4 py-2 text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
              Synchronized Access
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-8 border-t border-slate-50">
           <div className="flex items-center justify-between opacity-30 font-black text-[8px] uppercase tracking-[0.3em] text-slate-500">
             <span>VillagKart</span>
             <span>v1.0.4</span>
           </div>
        </div>

      </div>
    </>
  );
}
