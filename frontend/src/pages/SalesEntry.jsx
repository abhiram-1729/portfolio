import { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Smartphone, Truck } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { productsAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import Header from '../components/Header';
import ProductGrid from '../components/ProductGrid';
import CartDrawer from '../components/CartDrawer';
import { getCashStatus } from '../services/cashService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Cache products after first load
let productCache = null;

export default function SalesEntry() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const { user } = useUserStore();
  const { items, customerMobile, setCustomerMobile, customerName, setCustomerName, totalAmount } = useCartStore();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkCashStatus();
    }
    loadProducts();
  }, [user]);

  const checkCashStatus = async () => {
    if (user?.role !== 'SALES_AGENT') return;
    
    try {
      const status = await getCashStatus();
      console.log('Cash Status Response:', status);
      if (status.vehicleAssigned === false) {
        toast.error('No vehicle assigned to your profile');
        return;
      }
      if (!status.openingSubmitted) {
        console.log('Redirecting to opening-cash');
        navigate('/opening-cash', { replace: true });
      }
    } catch (err) {
      console.error('Error checking cash status:', err);
      toast.error('Failed to verify cash status');
    }
  };

  const loadProducts = async () => {
    try {
      const params = {};
      if (user?.assignedVehicleId) {
        params.vehicleId = user.assignedVehicleId;
      }

      const { data } = await productsAPI.getAll(params);
      setProducts(data);
      setFiltered(data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!search.trim()) {
      setFiltered(products);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(products.filter((p) => p.name.toLowerCase().includes(q)));
  }, [search, products]);

  return (
    <div className="min-h-screen pb-28">
      <Header />

      {/* Sticky Combined Input Section */}
      <div className="sticky top-[56px] z-20 bg-slate-50/90 backdrop-blur-xl border-b border-emerald-100/30 pb-4 pt-4 shadow-sm">
        <div className="max-w-lg mx-auto px-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Customer Name */}
            <div className="glass rounded-[1.25rem] p-1 flex items-center gap-2 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white focus:border-emerald-500 transition-all overflow-hidden">
                <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500 ml-1">
                    <Smartphone size={16} strokeWidth={2.5} />
                </div>
                <input
                    id="customer-name"
                    type="text"
                    placeholder="Name (Optional)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="flex-1 bg-transparent py-2.5 outline-none text-emerald-950 text-[0.9rem] placeholder-slate-950/40 font-bold min-w-0"
                />
            </div>

            {/* Customer Mobile */}
            <div className="glass rounded-[1.25rem] p-1 flex items-center gap-2 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white focus:border-emerald-500 transition-all overflow-hidden">
                <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500 ml-1">
                    <Smartphone size={16} strokeWidth={2.5} />
                </div>
                <input
                    id="customer-mobile"
                    type="tel"
                    placeholder="Mobile (Opt)"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="flex-1 bg-transparent py-2.5 outline-none text-emerald-950 text-[0.9rem] placeholder-slate-950/40 font-bold min-w-0"
                />
            </div>
          </div>

          {/* Search */}
          <div className="glass rounded-[1.25rem] p-1 flex items-center gap-3 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white focus:border-emerald-500 transition-all">
            <div className="bg-emerald-50 p-2 rounded-xl text-emerald-500 ml-1">
              <Search size={20} strokeWidth={2.5} />
            </div>
            <input
              id="product-search"
              ref={searchRef}
              type="text"
              placeholder="Search all products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent py-2.5 pr-4 outline-none text-emerald-950 text-[1.05rem] placeholder-slate-950/40 font-bold"
            />
            {search && (
              <button onClick={() => setSearch('')} className="p-2 mr-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors font-black text-[10px] uppercase tracking-tighter">
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-2 space-y-5">
        {/* Product Grid */}
        <div className="pb-4">
          <ProductGrid products={filtered} loading={loading} />
        </div>
      </div>

      {/* Floating Cart Bar - Using safe-area padding directly */}
      {totalItems > 0 && (
        <div className="fixed bottom-[calc(var(--safe-bottom)+1rem)] left-0 right-0 max-w-lg mx-auto z-30 px-5 animate-slide-up">
          <button
            id="cart-fab"
            onClick={() => setCartOpen(true)}
            className="w-full bg-emerald-600 text-white font-black text-lg py-4 rounded-2xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/30 flex items-center justify-between px-6 hover:bg-emerald-700 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="relative">
                <ShoppingCart size={22} strokeWidth={3} />
                <span className="absolute -top-2 -right-2 bg-white text-emerald-600 text-[0.7rem] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-emerald-600 shadow-sm">
                  {totalItems}
                </span>
              </div>
              <span className="tracking-tight">Review Cart</span>
            </div>
            <span className="font-black text-xl tracking-tighter relative z-10">₹{totalAmount.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* Cart Drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} products={products} />
    </div>
  );
}
