import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ShoppingCart, Smartphone, Truck, MapPin, Gift, Loader2, Grid, ScanBarcode, AlertTriangle, Plus, Minus } from 'lucide-react';
import { useUserStore } from '../store/userStore';
import { productsAPI } from '../services/api';
import { useCartStore } from '../store/cartStore';
import ProductGrid from '../components/ProductGrid';
import CartDrawer from '../components/CartDrawer';
import BarcodeScannerOverlay from '../components/BarcodeScannerOverlay';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { getCashStatus } from '../services/cashService';
import { getTodayPlan } from '../services/routeService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// Cache products after first load
let productCache = null;

export default function SalesEntry() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState([]);
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterSubCategory, setFilterSubCategory] = useState('ALL');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [unavailableCode, setUnavailableCode] = useState(null);
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scannedQuantity, setScannedQuantity] = useState(1);
  const [plan, setPlan] = useState(null);
  const { user } = useUserStore();
  const { items, customerMobile, setCustomerMobile, customerName, setCustomerName, totalAmount, addItem } = useCartStore();
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      checkCashStatus();
      loadPlan();
      loadProducts();
    }
  }, [user]);

  const loadPlan = async () => {
    try {
      const data = await getTodayPlan();
      setPlan(data);
    } catch (err) {
      console.error('Failed to load plan');
    }
  };

  const handleBarcodeScan = (code) => {
    const product = products.find(p => p.skuCode === code || p.barcode === code);
    if (product) {
      if (product.stock <= 0) {
        toast.error(`${product.name} is out of stock`);
      } else {
        setScannedProduct(product);
        setScannedQuantity(1);
      }
    } else {
      setUnavailableCode(code);
    }
  };

  useBarcodeScanner(handleBarcodeScan);

  const checkCashStatus = async () => {
    if (user?.role !== 'SALES_AGENT') return;

    try {
      const status = await getCashStatus();
      console.log('Cash Status Response:', status);
      if (status.vehicleAssigned === false) {
        toast.error('No vehicle assigned to your profile');
        return;
      }
      // Redirection to opening-cash removed as admin now manages the float
    } catch (err) {
      console.error('Error checking cash status:', err);
      toast.error('Failed to verify cash status');
    }
  };

  const loadProducts = async () => {
    try {
      const params = {};
      if (user?.role === 'SALES_AGENT') {
        const vehicleId = user.assignedVehicleId || user.assignedVehicle?.id;
        if (!vehicleId) {
          console.warn('[SalesEntry] No vehicle ID found for agent');
          setLoading(false);
          return;
        }
        params.vehicleId = vehicleId;
      }

      const { data } = await productsAPI.getAll(params);
      setProducts(data);
      setFiltered(data);
      if (data.length === 0) {
        toast.error('Vehicle inventory is empty. Please load stock.');
      }
    } catch (err) {
      toast.error('Failed to load vehicle stock');
    } finally {
      setLoading(false);
    }
  };

  const categories = React.useMemo(() => {
    const catsMap = {};
    products.forEach(p => {
      if (p.category) {
        catsMap[p.category.name] = { id: p.categoryId, name: p.category.name };
      }
    });
    return Object.values(catsMap);
  }, [products]);

  const subCategories = React.useMemo(() => {
    const subsMap = {};
    products.forEach(p => {
      if (p.subCategory) {
        subsMap[p.subCategory.name] = {
          id: p.subCategoryId,
          name: p.subCategory.name,
          categoryId: p.categoryId,
          categoryName: p.category?.name
        };
      }
    });
    return Object.values(subsMap);
  }, [products]);

  useEffect(() => {
    let result = products;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q))
      );
    }
    if (filterCategory !== 'ALL') {
      result = result.filter(p => p.category?.name === filterCategory);
    }
    if (filterSubCategory !== 'ALL') {
      result = result.filter(p => p.subCategory?.name === filterSubCategory);
    }
    if (filterFreeOnly) {
      result = result.filter((p) => p.isFree);
    }
    setFiltered(result);
  }, [search, products, filterFreeOnly, filterCategory, filterSubCategory]);

  return (
    <div className="min-h-screen pb-28 pt-2">

      {/* Sticky Combined Input Section */}
      <div className="sticky top-[56px] z-20 bg-slate-50/90 backdrop-blur-xl border-b border-emerald-100/30 pb-2 pt-2 shadow-sm">
        <div className="max-w-lg mx-auto px-5 space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {/* Customer Name */}
            <div className="glass rounded-[1.25rem] p-1 flex items-center gap-2 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white focus:border-emerald-500 transition-all overflow-hidden">
              <div className="bg-emerald-50 p-1 rounded-xl text-emerald-500 ml-1">
                <Smartphone size={14} strokeWidth={2.5} />
              </div>
              <input
                id="customer-name"
                type="text"
                placeholder="Name (Optional)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="flex-1 bg-transparent py-2 outline-none text-emerald-950 text-[0.8rem] placeholder-slate-950/40 font-bold min-w-0"
              />
            </div>

            {/* Customer Mobile */}
            <div className="glass rounded-[1.25rem] p-1 flex items-center gap-2 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white focus:border-emerald-500 transition-all overflow-hidden">
              <div className="bg-emerald-50 p-1 rounded-xl text-emerald-500 ml-1">
                <Smartphone size={14} strokeWidth={2.5} />
              </div>
              <input
                id="customer-mobile"
                type="tel"
                placeholder="Mobile (Opt)"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                className="flex-1 bg-transparent py-2 outline-none text-emerald-950 text-[0.8rem] placeholder-slate-950/40 font-bold min-w-0"
              />
            </div>
          </div>

          {/* Search */}
          <div className="glass rounded-[1.25rem] p-1 flex items-center gap-3 border border-emerald-100 bg-white/70 shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:bg-white focus:border-emerald-500 transition-all">
            <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500 ml-1">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <input
              id="product-search"
              ref={searchRef}
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent py-2 pr-2 outline-none text-emerald-950 text-[0.95rem] placeholder-slate-950/40 font-bold"
            />
            <button
              onClick={() => setFilterFreeOnly(!filterFreeOnly)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all border shrink-0 flex items-center gap-1.5 ${filterFreeOnly ? 'bg-emerald-600 text-white border-emerald-600 shadow-md' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}
            >
              <Gift size={14} strokeWidth={3} />
              Gifts
            </button>
            <button
              onClick={() => setShowScanner(true)}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-colors shrink-0 flex items-center justify-center"
              title="Scan Barcode"
            >
              <ScanBarcode size={16} strokeWidth={3} />
            </button>
            {search && (
              <button onClick={() => setSearch('')} className="p-1.5 mr-1 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors font-black text-[9px] uppercase tracking-tighter">
                Clear
              </button>
            )}
          </div>

          {/* Hierarchical Categories */}
          <div className="space-y-4 pt-1">
            <div className="relative group">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                <button
                  onClick={() => { setFilterCategory('ALL'); setFilterSubCategory('ALL'); }}
                  className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterCategory === 'ALL'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10'
                    : 'bg-white border-emerald-100 text-slate-400 hover:text-emerald-600'
                    }`}
                >
                  All Items
                </button>
                {categories.map((cat) => (
                  <button
                    key={`cat-${cat.id}`}
                    onClick={() => { setFilterCategory(cat.name); setFilterSubCategory('ALL'); }}
                    className={`whitespace-nowrap px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterCategory === cat.name
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/10'
                      : 'bg-white border-emerald-100 text-slate-400 hover:text-emerald-600'
                      }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-Categories Bar */}
            {filterCategory !== 'ALL' && (
              <div className="animate-in slide-in-from-top-1 duration-200">
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-xl border border-emerald-100 shrink-0">
                    <Grid size={10} className="text-emerald-500" />
                    <span className="text-[8px] font-black text-emerald-700 uppercase tracking-tighter">Refine</span>
                  </div>
                  <button
                    onClick={() => setFilterSubCategory('ALL')}
                    className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterSubCategory === 'ALL'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'bg-white border-emerald-50 text-slate-400 hover:text-emerald-500'
                      }`}
                  >
                    All {filterCategory}
                  </button>
                  {subCategories
                    .filter(sub => sub.categoryName === filterCategory)
                    .map((sub) => (
                      <button
                        key={`sub-${sub.id}`}
                        onClick={() => setFilterSubCategory(sub.name)}
                        className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border shrink-0 ${filterSubCategory === sub.name
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white border-emerald-50 text-slate-400 hover:text-emerald-500'
                          }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                </div>
              </div>
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
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
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

      {/* Barcode Scanner Overlay */}
      {showScanner && (
        <BarcodeScannerOverlay
          onScan={(code) => {
            handleBarcodeScan(code);
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Unavailable Product Modal */}
      {unavailableCode && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Product Not Found</h3>
            <p className="text-sm text-gray-500 mb-6">
              The scanned barcode <span className="font-bold text-gray-900">"{unavailableCode}"</span> does not match any product in your inventory.
            </p>
            <button
              onClick={() => setUnavailableCode(null)}
              className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Okay
            </button>
          </div>
        </div>
      )}

      {/* Scanned Product Quantity Modal */}
      {scannedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black text-gray-900 mb-1">{scannedProduct.name}</h3>
            <p className="text-xs text-emerald-600 font-bold mb-6">Price: ₹{scannedProduct.price} • Stock: {scannedProduct.stock}</p>
            
            <div className="flex items-center justify-center gap-6 mb-8">
              <button
                onClick={() => setScannedQuantity(Math.max(1, scannedQuantity - 1))}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                <Minus size={24} strokeWidth={3} />
              </button>
              <span className="text-4xl font-black text-gray-900 w-16">{scannedQuantity}</span>
              <button
                onClick={() => setScannedQuantity(Math.min(scannedProduct.stock, scannedQuantity + 1))}
                className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                <Plus size={24} strokeWidth={3} />
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setScannedProduct(null)}
                className="flex-1 bg-gray-100 text-gray-600 font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addItem(scannedProduct, scannedQuantity);
                  toast.success(`Added ${scannedQuantity}x ${scannedProduct.name}`);
                  setScannedProduct(null);
                }}
                className="flex-[2] bg-emerald-600 text-white font-black py-3.5 rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
