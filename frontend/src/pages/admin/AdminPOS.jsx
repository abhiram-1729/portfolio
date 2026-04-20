import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  ShoppingCart, 
  User, 
  Smartphone, 
  Trash2, 
  Plus, 
  Minus, 
  ChevronRight, 
  ArrowLeft,
  Package,
  Zap,
  Tag,
  Gift,
  Loader2,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { productsAPI } from '../../services/api';
import { useCartStore } from '../../store/cartStore';
import { useUserStore } from '../../store/userStore';
import toast from 'react-hot-toast';

export default function AdminPOS() {
  const navigate = useNavigate();
  const { user } = useUserStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, totalAmount, customerName, setCustomerName, customerMobile, setCustomerMobile } = useCartStore();
  
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  
  // Fetch Warehouse Products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Using showAll=true to get everything or just default for admin
        const { data } = await productsAPI.getAll({ showAll: true });
        setProducts(data);
      } catch (err) {
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const cats = [...new Set(products.map(p => p.category?.name).filter(Boolean))];
    return ['ALL', ...cats];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'ALL' || p.category?.name === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, selectedCategory]);

  const handleCheckout = () => {
    if (items.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    navigate('/payment');
  };

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const [isCartOpen, setIsCartOpen] = useState(false);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] animate-in fade-in duration-500 relative">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-3 bg-white rounded-2xl border border-gray-100 text-gray-500 hover:text-emerald-600 transition-all shadow-sm"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-1">POS BILLING</h2>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Zap size={12} className="text-emerald-500" />
              Instant Warehouse Direct Sales
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsCartOpen(true)}
            className="bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-100 flex items-center gap-3 hover:bg-emerald-100 transition-all active:scale-95"
          >
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 relative">
              <ShoppingCart size={16} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-950 text-white text-[8px] font-black rounded-full flex items-center justify-center border border-emerald-500">
                  {cartCount}
                </span>
              )}
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest leading-none">View Cart</p>
              <p className="text-lg font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 flex-1 overflow-hidden">
        {/* Full Width Product Selector */}
        <div className="flex-1 flex flex-col gap-6 overflow-hidden">
          {/* Filters & Search */}
          <div className="bg-white p-4 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text"
                placeholder="Find products by name or barcode..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-emerald-500/10 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shrink-0 ${
                    selectedCategory === cat 
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20' 
                    : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid - Fixed column counts for full width */}
          <div className="flex-1 overflow-y-auto pr-2 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-4 pb-20 scrollbar-thin scrollbar-thumb-gray-200">
            {loading ? (
              [...Array(12)].map((_, i) => (
                <div key={i} className="aspect-square bg-white rounded-[2rem] border border-gray-50 animate-pulse shadow-sm" />
              ))
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full py-20 text-center text-gray-400">
                <Package size={48} className="mx-auto mb-4 opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest">No products found</p>
              </div>
            ) : (
              filteredProducts.map((product) => {
                const inCart = items.find(i => i.productId === product.id);
                return (
                  <div 
                    key={product.id}
                    onClick={() => addItem(product)}
                    className={`group relative bg-white rounded-[2rem] p-4 border transition-all cursor-pointer hover:shadow-xl hover:shadow-emerald-900/5 ${
                      inCart ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-gray-50'
                    }`}
                  >
                    {inCart && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-emerald-600/20 z-10">
                        {inCart.quantity}
                      </div>
                    )}
                    <div className="aspect-square rounded-2xl bg-gray-50 mb-3 overflow-hidden">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <Package size={32} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">{product.category?.name || 'General'}</p>
                      <h4 className="text-[11px] font-black text-gray-900 leading-tight line-clamp-2 uppercase min-h-[1.75rem] mb-1">{product.name}</h4>
                      
                      <div className="flex items-center justify-between pt-1">
                        <div className="flex flex-col">
                            <span className="text-sm font-black text-emerald-950 tracking-tighter">₹{product.price}</span>
                            {product.mrp > product.price && (
                            <span className="text-[8px] font-medium text-rose-500 line-through">₹{product.mrp}</span>
                            )}
                        </div>

                        {inCart ? (
                           <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-xl border border-emerald-100 shadow-sm shadow-emerald-600/5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(inCart.productId, inCart.quantity - 1); }}
                                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-emerald-600 hover:bg-rose-50 hover:text-rose-600 transition-all border border-emerald-100/50"
                                >
                                    <Minus size={12} strokeWidth={3} />
                                </button>
                                <span className="w-6 text-center text-xs font-black text-emerald-950">{inCart.quantity}</span>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(inCart.productId, inCart.quantity + 1); }}
                                    className="w-7 h-7 flex items-center justify-center bg-white rounded-lg text-emerald-600 hover:bg-emerald-50 transition-all border border-emerald-100/50"
                                >
                                    <Plus size={12} strokeWidth={3} />
                                </button>
                           </div>
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <Plus size={14} strokeWidth={3} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Floating Summary Trigger */}
      {cartCount > 0 && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-40 w-full max-w-xs animate-slide-up">
            <button
                onClick={() => setIsCartOpen(true)}
                className="w-full bg-emerald-950 text-white font-black py-4 rounded-3xl shadow-2xl flex items-center justify-between px-6 hover:scale-[1.02] active:scale-95 transition-all group"
            >
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center">
                        <ShoppingCart size={16} />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.2em]">Show Summary</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs opacity-50 font-black tracking-widest">{cartCount} items</span>
                    <ChevronRight size={16} />
                </div>
            </button>
        </div>
      )}

      {/* Billing Summary Modal Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-fade-in" 
            onClick={() => setIsCartOpen(false)}
          />
          
          <div className="relative w-full max-w-md max-h-[90vh] flex flex-col animate-slide-up">
              {/* Cart Summary Card (SuccessScreen design) */}
              <div className="flex-1 overflow-hidden flex flex-col relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-600/10 rounded-[2.5rem] -z-10" />
                
                <div className="flex-1 bg-white backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="p-6 border-b border-emerald-50 flex items-center justify-between bg-emerald-50/20">
                    <div>
                      <h3 className="text-xl font-black text-emerald-950 tracking-tight flex items-center gap-2">
                        <Zap size={20} className="text-emerald-600" />
                        BILLING SUMMARY
                      </h3>
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.2em]">{cartCount} ITEM(S) IN BASKET</p>
                    </div>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="p-2 bg-white rounded-full border border-gray-100 text-gray-400 hover:text-gray-900 shadow-sm"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Customer Info (Moved inside Modal) */}
                  <div className="px-6 py-4 border-b border-gray-50 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Customer Name</label>
                            <input 
                                type="text"
                                placeholder="..."
                                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-500/20"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                            <input 
                                type="tel"
                                placeholder="..."
                                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none focus:bg-white focus:border-emerald-500/20"
                                value={customerMobile}
                                onChange={(e) => setCustomerMobile(e.target.value)}
                            />
                        </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3 scrollbar-thin scrollbar-thumb-emerald-100">
                    {items.map(item => (
                      <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl overflow-hidden flex-shrink-0 border border-gray-100">
                            {item.image ? (
                              <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-200"><Package size={14} /></div>
                            )}
                          </div>
                          <div>
                            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-tight leading-tight max-w-[120px] truncate">{item.name}</h4>
                            <span className="text-[9px] font-bold text-emerald-600">₹{item.price.toFixed(2)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white rounded-lg border border-gray-100 text-gray-400"
                            >
                              <Minus size={10} strokeWidth={3} />
                            </button>
                            <span className="w-5 text-center text-[10px] font-black">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-6 h-6 flex items-center justify-center bg-white rounded-lg border border-gray-100 text-gray-400"
                            >
                              <Plus size={10} strokeWidth={3} />
                            </button>
                          </div>
                          <div className="text-right min-w-[50px]">
                            <p className="text-[10px] font-black text-gray-950 tracking-tighter">₹{(item.price * item.quantity).toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Stats & Checkout */}
                  <div className="p-6 bg-emerald-50/50 border-t border-emerald-100/50 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
                        <span className="text-xs font-black text-gray-700">₹{totalAmount.toFixed(2)}</span>
                      </div>
                      
                      {items.some(i => i.mrp > i.price) && (
                        <div className="bg-emerald-600 p-4 rounded-2xl shadow-xl shadow-emerald-500/10">
                           <div className="flex items-center justify-between text-white">
                              <div className="flex flex-col">
                                <span className="text-[7px] font-black opacity-80 uppercase tracking-widest">Savings</span>
                                <h3 className="font-black text-[10px] uppercase">Direct Discount</h3>
                              </div>
                              <span className="text-xl font-black tracking-tighter">
                                -₹{(items.reduce((sum, i) => sum + (i.mrp || i.price) * i.quantity, 0) - totalAmount).toFixed(2)}
                              </span>
                           </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center px-1 pt-2">
                        <span className="text-sm font-black text-emerald-950 uppercase tracking-wider">Total</span>
                        <span className="text-3xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl active:scale-95 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3"
                    >
                      Process Payment
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
