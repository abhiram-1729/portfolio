import { ShoppingCart, LogOut, User, BarChart, LayoutDashboard, Truck } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useUserStore } from '../store/userStore';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/VillagKart_Logo.png';

export default function Header() {
  const items = useCartStore((s) => s.items);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const { user, clearUser } = useUserStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 glass border-b border-white/60 pt-[calc(var(--safe-top)+0.5rem)] pb-2 transition-all duration-300">
      <div className="max-w-lg mx-auto px-5 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="relative">
            <img src={logo} alt="VillagKart" className="h-10 w-auto object-contain drop-shadow-sm group-active:scale-95 transition-transform" />
            <div className="absolute -inset-2 bg-emerald-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {user && (
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 leading-none">Sales Agent</span>
                {/* {user.assignedVehicle && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100/50 text-emerald-700 border border-emerald-200/50">
                    <Truck size={8} strokeWidth={3} />
                    <span className="text-[8px] font-black tracking-tight">{user.assignedVehicle.vehicleNumber}</span>
                  </div>
                )} */}
              </div>
              <span className="text-xs font-bold text-emerald-900 leading-none">{user.name}</span>
            </div>
          )}
        </Link>

        <div className="flex items-center gap-1.5">
          {user?.role === 'SALES_AGENT' && (
            <Link to="/closing-cash" className="p-2.5 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20 active:scale-90 transition-all border border-orange-500 flex items-center gap-2 px-3 mr-1">
              <Truck size={18} strokeWidth={2.5} />
              <span className="text-[9px] font-black uppercase tracking-widest leading-none">End Day</span>
            </Link>
          )}
          {user?.role === 'ADMIN' && (
            <Link to="/admin" className="p-2.5 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20 active:scale-90 transition-all border border-emerald-500">
              <LayoutDashboard size={20} strokeWidth={2.5} />
            </Link>
          )}
          <Link to="/reports" className="p-2.5 rounded-2xl hover:bg-emerald-50 active:scale-90 transition-all text-emerald-700 bg-white/40 backdrop-blur-sm shadow-sm border border-white/60">
            <BarChart size={20} strokeWidth={2.5} />
          </Link>
          <Link to="/profile" className="p-2.5 rounded-2xl hover:bg-emerald-50 active:scale-90 transition-all text-emerald-700 bg-white/40 backdrop-blur-sm shadow-sm border border-white/60">
            <User size={20} strokeWidth={2.5} />
          </Link>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-2xl hover:bg-orange-50 active:scale-90 transition-all text-orange-600 bg-white/40 backdrop-blur-sm shadow-sm border border-white/60"
          >
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  );
}
