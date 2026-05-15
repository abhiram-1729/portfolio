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
  Shield,
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
  Zap,
  ShoppingBag
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
  const { clearUser, user, refreshUserProfile } = useUserStore();
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const navigate = useNavigate();
  const [isNotifOpen, setIsNotifOpen] = React.useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);
  const userDropdownRef = React.useRef(null);
  const [lastOpenedMenu, setLastOpenedMenu] = React.useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  React.useEffect(() => {
    refreshUserProfile();
  }, []);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [openMenus, setOpenMenus] = React.useState({
    Procurement: location.pathname.startsWith('/admin/procurement'),
    Inventory: location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/damage'),
    Operation: location.pathname.startsWith('/admin/users'),
    Routes: location.pathname.startsWith('/admin/routes') || (location.pathname.startsWith('/admin/vehicles') && (
      location.search.includes('sub=route_mapping') ||
      location.search.includes('sub=sales') ||
      location.search.includes('sub=collection')
    )),
    Vehicles: location.pathname.startsWith('/admin/vehicles'),
    'Return & Stock': location.search.includes('tab=return'),
    Reports: location.pathname.startsWith('/admin/reports')
  });

  const toggleMenu = (label) => {
    setOpenMenus(prev => {
      const isOpening = !prev[label];
      if (isOpening) setLastOpenedMenu(label);
      return { ...prev, [label]: isOpening };
    });
  };

  const activeStoreId = searchParams.get('storeId');
  const activeStoreName = searchParams.get('storeName');

  const displayStoreName = activeStoreName || user?.storeName || user?.tenantName || 'VillagKart';

  const appendParams = (path) => {
    if (!activeStoreId || path.startsWith('/admin/cash')) return path;
    const separator = path.includes('?') ? '&' : '?';
    let url = `${path}${separator}storeId=${activeStoreId}`;
    if (activeStoreName) {
      url += `&storeName=${encodeURIComponent(activeStoreName)}`;
    }
    return url;
  };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setIsUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    if (lastOpenedMenu && openMenus[lastOpenedMenu]) {
      // Use a small timeout to allow the menu to expand before scrolling
      const timer = setTimeout(() => {
        const element = document.getElementById(`nav-group-${lastOpenedMenu.replace(/\s+/g, '-').toLowerCase()}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [openMenus, lastOpenedMenu]);

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  const rawNavItems = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, module: 'DASHBOARD' },
    {
      label: 'Operation',
      icon: Users,
      subItems: [
        { to: '/admin/users', icon: Users, label: 'Users', module: 'STAFF_VIRTUAL' },
        { to: '/admin/vehicles', icon: Truck, label: 'Vehicles', module: 'VEHICLES' },
        { to: '/admin/routes', icon: MapPin, label: 'Routes', module: 'ROUTES', section: 'ROUTES' },
        { to: '/admin/delivery-logistics', icon: Truck, label: 'Delivery Logistics', module: 'ADMIN' },
      ]
    },
    { to: '/admin/stores', icon: Store, label: 'Stores', module: 'STORE_CONTEXT', section: 'STORE_SELECTOR' },
    { to: '/admin/privileges', icon: Shield, label: 'Role Privileges' },
    { to: '/admin/sales', icon: ShoppingCart, label: 'Sales History', module: 'SALES' },
    {
      label: 'Inventory',
      icon: Package,
      module: 'INVENTORY',
      subItems: [
        // { to: '/admin/inventory?tab=main_master', label: 'Registry', icon: Shield, section: 'MAIN_MASTER' },
        { to: '/admin/inventory?tab=master', label: 'Master', icon: Grid, section: 'MASTER' },
        { to: '/admin/inventory?tab=inventory', label: 'Store Stock', icon: Package, section: 'STORE_STOCK' },
        { to: '/admin/inventory?tab=return&sub=tracking', label: 'Vehicle Stock', icon: Truck, section: 'VEHICLE_STOCK' },
        { to: '/admin/inventory?tab=return&sub=loading', label: 'Loading', icon: ArrowUpCircle, section: 'LOADING' },
        { to: '/admin/inventory?tab=return&sub=return', label: 'Return', icon: ArrowDownCircle, section: 'RETURN' },
        { to: '/admin/inventory?tab=return&sub=refills', label: 'Refills', icon: Package, section: 'REFILLS' },
        { to: '/admin/damage', label: 'Damage', icon: AlertTriangle, section: 'DAMAGE' },
        // { to: '/admin/inventory?tab=return&sub=trips', label: 'Trips/Shifts', icon: HistoryIcon, section: 'TRIPS' },
        // { to: '/admin/inventory?tab=return&sub=fuel', icon: CreditCard, label: 'Fuel Logs', section: 'FUEL' },
        // { to: '/admin/inventory?tab=return&sub=maintenance', icon: Settings, label: 'Maintenance', section: 'MAINTENANCE' },
        { to: '/admin/inventory?tab=return&sub=audits', label: 'Audit History', icon: CheckSquare, section: 'AUDITS' },
      ]
    },
    { to: '/admin/activity-logs', icon: HistoryIcon, label: 'Activity Logs', module: 'ADMIN' },
    { to: '/admin/attendance', icon: Clock, label: 'Attendance', module: 'HR' },
    {
      label: 'Reports',
      icon: BarChart3,
      module: 'REPORTS',
      subItems: [
        { to: '/admin/reports/overview', label: 'Overview', icon: BarChart3, section: 'OVERVIEW' },
        { to: '/admin/reports/item-wise', label: 'Item-wise Sales', icon: Package, section: 'ITEM_WISE' },
        { to: '/admin/reports/category-wise', label: 'Category-wise', icon: Layers, section: 'CATEGORY_WISE' },
        { to: '/admin/reports/day-wise', label: 'Day-wise Sales', icon: Calendar, section: 'DAY_WISE' },
        { to: '/admin/reports/route-village', label: 'Route & Village', icon: MapPin, section: 'ROUTE_VILLAGE' },
        { to: '/admin/reports/agent-performance', label: 'Agent Performance', icon: Users, section: 'AGENT_PERFORMANCE' },
        { to: '/admin/reports/location-tracking', label: 'Location Tracking', icon: Navigation, section: 'LOCATION_TRACKING' },
        { to: '/admin/reports/vehicle-wise', label: 'Substore (Vehicle)', icon: Truck, section: 'VEHICLE_WISE' },
        { to: '/admin/reports/payment-mode', label: 'Payment Mode', icon: CreditCard, section: 'PAYMENT_MODE' },
        { to: '/admin/reports/returns', label: 'Return Report', icon: RotateCcw, section: 'RETURN' },
        { to: '/admin/reports/damages', label: 'Damage Report', icon: AlertTriangle, section: 'DAMAGE' },
        { to: '/admin/reports/sessions', label: 'Session Report', icon: Zap, section: 'SESSION' },
        { to: '/admin/reports/invoices', label: 'Invoice Report', icon: FileText, section: 'INVOICE' },
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
        { to: '/admin/procurement?tab=vendors', icon: Users, label: 'Vendors', section: 'VENDORS' },
        { to: '/admin/procurement?tab=mapping', icon: Link2, label: 'Item Mapping', section: 'MAPPING' },
        { to: '/admin/procurement?tab=po', icon: ClipboardList, label: 'Purchase Orders', section: 'PO' },
        { to: '/admin/procurement?tab=grn', icon: Truck, label: 'Goods Receipt', section: 'GRN' },
        { to: '/admin/procurement?tab=purchases', icon: Receipt, label: 'Purchases', section: 'PURCHASES' },
        { to: '/admin/procurement?tab=ledger', icon: BookOpen, label: 'Stock Ledger', section: 'LEDGER' },
        { to: '/admin/procurement?tab=payments', icon: CreditCard, label: 'Payments', section: 'PAYMENTS' },
        { to: '/admin/procurement?tab=reports', icon: BarChart3, label: 'Reports', section: 'REPORTS' },
      ]
    },
    // { to: '/admin/finance-reports', icon: PieChart, label: 'Finance Reports', module: 'REPORTS' },
  ];

  const navItems = rawNavItems.map(item => {
    if (item.subItems) {
      const filteredSubItems = item.subItems.filter(sub => {
        const requiredModule = sub.module || item.module;
        // Global Bypass for Owners and Super Admins
        if (user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN') return true;

        // Global Bypass for Admins WITHOUT custom roles
        if (user?.role === 'ADMIN' && !user?.customRoleId) return true;

        if (!requiredModule) return true;

        // 1. Prioritize Section-Level Gating (REPORTS bypass module READ)
        if (sub.section) {
          if (sub.section === 'MAIN_MASTER') return true;
          if (requiredModule === 'REPORTS' && user?.permissions?.REPORT_TARGET_SECTIONS) {
            return user.permissions.REPORT_TARGET_SECTIONS.includes(sub.section);
          }

          if (requiredModule === 'INVENTORY') {
            if (['TRIPS', 'FUEL', 'MAINTENANCE'].includes(sub.section)) return true;
            const sections = user?.permissions?.INVENTORY_SECTIONS;
            if (sections) return (sections[sub.section] || []).includes('READ');
            if (user?.permissions?.INVENTORY_TARGET_SECTIONS) return user.permissions.INVENTORY_TARGET_SECTIONS.includes(sub.section);
            return true; // Fallback for new sections
          }

          if (requiredModule === 'PROCUREMENT') {
            const sections = user?.permissions?.PROCUREMENT_SECTIONS;
            if (sections) return (sections[sub.section] || []).includes('READ');
            if (user?.permissions?.PROCUREMENT_TARGET_SECTIONS) return user.permissions.PROCUREMENT_TARGET_SECTIONS.includes(sub.section);
            return false;
          }

          if (requiredModule === 'ROUTES' && user?.permissions?.ROUTE_TARGET_SECTIONS) {
            return user.permissions.ROUTE_TARGET_SECTIONS.includes(sub.section);
          }
        }

        // 2. Fallback to Module-level READ check
        let hasModuleRead = false;
        if (requiredModule === 'STAFF_VIRTUAL') {
          const hasAdmin = (user?.permissions?.['STAFF_ADMIN'] || []).includes('READ');
          const hasAgent = (user?.permissions?.['STAFF_AGENT'] || []).includes('READ');
          hasModuleRead = hasAdmin || hasAgent;
        } else if (requiredModule === 'STORE_CONTEXT') {
          hasModuleRead = true; // Granular check handles it below
        } else {
          const perms = user?.permissions?.[requiredModule];
          hasModuleRead = Array.isArray(perms) ? perms.includes('READ') : false;
        }
        // 3. Granular check for STORE_CONTEXT
        if (requiredModule === 'STORE_CONTEXT' && sub.section) {
          const sections = user?.permissions?.STORE_CONTEXT;
          if (sections) return (sections[sub.section] || []).includes('READ');
          return false;
        }

        if (!hasModuleRead) return false;

        return true;
      });
      return { ...item, subItems: filteredSubItems };
    }
    return item;
  }).filter(item => {
    if (item.subItems) return item.subItems.length > 0;
    // Global Bypass for Owners and Super Admins
    if (user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN') return true;

    // Global Bypass for Admins WITHOUT custom roles
    if (user?.role === 'ADMIN' && !user?.customRoleId) return true;

    if (!item.module) return true;

    let hasModuleRead = false;
    if (item.module === 'STAFF_VIRTUAL') {
      const hasAdmin = (user?.permissions?.['STAFF_ADMIN'] || []).includes('READ');
      const hasAgent = (user?.permissions?.['STAFF_AGENT'] || []).includes('READ');
      hasModuleRead = hasAdmin || hasAgent;
    } else if (item.module === 'STORE_CONTEXT') {
      hasModuleRead = true; // Granular check handles it below
    } else {
      const perms = user?.permissions?.[item.module];
      hasModuleRead = Array.isArray(perms) ? perms.includes('READ') : false;
    }
    if (!hasModuleRead) return false;

    // Granular checks for top-level modules
    if (item.module === 'CASH') {
      const sections = user?.permissions?.CASH_SECTIONS;
      if (sections) {
        const validCashKeys = ['CASH_OPENING', 'AGENT_CASH', 'SAFE_CONTROL', 'POS_HISTORY', 'SHIFT_DEPOSITS', 'STORE_CLOSURE', 'FLOAT_ASSIGNMENT', 'SHIFT_SAFEKEEPING', 'RECONCILIATION', 'LIVE_CASH', 'AUDIT_LEDGER'];
        const hasAnyValidSection = validCashKeys.some(k => (sections[k] || []).includes('READ'));
        if (hasAnyValidSection) return true;
        return false; // Hide completely if they have granular config but none are active
      }
      if (user?.permissions?.CASH_TARGET_SECTIONS) {
        return user.permissions.CASH_TARGET_SECTIONS.length > 0;
      }
    }
    if (item.module === 'REPORTS' && user?.permissions?.REPORT_TARGET_SECTIONS) {
      return user.permissions.REPORT_TARGET_SECTIONS.length > 0;
    }
    if (item.module === 'PROCUREMENT') {
      const sections = user?.permissions?.PROCUREMENT_SECTIONS;
      if (sections) return Object.values(sections).some(perms => (perms || []).includes('READ'));
      if (user?.permissions?.PROCUREMENT_TARGET_SECTIONS) {
        return user.permissions.PROCUREMENT_TARGET_SECTIONS.length > 0;
      }
    }
    if (item.module === 'INVENTORY') {
      const sections = user?.permissions?.INVENTORY_SECTIONS;
      if (sections) {
        return Object.values(sections).some(perms => (perms || []).includes('READ'));
      }
      if (user?.permissions?.INVENTORY_TARGET_SECTIONS) {
        return user.permissions.INVENTORY_TARGET_SECTIONS.length > 0;
      }
    }
    if (item.module === 'EXPENSES') {
      const sections = user?.permissions?.EXPENSE_SECTIONS;
      if (sections) {
        return Object.values(sections).some(perms => (perms || []).includes('READ'));
      }
    }
    
    if (item.module === 'STORE_CONTEXT') {
      const sections = user?.permissions?.STORE_CONTEXT;
      if (sections) return (sections[item.section] || []).includes('READ');
      return false;
    }

    return true;
  });

  const getRequiredModule = (pathname) => {
    if (pathname === '/admin') return 'DASHBOARD';
    if (pathname.startsWith('/admin/users')) return 'STAFF_VIRTUAL';
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
    if (pathname.startsWith('/admin/attendance')) return 'HR';
    if (pathname.startsWith('/admin/privileges')) return 'ADMIN';
    if (pathname.startsWith('/admin/stores')) return 'STORE_CONTEXT';
    return null;
  };

  const currentModule = getRequiredModule(location.pathname);

  const isAuthorizedRoute = () => {
    if (location.pathname.startsWith('/admin/privileges')) return true; // Explicitly allow privileges if in Admin portal
    if (location.pathname.startsWith('/admin/stores')) return true; // Explicitly allow stores
    if (!currentModule) return true;
    if (['TENANT_OWNER', 'SUPER_ADMIN'].includes(user?.role)) return true;
    if (user?.role === 'ADMIN' && !user?.customRoleId) return true;

    if (location.pathname.startsWith('/admin/reports')) {
      if (user?.permissions?.REPORT_TARGET_SECTIONS?.length > 0) return true;
      const pathMap = {
        '/admin/reports/overview': 'OVERVIEW', '/admin/reports/item-wise': 'ITEM_WISE',
        '/admin/reports/category-wise': 'CATEGORY_WISE', '/admin/reports/day-wise': 'DAY_WISE',
        '/admin/reports/route-village': 'ROUTE_VILLAGE', '/admin/reports/agent-performance': 'AGENT_PERFORMANCE',
        '/admin/reports/location-tracking': 'LOCATION_TRACKING', '/admin/reports/vehicle-wise': 'VEHICLE_WISE',
        '/admin/reports/payment-mode': 'PAYMENT_MODE', '/admin/reports/returns': 'RETURN',
        '/admin/reports/damages': 'DAMAGE', '/admin/reports/sessions': 'SESSION', '/admin/reports/invoices': 'INVOICE'
      };
      const reqSection = pathMap[location.pathname];
      if (reqSection && user?.permissions?.REPORT_TARGET_SECTIONS?.includes(reqSection)) return true;
    }

    if (location.pathname.startsWith('/admin/procurement')) {
      const sections = user?.permissions?.PROCUREMENT_SECTIONS;
      if (sections && Object.values(sections).some(p => (p || []).includes('READ'))) return true;
      if (user?.permissions?.PROCUREMENT_TARGET_SECTIONS?.length > 0) return true;

      const tab = searchParams.get('tab') || 'vendors';
      const tabMap = { 'vendors': 'VENDORS', 'mapping': 'MAPPING', 'po': 'PO', 'grn': 'GRN', 'purchases': 'PURCHASES', 'ledger': 'LEDGER', 'payments': 'PAYMENTS', 'reports': 'REPORTS' };
      if (sections && tabMap[tab] && (sections[tabMap[tab]] || []).includes('READ')) return true;
      if (user?.permissions?.PROCUREMENT_TARGET_SECTIONS?.includes(tabMap[tab])) return true;
    }

    if (location.pathname === '/admin/inventory' || location.pathname === '/admin/damage' || location.pathname.startsWith('/admin/inventory')) {
      const sections = user?.permissions?.INVENTORY_SECTIONS;
      if (sections && Object.values(sections).some(p => (p || []).includes('READ'))) return true;
      if (user?.permissions?.INVENTORY_TARGET_SECTIONS?.length > 0) return true;

      const tab = searchParams.get('tab') || (location.pathname === '/admin/damage' ? 'return' : 'master');
      const sub = searchParams.get('sub') || (location.pathname === '/admin/damage' ? 'damage' : 'loading');
      const tabMap = { 'master': 'MASTER', 'inventory': 'STORE_STOCK', 'vehicle-stock': 'VEHICLE_STOCK' };
      const subTabMap = { 'loading': 'LOADING', 'return': 'RETURN', 'refills': 'REFILLS', 'damage': 'DAMAGE', 'audits': 'AUDITS', 'tracking': 'VEHICLE_STOCK' };

      if (sections) {
        if (tabMap[tab] && (sections[tabMap[tab]] || []).includes('READ')) return true;
        if (tab === 'return' && (sections[subTabMap[sub]] || []).includes('READ')) return true;
      }
      if (user?.permissions?.INVENTORY_TARGET_SECTIONS) {
        if (tabMap[tab] && user.permissions.INVENTORY_TARGET_SECTIONS.includes(tabMap[tab])) return true;
        if (tab === 'return' && user.permissions.INVENTORY_TARGET_SECTIONS.includes(subTabMap[sub])) return true;
      }
    }

    if (location.pathname.startsWith('/admin/cash')) {
      const sections = user?.permissions?.CASH_SECTIONS;
      if (sections && Object.values(sections).some(p => (p || []).includes('READ'))) return true;
      if (user?.permissions?.CASH_TARGET_SECTIONS?.length > 0) return true;
    }

    if (location.pathname.startsWith('/admin/stores')) {
      const sections = user?.permissions?.STORE_CONTEXT;
      if (sections && (sections['STORE_SELECTOR'] || []).includes('READ')) return true;
      return false;
    }

    if (location.pathname.startsWith('/admin/expenses')) {
      const sections = user?.permissions?.EXPENSE_SECTIONS;
      if (sections && Object.values(sections).some(p => (p || []).includes('READ'))) return true;
    }

    if (location.pathname.startsWith('/admin/routes')) {
      if (user?.permissions?.ROUTE_TARGET_SECTIONS?.length > 0) return true;
    }

    let hasModuleRead = false;
    if (currentModule === 'STAFF_VIRTUAL') {
      const hasAdmin = (user?.permissions?.['STAFF_ADMIN'] || []).includes('READ');
      const hasAgent = (user?.permissions?.['STAFF_AGENT'] || []).includes('READ');
      hasModuleRead = hasAdmin || hasAgent;
    } else {
      hasModuleRead = (user?.permissions?.[currentModule] || []).includes('READ');
    }
    if (!hasModuleRead) return false;

    return true;
  };


  const isPOS = location.pathname === '/admin/pos';

  return (
    <div className={cn(
      "min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 transition-all duration-300",
      !isPOS && (isSidebarCollapsed ? "md:pl-20" : "md:pl-64")
    )}>
      {/* Header */}
      {!isPOS && (
        <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-[1600px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-emerald-600 transition-all hidden md:flex"
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <Menu size={20} className={cn("transition-transform duration-300", !isSidebarCollapsed && "rotate-180")} />
              </button>
              <div className="flex items-center gap-3">
                <img src={logo} alt="VillagKart" className="h-10 w-auto" />
                <div className={cn("flex flex-col transition-all duration-300", isSidebarCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible")}>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">VillagKart</span>
                  <h1 className="text-xl font-black text-emerald-600 leading-none">Admin Portal</h1>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 relative">
              {(user?.role === 'TENANT_OWNER' || (user?.role === 'ADMIN' && !user?.customRoleId) || (user?.permissions?.SETTINGS_TARGET_SECTIONS || []).includes('POS_TERMINAL')) && (
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
              )}

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

              <div className="h-8 w-px bg-gray-100 mx-1 hidden sm:block" />

              {/* User Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                  className={cn(
                    "flex items-center gap-3 p-1.5 rounded-2xl transition-all duration-300 group",
                    isUserDropdownOpen ? "bg-emerald-50" : "hover:bg-gray-50"
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center text-white font-black text-[10px] shadow-lg shadow-emerald-200 group-hover:scale-105 transition-transform border border-emerald-500/20">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'VK'}
                  </div>
                  <div className="hidden md:flex flex-col items-start pr-2">
                    <span className="text-xs font-black text-gray-900 leading-none mb-1 uppercase tracking-tight">{user?.name}</span>
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">{user?.role?.replace('_', ' ')}</span>
                  </div>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-gray-400 transition-transform duration-300",
                      isUserDropdownOpen && "rotate-180 text-emerald-600"
                    )}
                  />
                </button>

                {isUserDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Signed in as</p>
                      <p className="text-xs font-black text-gray-900 truncate">{user?.email || user?.name}</p>
                    </div>

                    <div className="p-2">
                      {(user?.role === 'TENANT_OWNER' || (user?.role === 'ADMIN' && !user?.customRoleId) || (user?.permissions?.SETTINGS || []).includes('READ')) && (
                        <button
                          onClick={() => { navigate('/admin/settings'); setIsUserDropdownOpen(false); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-all"
                        >
                          <Settings size={18} />
                          <span>Settings</span>
                        </button>
                      )}
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 transition-all"
                      >
                        <LogOut size={18} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
      )}


      {/* Desktop Sidebar - Non-scrollable Single Screen */}
      {!isPOS && (
        <aside className={cn(
          "hidden md:flex fixed left-0 top-0 h-screen bg-white border-r border-gray-200 flex-col z-40 transition-all duration-300",
          isSidebarCollapsed ? "w-20" : "w-64"
        )}>
          {/* Sidebar Header: Store Info */}
          <div className="p-6">
            <div className="flex flex-col gap-4">
              <div className={cn("flex items-center gap-3", isSidebarCollapsed && "justify-center")}>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200 shrink-0">
                  <Store size={20} strokeWidth={2.5} />
                </div>
                {!isSidebarCollapsed && (
                  <div className="min-w-0 animate-in fade-in duration-300">
                    <h2 className="text-base font-black text-gray-900 leading-tight truncate">
                      {displayStoreName}
                    </h2>
                    <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Admin Portal</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navigation - Flex Grow but hide scrollbar */}
          <div className="flex-1 overflow-y-auto px-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <nav className="space-y-0.5 pb-6">
              {!isSidebarCollapsed && (
                <p className="px-4 py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] animate-in fade-in duration-300">Management</p>
              )}
              {navItems.map((item) => {
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isMenuOpen = openMenus[item.label];

                if (hasSubItems) {
                  return (
                    <div key={item.label} id={`nav-group-${item.label.replace(/\s+/g, '-').toLowerCase()}`} className="space-y-1">
                      <button
                        onClick={() => toggleMenu(item.label)}
                        title={isSidebarCollapsed ? item.label : ""}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200",
                          isSidebarCollapsed ? "justify-center px-0" : "justify-between",
                          (location.pathname.startsWith('/admin/procurement') && item.label === 'Procurement') ||
                            ((location.pathname.startsWith('/admin/inventory') || location.pathname.startsWith('/admin/damage')) && item.label === 'Inventory') ||
                            ((location.pathname.startsWith('/admin/users')) && item.label === 'Oppoeration') ||
                            ((location.pathname.startsWith('/admin/vehicles') && ['sales', 'collection', 'route_mapping'].includes(searchParams.get('sub'))) || location.pathname.startsWith('/admin/routes')) && (item.label === 'Routes' || item.label === 'Routes & Logistics') ||
                            ((location.pathname.startsWith('/admin/vehicles')) && !['sales', 'collection', 'route_mapping'].includes(searchParams.get('sub')) && item.label === 'Vehicles')
                            ? "bg-emerald-50 text-emerald-700 font-black shadow-sm border-l-4 border-emerald-600 rounded-r-xl rounded-l-none"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent rounded-r-xl rounded-l-none"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon size={16} strokeWidth={2.5} />
                          {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                        </div>
                        {!isSidebarCollapsed && (
                          <ChevronDown
                            size={14}
                            className={cn("transition-transform duration-200", isMenuOpen ? "rotate-0" : "-rotate-90")}
                          />
                        )}
                      </button>
                      {isMenuOpen && !isSidebarCollapsed && (
                        <div className="pl-4 space-y-1 animate-in slide-in-from-top-1 duration-200 border-l border-emerald-50 ml-6">
                          {item.subItems.map((sub) => {
                            const hasNestedItems = sub.subItems && sub.subItems.length > 0;
                            const isNestedOpen = openMenus[sub.label];

                            if (hasNestedItems) {
                              const isNestedActive = location.pathname === '/admin/inventory' && searchParams.get('tab') === 'return';
                              return (
                                <div key={sub.label} id={`nav-group-${sub.label.replace(/\s+/g, '-').toLowerCase()}`} className="space-y-0.5">
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
                            } else if (['Operation', 'Reports', 'Vehicles', 'Routes'].includes(item.label)) {
                              if (item.label === 'Vehicles' || item.label === 'Routes') {
                                const targetSub = new URLSearchParams(sub.to.split('?')[1]).get('sub');
                                const targetTab = new URLSearchParams(sub.to.split('?')[1]).get('tab');
                                if (targetSub) {
                                  isActive = location.pathname === '/admin/vehicles' && searchParams.get('sub') === targetSub;
                                } else if (targetTab) {
                                  isActive = location.pathname === '/admin/routes' && searchParams.get('tab') === targetTab;
                                } else {
                                  isActive = location.pathname === sub.to;
                                }
                              } else {
                                isActive = location.pathname === sub.to;
                              }
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
                    title={isSidebarCollapsed ? item.label : ""}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all duration-200 rounded-r-xl rounded-l-none border-l-4",
                      isSidebarCollapsed ? "justify-center px-0" : "",
                      isActive
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 border-emerald-600"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900 border-transparent"
                    )}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={16} strokeWidth={isActive ? 3 : 2} />
                        {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>

          {/* Sidebar Footer: Admin Profile Data */}
          <div className="p-4 border-t border-gray-50 bg-gray-50/30">
            <div className={cn("flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm mb-3 transition-all", isSidebarCollapsed && "justify-center p-2")}>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100/50 shrink-0">
                {user?.name?.charAt(0) || 'A'}
              </div>
              {!isSidebarCollapsed && (
                <div className="flex flex-col min-w-0 animate-in fade-in duration-300">
                  <span className="text-[11px] font-black text-gray-900 truncate tracking-tight">{user?.name}</span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{user?.role}</span>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              title={isSidebarCollapsed ? "Sign Out" : ""}
              className={cn(
                "flex items-center gap-3 w-full px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all border border-transparent hover:border-red-100",
                isSidebarCollapsed && "justify-center px-0"
              )}
            >
              <LogOut size={14} />
              {!isSidebarCollapsed && <span className="animate-in fade-in duration-300">Sign Out</span>}
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
