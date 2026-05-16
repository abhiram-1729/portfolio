import React, { useState } from 'react';
import { X, MapPin, Truck, BarChart, User, LogOut, Package, Wallet, Calendar, ChevronRight, ChevronDown, PackageSearch, Target, Box, Store, History, AlertTriangle, Link2, BookOpen, CreditCard, ClipboardList, Grid, ArrowDownCircle, ArrowUpCircle, CheckSquare, Receipt, Clock, Settings, UserPlus, Map, Tag, ShoppingBag, Landmark, Coins } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUserStore } from '../store/userStore';
import { attendanceAPI } from '../services/api';
import NotificationDropdown from './NotificationDropdown';

export default function Sidebar({ isOpen, onClose }) {
  const { user, clearUser } = useUserStore();
  const location = useLocation();

  const handleLogout = () => {
    import('../services/locationService').then(service => {
      service.stopLiveTracking();
    });
    clearUser();
    onClose();
  };

  const menuItems = [
    { name: 'Sales Grid', path: '/', icon: PackageSearch, color: 'text-emerald-600', bg: 'bg-emerald-50', module: 'AGENT_PORTAL', section: 'SALES_POS' },
    { name: 'Today\'s Plan', path: '/today-plan', icon: Calendar, color: 'text-indigo-600', bg: 'bg-indigo-50', module: 'AGENT_PORTAL', section: 'ROUTE_PLAN' },
    // { name: 'Shift Tracking', path: '/shift-tracking', icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' },
    // { name: 'Refill Stock', path: '/refill-stock', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    // { name: 'Refill Stock', path: '/refill-stock', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Vehicle & Stock', path: user?.assignedVehicleId ? `/agent-inventory/${user.assignedVehicleId}` : '/agent-inventory/none', icon: Truck, color: user?.assignedVehicleId ? 'text-slate-600' : 'text-rose-400', bg: user?.assignedVehicleId ? 'bg-slate-50' : 'bg-rose-50', module: 'AGENT_PORTAL', section: 'AGENT_INVENTORY' },
    {
      name: 'Cash Flow',
      path: '/admin/cash',
      icon: Coins,
      color: 'text-amber-600',
      module: 'CASH',
      isAdmin: true
    },
    {
      name: 'Inventory',
      icon: Package,
      color: 'text-emerald-600',
      module: 'INVENTORY',
      isAdmin: true,
      subItems: [
        { path: '/admin/inventory?tab=master', icon: Grid, name: 'Master', section: 'MASTER' },
        { path: '/admin/inventory?tab=inventory', icon: Truck, name: 'Store Stock', section: 'STORE_STOCK' },
        { path: '/admin/inventory?tab=vehicle-stock', icon: Truck, name: 'Vehicle Stock', section: 'VEHICLE_STOCK' },
        { path: '/admin/inventory?tab=return&sub=loading', icon: ArrowUpCircle, name: 'Loading', section: 'LOADING' },
        { path: '/admin/inventory?tab=return&sub=return', icon: ArrowDownCircle, name: 'Return', section: 'RETURN' },
        { path: '/admin/inventory?tab=return&sub=refills', icon: Package, name: 'Refills', section: 'REFILLS' },
        { path: '/admin/inventory?tab=return&sub=damage', icon: AlertTriangle, name: 'Damage', section: 'DAMAGE' },
        { path: '/admin/inventory?tab=return&sub=trips', icon: History, name: 'Trips/Shifts', section: 'TRIPS' },
        { path: '/admin/inventory?tab=return&sub=fuel', icon: CreditCard, name: 'Fuel Logs', section: 'FUEL' },
        { path: '/admin/inventory?tab=return&sub=maintenance', icon: Settings, name: 'Maintenance', section: 'MAINTENANCE' },
        { path: '/admin/inventory?tab=return&sub=audits', icon: CheckSquare, name: 'Audit History', section: 'AUDITS' },
      ].filter(sub => {
        // HARDCODE BYPASS: Ensure these are ALWAYS visible for debugging
        if (['TRIPS', 'FUEL', 'MAINTENANCE'].includes(sub.section)) return true;

        if (!user?.customRoleId) return true;
        const sections = user?.permissions?.INVENTORY_SECTIONS;
        if (sections && sections[sub.section] !== undefined) {
          return (sections[sub.section] || []).includes('READ');
        }
        if (user?.permissions?.INVENTORY_TARGET_SECTIONS) {
          return user.permissions.INVENTORY_TARGET_SECTIONS.includes(sub.section);
        }
        return true;
      })
    },
    {
      name: 'Vehicles',
      icon: Truck,
      color: 'text-indigo-600',
      module: 'VEHICLES',
      isAdmin: true,
      subItems: [
        { path: '/admin/vehicles?sub=master', icon: Truck, name: 'Vehicle Master' },
        { path: '/admin/vehicles?sub=inventory', icon: Grid, name: 'Fleet Inventory' },
        { path: '/admin/vehicles?sub=loading', icon: ArrowUpCircle, name: 'Stock Loading' },
        { path: '/admin/vehicles?sub=return', icon: ArrowDownCircle, name: 'Stock Return' },
        { path: '/admin/vehicles?sub=refill', icon: Package, name: 'Refill Requests' },
        { path: '/admin/vehicles?sub=closing', icon: Clock, name: 'Shift Closing' },
        { path: '/admin/vehicles?sub=fuel', icon: CreditCard, name: 'Fuel Logs' },
        { path: '/admin/vehicles?sub=maintenance', icon: Settings, name: 'Maintenance' },
        { path: '/admin/vehicles?sub=driver_mapping', icon: UserPlus, name: 'Driver Mapping' },
        { path: '/admin/vehicles?sub=opening_stock', icon: ClipboardList, name: 'Opening Stock' },
        { path: '/admin/vehicles?sub=damages', icon: AlertTriangle, name: 'Vehicle Damages' },
      ]
    },
    {
      name: 'Routes',
      icon: Map,
      color: 'text-emerald-600',
      module: 'ROUTES',
      isAdmin: true,
      subItems: [
        { path: '/admin/routes?tab=villages', icon: MapPin, name: 'Village Master' },
        { path: '/admin/routes?tab=routes', icon: Map, name: 'Route Master' },
        { path: '/admin/vehicles?sub=route_mapping', icon: Link2, name: 'Route Assignments' },
        { path: '/admin/vehicles?sub=sales', icon: ShoppingBag, name: 'Route Sales' },
        { path: '/admin/vehicles?sub=collection', icon: Landmark, name: 'Route Collection' },
      ]
    },
    {
      name: 'Cash Reconciliation',
      path: '/closing-cash',
      icon: Wallet,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      module: 'AGENT_PORTAL',
      section: 'CASH_RECON'
    },
    {
      name: 'Cash Wallet',
      path: '/wallet',
      icon: Wallet,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      module: 'AGENT_PORTAL',
      section: 'AGENT_WALLET'
    },
    { name: 'Sales Analytics', path: '/reports', icon: BarChart, color: 'text-blue-600', bg: 'bg-blue-50', module: 'AGENT_PORTAL', section: 'AGENT_REPORTS' },
    { name: 'Sales History', path: '/sales-history', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-50', module: 'AGENT_PORTAL', section: 'SALES_HISTORY' },
    { name: 'My Targets', path: '/targets', icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', module: 'AGENT_PORTAL', section: 'AGENT_TARGETS' },
    { name: 'My Assets', path: '/my-assets', icon: Box, color: 'text-cyan-600', bg: 'bg-cyan-50', module: 'AGENT_PORTAL', section: 'AGENT_ASSETS' },
    {
      name: 'Report Damage',
      path: '/report-damage',
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      module: 'AGENT_PORTAL',
      section: 'DAMAGE_REPORT'
    },
    { name: 'My Attendance', path: '/attendance', icon: Clock, color: 'text-teal-600', bg: 'bg-teal-50', module: 'AGENT_PORTAL', section: 'AGENT_ATTENDANCE' },
    { name: 'My Activities', path: '/activity-logs', icon: History, color: 'text-emerald-500', bg: 'bg-emerald-50', module: 'AGENT_PORTAL', section: 'AGENT_ACTIVITIES' },
    { name: 'My Profile', path: '/profile', icon: User, color: 'text-purple-600', bg: 'bg-purple-50', module: 'AGENT_PORTAL', section: 'AGENT_PROFILE' },
    {
      name: 'Expenses',
      path: '/admin/expenses',
      icon: Receipt,
      color: 'text-rose-600',
      module: 'EXPENSES',
      isAdmin: true
    },
    {
      name: 'Procurement',
      icon: ClipboardList,
      color: 'text-teal-600',
      module: 'PROCUREMENT',
      isAdmin: true,
      subItems: [
        { path: '/admin/procurement?tab=vendors', icon: User, name: 'Vendors', section: 'VENDORS' },
        { path: '/admin/procurement?tab=mapping', icon: Link2, name: 'Item Mapping', section: 'MAPPING' },
        { path: '/admin/procurement?tab=po', icon: ClipboardList, name: 'Purchase Orders', section: 'PO' },
        { path: '/admin/procurement?tab=grn', icon: Truck, name: 'Goods Receipt', section: 'GRN' },
        { path: '/admin/procurement?tab=purchases', icon: Receipt, name: 'Purchases', section: 'PURCHASES' },
        { path: '/admin/procurement?tab=ledger', icon: BookOpen, name: 'Stock Ledger', section: 'LEDGER' },
        { path: '/admin/procurement?tab=payments', icon: CreditCard, name: 'Payments', section: 'PAYMENTS' },
        { path: '/admin/procurement?tab=reports', icon: BarChart, name: 'Reports', section: 'REPORTS' },
      ].filter(sub => {
        if (!user?.customRoleId) return true;
        const sections = user?.permissions?.PROCUREMENT_SECTIONS;
        if (sections) return (sections[sub.section] || []).includes('READ');
        if (user?.permissions?.PROCUREMENT_TARGET_SECTIONS) {
          return user.permissions.PROCUREMENT_TARGET_SECTIONS.includes(sub.section);
        }
        return true;
      })
    },
    {
      name: 'Delivery Logistics',
      path: '/admin/delivery-logistics',
      icon: Truck,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
      module: 'ADMIN',
      isAdmin: true
    },
    {
      name: 'Offers & Promotions',
      path: '/admin/promotions',
      icon: Tag,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      isAdmin: true
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: Settings,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      module: 'SETTINGS',
      isAdmin: true,
      shouldShow: () => {
        if (!user?.customRoleId) return true;
        return (user?.permissions?.SETTINGS_TARGET_SECTIONS || []).length > 0 || (user?.permissions?.SETTINGS || []).includes('READ');
      }
    },
  ].filter(item => {
    // Hide administrative modules for non-admins (Agents, Drivers, Helpers)
    if ((user?.role === 'SALES_AGENT' || user?.role === 'DRIVER' || user?.role === 'HELPER') && item.isAdmin) return false;

    if (item.shouldShow && !item.shouldShow()) return false;

    const isBasicAgentRole = ['SALES_AGENT', 'DRIVER', 'HELPER'].includes(user?.role);

    // Agents WITH a custom role → check granular AGENT_PORTAL section permissions
    if (isBasicAgentRole && user?.customRoleId && item.module === 'AGENT_PORTAL' && item.section) {
      const { can } = useUserStore.getState();
      return can('AGENT_PORTAL', 'READ', item.section);
    }

    // Agents WITHOUT a custom role → full access to all non-admin items
    if (isBasicAgentRole && !user?.customRoleId && !item.isAdmin) return true;

    // Bypass granular checks for owners and bare admin roles
    if (!item.module || user?.role === 'TENANT_OWNER' || (user?.role === 'ADMIN' && !user?.customRoleId)) return true;

    // Global Bypass for Owners and Super Admins
    if (user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN') return true;

    // Global Bypass for Admins WITHOUT custom roles
    if (user?.role === 'ADMIN' && !user?.customRoleId) return true;

    // Granular checks for top-level modules - PRIORITIZE SECTION VISIBILITY OVER MODULE READ
    if (item.module === 'REPORTS' && user?.permissions?.REPORT_TARGET_SECTIONS) {
      if (user.permissions.REPORT_TARGET_SECTIONS.length > 0) return true;
    }
    if (item.module === 'PROCUREMENT') {
      const sections = user?.permissions?.PROCUREMENT_SECTIONS;
      if (sections && Object.values(sections).some(p => (p || []).includes('READ'))) return true;
      if (user?.permissions?.PROCUREMENT_TARGET_SECTIONS?.length > 0) return true;
    }
    if (item.module === 'INVENTORY') {
      const sections = user?.permissions?.INVENTORY_SECTIONS;
      if (sections && Object.values(sections).some(p => (p || []).includes('READ'))) return true;
      if (user?.permissions?.INVENTORY_TARGET_SECTIONS?.length > 0) return true;
    }
    if (item.module === 'VEHICLES' || item.module === 'ROUTES') {
      if (user?.role === 'SUPERVISOR') return true;
    }
    if (item.module === 'CASH') {
      const sections = user?.permissions?.CASH_SECTIONS;
      if (sections) {
        const validCashKeys = ['CASH_OPENING', 'AGENT_CASH', 'SAFE_CONTROL', 'POS_HISTORY', 'SHIFT_DEPOSITS', 'STORE_CLOSURE', 'FLOAT_ASSIGNMENT', 'SHIFT_SAFEKEEPING', 'RECONCILIATION', 'LIVE_CASH', 'AUDIT_LEDGER'];
        const hasAnyValidSection = validCashKeys.some(k => (sections[k] || []).includes('READ'));
        if (hasAnyValidSection) return true;
        return false; // Hide completely if they have granular config but none are active
      }
      if (user?.permissions?.CASH_TARGET_SECTIONS?.length > 0) return true;
    }
    if (item.module === 'SETTINGS' && user?.permissions?.SETTINGS_TARGET_SECTIONS) {
      if (user.permissions.SETTINGS_TARGET_SECTIONS.length > 0) return true;
    }

    const perms = user?.permissions?.[item.module] || [];
    const hasRead = perms.includes('READ');
    if (hasRead) return true;

    return false;
  });

  const [openMenus, setOpenMenus] = useState({
    Procurement: location.pathname.startsWith('/admin/procurement'),
    Inventory: location.pathname.startsWith('/admin/inventory'),
    Vehicles: location.pathname.startsWith('/admin/vehicles'),
    Routes: location.pathname.startsWith('/admin/routes') || (location.pathname.startsWith('/admin/vehicles') && (
      new URLSearchParams(location.search).get('sub') === 'route_mapping' ||
      new URLSearchParams(location.search).get('sub') === 'sales' ||
      new URLSearchParams(location.search).get('sub') === 'collection'
    ))
  });

  const toggleMenu = (name) => {
    setOpenMenus(prev => ({ ...prev, [name]: !prev[name] }));
  };

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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Store size={14} className="text-emerald-600" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Store Context</span>
            </div>
            {/* <NotificationDropdown /> */}
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
              const hasSubItems = item.subItems && item.subItems.length > 0;
              const isMenuOpen = openMenus[item.name];
              const isActive = location.pathname === item.path || (hasSubItems && (
                (item.name === 'Procurement' && location.pathname.startsWith('/admin/procurement')) ||
                (item.name === 'Inventory' && location.pathname.startsWith('/admin/inventory')) ||
                (item.name === 'Vehicles' && location.pathname.startsWith('/admin/vehicles'))
              ));

              if (hasSubItems) {
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      onClick={() => toggleMenu(item.name)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${isActive
                        ? 'bg-emerald-50 text-emerald-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${isActive ? 'bg-emerald-600 scale-100' : 'bg-transparent scale-0'}`} />
                      <item.icon size={16} strokeWidth={isActive ? 3 : 2.5} className={item.color} />
                      <span className="flex-1 font-black text-xs uppercase tracking-wide text-left">{item.name}</span>
                      <ChevronDown
                        size={14}
                        strokeWidth={3}
                        className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-0' : '-rotate-90'}`}
                      />
                    </button>
                    {isMenuOpen && (
                      <div className="pl-4 space-y-1 mt-1 border-l-2 border-emerald-50/50 ml-6">
                        {item.subItems.map((sub) => {
                          const hasNestedItems = sub.subItems && sub.subItems.length > 0;
                          const isNestedOpen = openMenus[sub.name];

                          if (hasNestedItems) {
                            const isNestedActive = location.pathname === '/admin/inventory' && new URLSearchParams(location.search).get('tab') === 'return';
                            return (
                              <div key={sub.name} className="space-y-0.5">
                                <button
                                  onClick={() => toggleMenu(sub.name)}
                                  className={`w-full flex items-center justify-between gap-3 px-4 py-1.5 rounded-lg transition-all duration-200 ${isNestedActive ? 'text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <sub.icon size={14} strokeWidth={2.5} />
                                    <span className="text-[10px] font-black uppercase tracking-wider whitespace-nowrap">{sub.name}</span>
                                  </div>
                                  <ChevronDown
                                    size={12}
                                    strokeWidth={3}
                                    className={`transition-transform duration-200 ${isNestedOpen ? 'rotate-0' : '-rotate-90'}`}
                                  />
                                </button>
                                {isNestedOpen && (
                                  <div className="pl-4 space-y-0.5 mt-0.5 border-l border-emerald-50/30 ml-6">
                                    {sub.subItems.map(nested => {
                                      const targetTab = new URLSearchParams(nested.path.split('?')[1]).get('tab');
                                      const targetSub = new URLSearchParams(nested.path.split('?')[1]).get('sub');
                                      const isTarget = location.pathname === '/admin/inventory' && new URLSearchParams(location.search).get('tab') === targetTab && new URLSearchParams(location.search).get('sub') === targetSub;
                                      return (
                                        <Link
                                          key={nested.path}
                                          to={nested.path}
                                          onClick={onClose}
                                          className={`flex items-center gap-3 px-4 py-1.5 rounded-lg transition-all duration-200 ${isTarget
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                                        >
                                          <nested.icon size={12} strokeWidth={isTarget ? 3 : 2.5} />
                                          <span className="text-[9px] font-black uppercase tracking-widest">{nested.name}</span>
                                        </Link>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          const targetTab = new URLSearchParams(sub.path.split('?')[1]).get('tab');
                          const targetSub = new URLSearchParams(sub.path.split('?')[1]).get('sub');

                          let isSubActive = false;
                          if (item.name === 'Procurement') {
                            isSubActive = location.pathname === '/admin/procurement' && new URLSearchParams(location.search).get('tab') === targetTab;
                          } else if (item.name === 'Inventory') {
                            isSubActive = location.pathname === '/admin/inventory' && new URLSearchParams(location.search).get('tab') === targetTab && (!targetSub || new URLSearchParams(location.search).get('sub') === targetSub);
                          } else if (item.name === 'Vehicles') {
                            isSubActive = location.pathname === '/admin/vehicles' && new URLSearchParams(location.search).get('sub') === targetSub;
                          } else if (item.name === 'Routes') {
                            isSubActive = (location.pathname === '/admin/routes' && new URLSearchParams(location.search).get('tab') === targetTab) ||
                              (location.pathname === '/admin/vehicles' && new URLSearchParams(location.search).get('sub') === targetSub);
                          }

                          return (
                            <Link
                              key={sub.path}
                              to={sub.path}
                              onClick={onClose}
                              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-200 ${isSubActive
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
                            >
                              <sub.icon size={14} strokeWidth={isSubActive ? 3 : 2.5} />
                              <span className="text-[10px] font-black uppercase tracking-wider">{sub.name}</span>
                              {isSubActive && <div className="ml-auto w-1 h-1 rounded-full bg-white animate-pulse" />}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

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
