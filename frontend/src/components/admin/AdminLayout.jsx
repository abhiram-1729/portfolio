import React from 'react';
import { NavLink, Link, Outlet, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ChevronRight,
  ClipboardList,
  History as HistoryIcon,
  AlertTriangle,
  Link2,
  BookOpen,
  CreditCard,
  Grid,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckSquare,
  PlusCircle,
  Clock,
  Layers,
  Calendar,
  Navigation,
  RotateCcw,
  FileText,
  Zap
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
  const location = useLocation();
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

  const rawNavItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, module: 'DASHBOARD' },
    {
      label: 'Operation',
      icon: ClipboardList,
      subItems: [
        { to: '/admin/users', icon: Users, label: 'Users', module: 'STAFF' },
        { to: '/admin/vehicles', icon: Truck, label: 'Vehicles', module: 'VEHICLES' },
        { to: '/admin/routes', icon: MapPin, label: 'Routes', module: 'ROUTES' },
      ]
    },
    { to: '/admin/sales', icon: ShoppingCart, label: 'Sales History', module: 'SALES' },
    {
      label: 'Inventory',
      icon: Package,
      module: 'INVENTORY',
      subItems: [
        { to: '/admin/inventory?tab=master', label: 'Master', icon: Grid },
        { to: '/admin/inventory?tab=inventory', label: 'Store Stock', icon: Package },
        // { to: '/admin/inventory?tab=return&sub=opening', label: 'Opening Stock', icon: ClipboardList },
        { to: '/admin/inventory?tab=return&sub=tracking', label: 'Vehicle Stock', icon: Truck },
        { to: '/admin/inventory?tab=return&sub=loading', label: 'Loading', icon: ArrowUpCircle },
        { to: '/admin/inventory?tab=return&sub=return', label: 'Return', icon: ArrowDownCircle },
        { to: '/admin/inventory?tab=return&sub=refills', label: 'Refills', icon: Package },
        { to: '/admin/damage', label: 'Damage', icon: AlertTriangle },
        { to: '/admin/inventory?tab=return&sub=audits', label: 'Audits', icon: CheckSquare },
      ]
    },
    { to: '/admin/activity-logs', icon: HistoryIcon, label: 'Activity Logs', module: 'ADMIN' },
    { to: '/admin/attendance', icon: Clock, label: 'Attendance', module: 'STAFF' },
    {
      label: 'Reports',
      icon: BarChart3,
      module: 'REPORTS',
      subItems: [
        { to: '/admin/reports/overview', label: 'Overview', icon: BarChart3 },
        { to: '/admin/reports/item-wise', label: 'Item-wise Sales', icon: Package },
        { to: '/admin/reports/category-wise', label: 'Category-wise', icon: Layers },
        { to: '/admin/reports/day-wise', label: 'Day-wise Sales', icon: Calendar },
        { to: '/admin/reports/route-village', label: 'Route & Village', icon: MapPin },
        { to: '/admin/reports/agent-performance', label: 'Agent Performance', icon: Users },
        { to: '/admin/reports/location-tracking', label: 'Location Tracking', icon: Navigation },
        { to: '/admin/reports/vehicle-wise', label: 'Substore (Vehicle)', icon: Truck },
        { to: '/admin/reports/payment-mode', label: 'Payment Mode', icon: CreditCard },
        { to: '/admin/reports/returns', label: 'Return Report', icon: RotateCcw },
        { to: '/admin/reports/damages', label: 'Damage Report', icon: AlertTriangle },
        { to: '/admin/reports/sessions', label: 'Session Report', icon: Zap },
        { to: '/admin/reports/invoices', label: 'Invoice Report', icon: FileText },
      ]
    },
    { to: '/admin/cash', icon: Coins, label: 'Cash Flow', module: 'CASH' },
    { to: '/admin/targets', icon: Target, label: 'Targets', module: 'TARGETS' },
    { to: '/admin/assets', icon: Box, label: 'Assets', module: 'ASSETS' },
    { to: '/admin/expenses', icon: Receipt, label: 'Expenses', module: 'EXPENSES' },
    {
      label: 'Procurement',
      icon: ClipboardList,
      module: 'PROCUREMENT',
      subItems: [
        { to: '/admin/procurement?tab=vendors', icon: Users, label: 'Vendors' },
        { to: '/admin/procurement?tab=mapping', icon: Link2, label: 'Item Mapping' },
        { to: '/admin/procurement?tab=po', icon: ClipboardList, label: 'Purchase Orders' },
        { to: '/admin/procurement?tab=grn', icon: Truck, label: 'Goods Receipt' },
        { to: '/admin/procurement?tab=purchases', icon: Receipt, label: 'Purchases' },
        { to: '/admin/procurement?tab=ledger', icon: BookOpen, label: 'Stock Ledger' },
        { to: '/admin/procurement?tab=payments', icon: CreditCard, label: 'Payments' },
        { to: '/admin/procurement?tab=reports', icon: BarChart3, label: 'Reports' },
      ]
    },
    { to: '/admin/finance-reports', icon: PieChart, label: 'Finance Reports', module: 'REPORTS' },
  ];

  const navItems = rawNavItems.map(item => {
    if (item.subItems) {
      const filteredSubItems = item.subItems.filter(sub => {
        const requiredModule = sub.module || item.module;
        if (!requiredModule || user?.role === 'TENANT_OWNER' || (user?.role === 'ADMIN' && !user?.customRoleId)) return true;
        return (user?.permissions?.[requiredModule] || []).includes('READ');
      });
      return { ...item, subItems: filteredSubItems };
    }
    return item;
  }).filter(item => {
    if (item.subItems) return item.subItems.length > 0;
    if (!item.module || user?.role === 'TENANT_OWNER' || (user?.role === 'ADMIN' && !user?.customRoleId)) return true;
    return (user?.permissions?.[item.module] || []).includes('READ');
  });

  const [openMenus, setOpenMenus] = React.useState({
    Procurement: location.pathname.startsWith('/admin/procurement'),
    Inventory: location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/damage'),
    Operation: location.pathname.startsWith('/admin/users') || location.pathname.startsWith('/admin/vehicles') || location.pathname.startsWith('/admin/routes'),
    'Return & Stock': location.search.includes('tab=return'),
    Reports: location.pathname.startsWith('/admin/reports')
  });

  const toggleMenu = (label) => {
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const getRequiredModule = (pathname) => {
    if (pathname === '/admin') return 'DASHBOARD';
    if (pathname.startsWith('/admin/users')) return 'STAFF';
    if (pathname.startsWith('/admin/vehicles')) return 'VEHICLES';
    if (pathname.startsWith('/admin/routes')) return 'ROUTES';
    if (pathname.startsWith('/admin/sales')) return 'SALES';
    if (pathname.startsWith('/admin/inventory')) return 'INVENTORY';
    if (pathname.startsWith('/admin/damage')) return 'INVENTORY';
    if (pathname.startsWith('/admin/reports') || pathname.startsWith('/admin/finance-reports')) return 'REPORTS';
    if (pathname.startsWith('/admin/cash')) return 'CASH';
    if (pathname.startsWith('/admin/targets')) return 'TARGETS';
    if (pathname.startsWith('/admin/assets')) return 'ASSETS';
    if (pathname.startsWith('/admin/expenses')) return 'EXPENSES';
    if (pathname.startsWith('/admin/procurement')) return 'PROCUREMENT';
    if (pathname.startsWith('/admin/activity-logs')) return 'ADMIN';
    if (pathname.startsWith('/admin/attendance')) return 'STAFF';
    return null;
  };

  const currentModule = getRequiredModule(location.pathname);
  
  const isAuthorizedRoute = () => {
    if (!currentModule || user?.role === 'TENANT_OWNER' || (user?.role === 'ADMIN' && !user?.customRoleId)) return true;
    const perms = user?.permissions?.[currentModule] || [];
    return perms.includes('READ');
  };


  const isPOS = location.pathname === '/admin/pos';

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0",
      !isPOS && "md:pl-64"
    )}>
      {/* Header */}
      {!isPOS && (
      <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="VillagKart" className="h-10 w-auto" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">VillagKart</span>
            <h1 className="text-xl font-black text-emerald-600 leading-none">Admin Portal</h1>
          </div>
        </div>
        <div className="flex items-center gap-4 relative">
          <Link
            to={appendParams('/admin/pos')}
            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors rounded-full hover:bg-emerald-50 flex items-center gap-2 pr-4 pl-3"
            title="Point of Sale"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <PlusCircle size={18} strokeWidth={3} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">POS</span>
          </Link>

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
              <span className="absolute -top-1 -right-1 flex min-w-[20px] h-[20px] px-1.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white shadow-lg shadow-red-500/10 z-10 transition-all">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate('/admin/settings')}
            className="p-2 text-gray-500 hover:text-emerald-600 transition-colors rounded-full hover:bg-emerald-50"
            title="Admin Settings"
          >
            <Settings size={22} strokeWidth={2.5} />
          </button>

          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-600 transition-all rounded-xl hover:bg-red-50"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>
      )}


      {/* Desktop Sidebar - Non-scrollable Single Screen */}
      {!isPOS && (
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
            {navItems.map((item) => {
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isMenuOpen = openMenus[item.label];

              if (hasSubItems) {
                return (
                  <div key={item.label} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200",
                        (location.pathname.startsWith('/admin/procurement') && item.label === 'Procurement') ||
                          ((location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/damage')) && item.label === 'Inventory') ||
                          ((location.pathname.startsWith('/admin/users') || location.pathname.startsWith('/admin/vehicles') || location.pathname.startsWith('/admin/routes')) && item.label === 'Operation')
                          ? "bg-emerald-50 text-emerald-700 font-black shadow-sm border-l-4 border-emerald-600 rounded-r-xl rounded-l-none"
                          : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent rounded-r-xl rounded-l-none"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={16} strokeWidth={2.5} />
                        {item.label}
                      </div>
                      <ChevronDown
                        size={14}
                        className={cn("transition-transform duration-200", isMenuOpen ? "rotate-0" : "-rotate-90")}
                      />
                    </button>
                    {isMenuOpen && (
                      <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-200 border-l border-emerald-50 ml-6">
                        {item.subItems.map((sub) => {
                          const hasNestedItems = sub.subItems && sub.subItems.length > 0;
                          const isNestedOpen = openMenus[sub.label];

                          if (hasNestedItems) {
                            const isNestedActive = location.pathname === '/admin/inventory' && searchParams.get('tab') === 'return';
                            return (
                              <div key={sub.label} className="space-y-0.5">
                                <button
                                  onClick={() => toggleMenu(sub.label)}
                                  className={cn(
                                    "flex items-center justify-between gap-3 px-4 py-1.5 w-full rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                    isNestedActive ? "text-emerald-600" : "text-gray-400 hover:text-gray-600"
                                  )}
                                >
                                  <div className="flex items-center gap-3">
                                    <sub.icon size={14} strokeWidth={2.5} />
                                    {sub.label}
                                  </div>
                                  <ChevronDown
                                    size={12}
                                    className={cn("transition-transform duration-200", isNestedOpen ? "rotate-0" : "-rotate-90")}
                                  />
                                </button>
                                {isNestedOpen && (
                                  <div className="pl-4 space-y-0.5 border-l border-emerald-50 ml-6 animate-in slide-in-from-top-1">
                                    {sub.subItems.map(nested => {
                                      const isTarget = location.pathname === '/admin/inventory' && searchParams.get('tab') === 'return' && searchParams.get('sub') === new URLSearchParams(nested.to.split('?')[1]).get('sub');
                                      return (
                                        <NavLink
                                          key={nested.to}
                                          to={appendParams(nested.to)}
                                          className={cn(
                                            "flex items-center gap-3 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                                            isTarget
                                              ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                              : "text-gray-400 hover:text-gray-600"
                                          )}
                                        >
                                          <nested.icon size={12} strokeWidth={isTarget ? 3 : 2.5} />
                                          {nested.label}
                                        </NavLink>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const isProcurement = location.pathname === '/admin/procurement';
                          const isInventoryPath = location.pathname === '/admin/inventory';
                          const isDamagePath = location.pathname === '/admin/damage';

                          let isActive = false;
                          if (isProcurement && item.label === 'Procurement') {
                            isActive = searchParams.get('tab') === new URLSearchParams(sub.to.split('?')[1]).get('tab');
                          } else if (item.label === 'Inventory') {
                            if (sub.to === '/admin/damage') {
                              isActive = isDamagePath;
                            } else if (isInventoryPath) {
                              const targetTab = new URLSearchParams(sub.to.split('?')[1]).get('tab');
                              const targetSub = new URLSearchParams(sub.to.split('?')[1]).get('sub');
                              isActive = searchParams.get('tab') === targetTab && (!targetSub || searchParams.get('sub') === targetSub);
                            }
                          } else if (item.label === 'Operation' || item.label === 'Reports') {
                            isActive = location.pathname === sub.to;
                          }

                          return (
                            <NavLink
                              key={sub.to}
                              to={appendParams(sub.to)}
                              className={cn(
                                "flex items-center gap-3 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                isActive
                                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
                                  : "text-gray-400 hover:bg-gray-50 hover:text-gray-600"
                              )}
                            >
                              <sub.icon size={14} strokeWidth={isActive ? 3 : 2.5} />
                              {sub.label}
                              {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-white animate-pulse" />}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <NavLink
                  key={item.to}
                  to={appendParams(item.to)}
                  end={item.end}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-r-xl rounded-l-none border-l-4",
                    isActive
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 border-emerald-600"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent"
                  )}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon size={16} strokeWidth={isActive ? 3 : 2} />
                      {item.label}
                    </>
                  )}
                </NavLink>
              );
            })}
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
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-x-hidden">
        {isAuthorizedRoute() ? (
          <Outlet />
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-[2rem] border border-gray-100 shadow-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mb-6 border-8 border-rose-50/50">
              <AlertTriangle size={32} strokeWidth={2.5} />
            </div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Access Denied</h2>
            <p className="text-gray-500 font-medium tracking-wide text-center max-w-sm mb-8">
              You do not have the required privileges to view this section. Please contact your administrator.
            </p>
            <button 
              onClick={() => navigate('/admin')}
              className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              Return to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      {!isPOS && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 flex items-center justify-around px-2 py-3 md:hidden">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to || item.label}
            to={appendParams(item.to || '#')}
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
      )}

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
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {navItems.slice(5).map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;

                if (hasSubItems) {
                  return (
                    <div key={item.label} className="col-span-2 space-y-2 mt-2">
                      <div className="flex items-center gap-2 px-2 py-1">
                        <item.icon size={16} className="text-emerald-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {item.subItems.map((sub) => (
                          <NavLink
                            key={sub.to}
                            to={appendParams(sub.to)}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={({ isActive }) => cn(
                              "flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold border transition-all",
                              isActive
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-gray-50 text-gray-500 border-transparent"
                            )}
                          >
                            <sub.icon size={16} />
                            {sub.label}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
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
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
