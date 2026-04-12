import React from 'react';
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
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
  Store,
  ChevronDown
} from 'lucide-react';

import { useUserStore } from '../../store/userStore';
import { useNotificationStore } from '../../store/notificationStore';
import NotificationPopover from './NotificationPopover';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logo from '../../assets/VillagKart_Logo.png';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function AdminLayout() {
  const { clearUser, user } = useUserStore();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [searchParams] = useSearchParams();
  const activeStoreId = searchParams.get('storeId');
  const activeStoreName = searchParams.get('storeName');
  
  const displayStoreName = activeStoreName || user?.storeName || user?.tenantName || 'VillagKart';

  const appendParams = (path) => {
    if (!activeStoreId) return path;
    const separator = path.includes('?') ? '&' : '?';
    return `${path}${separator}storeId=${activeStoreId}&storeName=${activeStoreName || ''}`;
  };

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/admin/users', icon: Users, label: 'Users' },
    { to: '/admin/vehicles', icon: Truck, label: 'Vehicles' },
    { to: '/admin/routes', icon: MapPin, label: 'Routes' },
    { to: '/admin/inventory', icon: Package, label: 'Inventory' },
    { to: '/admin/sales', icon: ShoppingCart, label: 'Sales History' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/admin/cash', icon: Coins, label: 'Cash Flow' },
    { to: '/admin/targets', icon: Target, label: 'Targets' },
    { to: '/admin/assets', icon: Box, label: 'Assets' },
    { to: '/admin/expenses', icon: Receipt, label: 'Expenses' },
    { to: '/admin/finance-reports', icon: PieChart, label: 'Finance Reports' },
    { to: '/admin/notifications', icon: Bell, label: 'Notifications' },
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="VillagKart" className="h-10 w-auto" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">VillagKart</span>
            <h1 className="text-xl font-black text-emerald-600 leading-none">Admin Portal</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          <NotificationPopover 
            isOpen={isNotifOpen} 
            onClose={() => setIsNotifOpen(false)} 
          />
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={`relative p-2 transition-colors rounded-full ${isNotifOpen ? 'bg-emerald-50 text-emerald-600' : 'text-gray-500 hover:text-emerald-600'}`}
          >
            <Bell size={22} strokeWidth={2.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 transition-all rounded-xl hover:bg-red-50"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>


      {/* Desktop Sidebar - Non-scrollable Single Screen */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-64 bg-white border-r border-gray-200 flex-col z-40">
        {/* Sidebar Header: Store Info */}
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
                <Store size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-black text-gray-900 leading-tight truncate">
                  {displayStoreName}
                </h2>
                <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Admin Portal</p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation - Flex Grow but hide scrollbar */}
        <div className="flex-1 overflow-y-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <nav className="space-y-0.5 pb-6">
            <p className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Management</p>
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={appendParams(item.to)}
                end={item.end}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200",
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
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

        {/* Sidebar Footer: Admin Profile Data */}
        <div className="p-4 border-t border-gray-50 bg-gray-50/30">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm mb-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100/50">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-black text-gray-900 truncate tracking-tight">{user?.name}</span>
              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{user?.role}</span>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-3 md:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={appendParams(item.to)}
            end={item.end}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 transition-all duration-200 min-w-[64px]",
              isActive ? "text-emerald-600" : "text-gray-400"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} className={cn(isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
        {/* More button for reports/settings on mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className={cn(
            "flex flex-col items-center gap-1 transition-all duration-200 min-w-[64px]",
            isMobileMenuOpen ? "text-emerald-600" : "text-gray-400"
          )}
        >
          <Menu size={20} />
          <span className="text-[10px] font-medium">Menu</span>
        </button>
      </nav>

      {/* Mobile Overlay Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="absolute bottom-16 left-4 right-4 bg-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4 pb-2 border-b">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">VillagKart</span>
                <span className="font-bold text-gray-900">Admin Portal</span>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {navItems.slice(5).map((item) => (
                <NavLink
                  key={item.to}
                  to={appendParams(item.to)}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium border transition-all duration-200",
                    isActive
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                      {item.label}
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
