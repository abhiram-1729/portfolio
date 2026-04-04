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
  MapPin
} from 'lucide-react';
import { useUserStore } from '../../store/userStore';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import logo from '../../assets/VillagKart_Logo.png';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export default function AdminLayout() {
  const { clearUser, user } = useUserStore();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

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
    { to: '/admin/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20 md:pb-0 md:pl-64">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="VillagKart" className="h-14 w-auto" />
          <h1 className="text-xl font-bold text-emerald-600">Admin Portal</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden md:block text-sm text-gray-600 font-medium">
            {user?.name} ({user?.role})
          </span>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 flex-col py-6">
        <div className="px-6 mb-8 flex items-center gap-3">
          <img src={logo} alt="VillagKart" className="h-10 w-auto" />
          <div>
            <h2 className="text-2xl font-bold text-emerald-600 leading-tight">VillagKart</h2>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Admin Portal</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-emerald-50 text-emerald-600 shadow-sm"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
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
            to={item.to}
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
              <span className="font-bold text-gray-900">More Options</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {navItems.slice(5).map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={({ isActive }) => cn(
                    "flex items-center gap-3 px-4 py-4 rounded-xl text-sm font-medium border transition-all duration-200",
                    isActive
                      ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                      : "bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100"
                  )}
                >
                  <item.icon size={20} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
