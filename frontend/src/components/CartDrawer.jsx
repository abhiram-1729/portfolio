import { ShoppingCart, X, Trash2, ArrowRight, Minus, Plus, Sparkles, Gift, Package } from 'lucide-react';
import { useCartStore, checkIsFree } from '../store/cartStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CartDrawer({ isOpen, onClose, products = [] }) {
  const { items, addItem, updateQuantity, clearCart, totalAmount, deliveryCharge } = useCartStore();
  const navigate = useNavigate();

  const handleUpdate = (item, newQty) => {
    if (newQty > item.quantity && newQty > (item.stock || 0)) {
        toast.error(`Only ${item.stock || 0} units available in vehicle`, {
            id: `stock-limit-${item.productId}`,
            icon: '🚛',
            style: { borderRadius: '15px', fontWeight: 'bold' }
        });
        return;
    }
    updateQuantity(item.productId, newQty);
  };
  
  // Calculate subtotal for free item threshold comparison
  const subtotal = items.reduce((sum, i) => {
    return !checkIsFree(i.isFree) ? sum + Number(i.price || 0) * i.quantity : sum;
  }, 0);


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
        <div className="overflow-y-auto max-h-[30vh] px-2 py-2 no-scrollbar">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-emerald-200">
                <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center mb-6">
                    <ShoppingCart size={48} strokeWidth={1.5} />
                </div>
                <p className="font-black text-emerald-800/40 uppercase tracking-widest text-sm">Cart is Empty</p>
                <p className="text-emerald-600/30 text-xs mt-2 font-bold tracking-tight">Ready for fresh picks!</p>
            </div>
          ) : (
            items.map((item) => {
              const isItemFree = checkIsFree(item.isFree);
              return (
              <div key={item.productId} className="flex items-center gap-4 p-4 mx-3 my-2 bg-white/70 border border-emerald-50 shadow-sm rounded-2xl animate-fade-in group hover:bg-white transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-[0.95rem] font-black text-emerald-950 mb-1 leading-tight">{item.name}</p>
                  <div className="flex items-center gap-2">
                    {isItemFree && subtotal >= Number(item.minShopAmount || 0) ? (
                      <>
                        <span className="text-[0.7rem] text-emerald-900/30 font-bold line-through">₹{item.price.toFixed(2)}</span>
                        <span className="text-sm font-black text-orange-600 tracking-tight flex items-center gap-1">
                          FREE
                          <span className="text-[10px] bg-orange-100 px-1 rounded animate-pulse">OFFER</span>
                        </span>
                      </>
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

                <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 rounded-[1.25rem] p-1.5 shadow-inner">
                  <button
                    onClick={() => handleUpdate(item, item.quantity - 1)}
                    className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-emerald-600 active:scale-90 shadow-sm hover:bg-emerald-100 transition-all border border-emerald-100"
                  >
                    {item.quantity <= 1 ? <Trash2 size={14} strokeWidth={4} /> : <Minus size={14} strokeWidth={4} />}
                  </button>
                  <span className="w-6 text-center text-[0.95rem] font-black text-emerald-900">{item.quantity}</span>
                  <button
                    onClick={() => handleUpdate(item, item.quantity + 1)}
                    className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white active:scale-90 shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                  >
                    <Plus size={14} strokeWidth={4} />
                  </button>
                </div>

                <p className="text-base font-black w-20 text-right tracking-tighter text-emerald-950">
                  ₹{((isItemFree && subtotal >= Number(item.minShopAmount || 0)) ? 0 : Number(item.price || 0) * item.quantity).toFixed(2)}
                </p>
              </div>
              );
            })
          )}
        </div>

        {/* Promotional Suggestions */}
        {items.length > 0 && products.length > 0 && (
          <div className="px-6 py-3 border-t border-emerald-50 bg-emerald-50/20 max-h-[30vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-orange-500 fill-orange-500" />
              <span className="text-xs font-black text-emerald-800 tracking-[0.1em] uppercase">Recommended Gifts</span>
            </div>
            
            <div className="space-y-2">
              {products
                .filter(p => {
                  const isFree = checkIsFree(p.isFree);
                  const inCart = items.some(i => i.productId === p.id);
                  if (!isFree || inCart) return false;
                  
                  const minAmount = Number(p.minShopAmount || 0);
                  
                  // Revised Logic:
                  // 1. If it's already unlocked (minAmount <= subtotal), ALWAYS show it so they can claim it.
                  // 2. If it's upcoming (minAmount > subtotal), only show it if it's within +500 of current subtotal.
                  const isUnlocked = minAmount <= subtotal;
                  const isUpcomingNear = minAmount > subtotal && minAmount <= (subtotal + 500);

                  return isUnlocked || isUpcomingNear;
                })
                .sort((a, b) => Number(a.minShopAmount) - Number(b.minShopAmount))
                .map((p) => {
                  const qualifies = subtotal >= Number(p.minShopAmount || 0);
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-2 bg-white border rounded-xl transition-all shadow-sm group hover:scale-[1.02] ${qualifies ? 'border-emerald-200' : 'border-slate-100 shadow-none opacity-80'}`}>
                      {/* Product Image */}
                      <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-100 shadow-inner">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={16} className="text-slate-300" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-[0.8rem] font-black text-emerald-950 leading-tight">{p.name}</p>
                          {qualifies && (
                            <div className="flex items-center gap-0.5 text-emerald-600">
                                <Sparkles size={8} className="fill-emerald-600" />
                                <span className="text-[7px] font-black uppercase tracking-tighter">READY</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col">
                          {qualifies ? (
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">CLAIM FOR ₹0</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                                <span className="text-[8px] font-black text-slate-400">ABOVE ₹{p.minShopAmount}</span>
                                <span className="text-[8px] font-bold text-orange-500 uppercase">Need ₹{(Number(p.minShopAmount || 0) - subtotal).toFixed(0)} more</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => addItem(p)}
                        disabled={!qualifies}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90 flex-shrink-0 ${
                          qualifies 
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-700' 
                            : 'bg-slate-50 text-slate-300 border border-slate-100 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <Plus size={16} strokeWidth={3} />
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-6 border-t border-emerald-100 bg-emerald-50/10">
            <div className="space-y-3 mb-6">
               <div className="flex justify-between items-center px-2">
                 <span className="text-[11px] font-black text-emerald-800/40 uppercase tracking-[0.2em]">Subtotal</span>
                 <span className="text-sm font-black text-emerald-950 tracking-tight">₹{(totalAmount - (deliveryCharge || 0)).toFixed(2)}</span>
               </div>
               
               <div className="flex justify-between items-center px-2 animate-in slide-in-from-right-4 duration-500">
                 <div className="flex items-center gap-2">
                   <span className="text-[11px] font-black text-emerald-800/40 uppercase tracking-[0.2em]">Delivery</span>
                   {deliveryCharge === 0 && <span className="text-[8px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded uppercase tracking-widest border border-emerald-200">FREE</span>}
                   {deliveryCharge > 0 && <span className="text-[9px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-lg uppercase tracking-widest border border-blue-200">SLAB MATCH</span>}
                 </div>
                 <span className={`text-sm font-black tracking-tight ${deliveryCharge === 0 ? 'text-emerald-600' : 'text-blue-600'}`}>
                   {deliveryCharge === 0 ? '₹0.00' : `₹${deliveryCharge.toFixed(2)}`}
                 </span>
               </div>
               <div className="flex justify-between items-end px-2 pt-2 border-t border-emerald-100/50">
                 <div>
                   <span className="text-[11px] font-black text-emerald-800/40 uppercase tracking-[0.3em]">Grand Total</span>
                   <p className="text-[10px] text-emerald-600 font-bold tracking-tight italic">All taxes included</p>
                 </div>
                 <span className="text-4xl font-black text-emerald-950 tracking-tighter">₹{totalAmount.toLocaleString()}</span>
               </div>
            </div>

            <button
              onClick={handleProceed}
              className="w-full bg-emerald-600 text-white py-6 rounded-[2rem] font-black text-sm uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-2xl shadow-emerald-600/30 active:scale-95 transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              Proceed to Invoice
              <ArrowRight size={20} strokeWidth={3} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}
