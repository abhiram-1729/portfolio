import { ShoppingCart, X, Trash2, ArrowRight, Minus, Plus, Sparkles, Gift } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';

export default function CartDrawer({ isOpen, onClose, products = [] }) {
  const { items, addItem, updateQuantity, removeItem, clearCart, totalAmount } = useCartStore();
  
  // Calculate subtotal for free item threshold comparison
  const subtotal = items.reduce((sum, i) => !i.isFree ? sum + Number(i.price || 0) * i.quantity : sum, 0);

  const navigate = useNavigate();

  const handleProceed = () => {
    onClose();
    setTimeout(() => {
        navigate('/invoice');
    }, 150); // wait for animation
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 max-w-lg mx-auto glass rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } pb-[calc(var(--safe-bottom)+1rem)] bg-white/80`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-4 pb-2">
          <div className="w-16 h-1.5 rounded-full bg-slate-300/80" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-emerald-100/50">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2.5 rounded-xl text-emerald-600 shadow-sm">
                <ShoppingCart size={22} strokeWidth={3} />
            </div>
            <span className="font-black text-emerald-950 text-xl tracking-tight">Your Cart</span>
            <span className="bg-emerald-50 text-emerald-700 text-xs font-black px-2.5 py-1 rounded-full border border-emerald-100">{items.length}</span>
          </div>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button onClick={clearCart} className="p-2.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all active:scale-90">
                <Trash2 size={20} strokeWidth={2.5} />
              </button>
            )}
            <button onClick={onClose} className="p-2.5 text-emerald-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all active:scale-90">
              <X size={24} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        {/* Items */}
        <div className="overflow-y-auto max-h-[50vh] px-2 py-3 no-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-200">
                <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                    <ShoppingCart size={48} strokeWidth={1.5} />
                </div>
                <p className="font-black text-emerald-800/40 uppercase tracking-widest text-sm">Cart is Empty</p>
                <p className="text-emerald-600/30 text-xs mt-2 font-bold tracking-tight">Ready for fresh picks!</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.productId} className="flex items-center gap-4 p-4 mx-3 my-2 bg-white/70 border border-emerald-50 shadow-sm rounded-2xl animate-fade-in group hover:bg-white transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[0.95rem] font-black text-emerald-950 truncate mb-1 leading-tight">{item.name}</p>
                  <div className="flex items-center gap-2">
                    {item.isFree ? (
                      subtotal >= Number(item.minShopAmount || 0) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[0.7rem] text-emerald-900/30 font-bold line-through">₹{item.price.toFixed(2)}</span>
                          <span className="text-sm font-black text-orange-600 tracking-tight flex items-center gap-1">
                            FREE
                            <span className="text-[10px] bg-orange-100 px-1 rounded animate-pulse">OFFER</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-emerald-950/40 tracking-tight">₹{item.price.toFixed(2)}</span>
                            <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-slate-200">Locked</span>
                          </div>
                          <span className="text-[9px] font-bold text-orange-500 uppercase tracking-tight">
                            Add ₹{(Number(item.minShopAmount || 0) - subtotal).toFixed(0)} more to get free
                          </span>
                        </div>
                      )
                    ) : (
                      <>
                        <p className="text-sm font-black text-emerald-600 tracking-tight">₹{item.price.toFixed(2)}</p>
                        {item.mrp > item.price && (
                          <p className="text-[0.7rem] text-emerald-900/30 font-bold line-through">₹{item.mrp.toFixed(2)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
                {item.isFree ? (
                  <div className="flex items-center justify-center bg-orange-50 border border-orange-100 rounded-xl p-1.5 shadow-inner">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-orange-500 active:scale-90 shadow-sm hover:bg-orange-100 transition-all border border-orange-100"
                    >
                      <Trash2 size={18} strokeWidth={2.5} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-[1.25rem] p-1.5 shadow-inner">
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                      className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 active:scale-90 shadow-sm hover:bg-emerald-100 transition-all border border-emerald-100"
                    >
                      <Minus size={14} strokeWidth={4} />
                    </button>
                    <span className="w-6 text-center text-[0.95rem] font-black text-emerald-900">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white active:scale-90 shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                    >
                      <Plus size={14} strokeWidth={4} />
                    </button>
                  </div>
                )}
                <p className={`text-base font-black w-20 text-right tracking-tighter ${item.isFree && subtotal < Number(item.minShopAmount || 0) ? 'text-emerald-950/60 font-bold' : 'text-emerald-950'}`}>
                  ₹{((item.isFree && subtotal >= Number(item.minShopAmount || 0)) ? 0 : Number(item.price || 0) * item.quantity).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Promotional Suggestions */}
        {items.length > 0 && products.length > 0 && (
          <div className="px-6 py-5 border-t border-emerald-50 bg-emerald-50/20">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-orange-500 fill-orange-500" />
              <span className="text-xs font-black text-emerald-800 tracking-[0.1em] uppercase">Recommended Gifts</span>
            </div>
            
            <div className="space-y-3">
              {products
                .filter(p => {
                  const isFree = p.isFree === true || p.isFree === 'true';
                  const inCart = items.some(i => i.productId === p.id);
                  return isFree && !inCart;
                })
                .map((p) => {
                  const qualifies = subtotal >= Number(p.minShopAmount || 0);
                  return (
                    <div key={p.id} className={`flex items-center gap-4 p-3 bg-white border rounded-2xl transition-all shadow-sm group hover:scale-[1.02] ${qualifies ? 'border-emerald-200' : 'border-slate-100 shadow-none opacity-80'}`}>
                      {/* Product Image */}
                      <div className="w-14 h-14 rounded-xl bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100 shadow-inner">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-[0.9rem] font-black text-emerald-950 truncate leading-tight">{p.name}</p>
                          {qualifies && (
                            <div className="flex items-center gap-0.5 text-emerald-600">
                                <Sparkles size={10} className="fill-emerald-600" />
                                <span className="text-[8px] font-black uppercase tracking-tighter">READY</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          {qualifies ? (
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">CLAIM FOR ₹0</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[9px] font-black text-slate-400">ABOVE ₹{p.minShopAmount}</span>
                                <span className="text-[9px] font-bold text-orange-500 uppercase">Need ₹{(Number(p.minShopAmount || 0) - subtotal).toFixed(0)} more</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => addItem(p)}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
                          qualifies 
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700' 
                            : 'bg-slate-50 text-slate-400 border border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        <Plus size={20} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 pt-6 border-t border-emerald-100/50 bg-white/40 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-6 px-2">
              <span className="text-emerald-600/60 font-black tracking-[0.2em] uppercase text-[10px]">Grand Total</span>
              <span className="text-3xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toFixed(2)}</span>
            </div>
            <button
              onClick={handleProceed}
              className="w-full bg-emerald-600 text-white font-black text-lg py-5 rounded-[2rem] active:scale-[0.98] transition-all shadow-2xl shadow-emerald-600/20 flex items-center justify-center gap-3 hover:bg-emerald-700 relative overflow-hidden group mb-4"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-2">
                Continue to Invoice <ArrowRight size={22} strokeWidth={3} />
              </span>
            </button>
            <div className="pb-2 px-4 opacity-30 hover:opacity-100 transition-opacity flex justify-between items-center text-[8px] font-mono text-emerald-900 border-t border-emerald-100/50 pt-2">
               <span>SYS_DBG_SUB: ₹{subtotal}</span>
               <span>SYS_DBG_TOTAL: ₹{totalAmount}</span>
               <span>COUNT: {items.length}</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
