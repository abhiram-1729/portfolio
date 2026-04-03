import { Plus, Minus, Package, Gift, Lock, Unlock, Zap } from 'lucide-react';
import { useCartStore, checkIsFree } from '../store/cartStore';

export default function ProductCard({ product }) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i.productId === product.id);
  const qty = cartItem?.quantity || 0;

  // Calculate if it's currently free in the store
  const subtotal = items.reduce((sum, i) => {
    if (!checkIsFree(i.isFree)) return sum + Number(i.price || 0) * i.quantity;
    return sum;
  }, 0);

  const isFreeProduct = checkIsFree(product.isFree);
  const minAmount = Number(product.minShopAmount || 0);
  const qualifies = subtotal >= minAmount;
  const isCurrentlyFree = isFreeProduct && qualifies;

  return (
    <div className={`glass rounded-[1.5rem] p-2 flex flex-col gap-2 hover:shadow-2xl transition-all duration-500 animate-slide-up group border-white/80 ${isCurrentlyFree ? 'bg-emerald-50/40 border-emerald-200/50' : 'bg-white/60'}`}>

      {/* Visual Header / Image Area */}
      <div className="rounded-2xl overflow-hidden bg-slate-100 h-28 flex items-center justify-center relative shadow-inner group-hover:scale-[1.02] transition-transform duration-500">

        {/* Promotion Overlays */}
        {isFreeProduct && (
          <div className={`absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none`}>
            <div className={`flex items-center gap-1 px-2 py-1 rounded-lg backdrop-blur-md border shadow-lg ${isCurrentlyFree ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-orange-500 text-white border-orange-400'}`}>
              <Gift size={12} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-tight">
                {isCurrentlyFree ? 'CLAIM' : 'FREE'}
              </span>
            </div>

            {!qualifies && (
              <div className="bg-white/90 backdrop-blur-md text-orange-600 p-1 rounded-lg shadow-md border border-orange-100 flex items-center justify-center">
                <Lock size={12} strokeWidth={3} />
              </div>
            )}
          </div>
        )}

        {/* Stock Info - More subtle */}
        {!isFreeProduct && product.stock !== undefined && product.stock !== null && (
          <div className="absolute top-2 right-2 z-10 bg-white/80 backdrop-blur-md text-emerald-900 text-[0.6rem] font-black px-2 py-1 rounded-lg border border-emerald-100 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
            {product.stock} IN STOCK
          </div>
        )}



        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-700" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <Package size={32} strokeWidth={1.5} />
            <span className="text-[8px] font-black uppercase">VillagKart</span>
          </div>
        )}
      </div>

      {/* Product Content */}
      <div className="px-1.5 py-1">
        <div className="flex items-center gap-1 mb-1">
          {isFreeProduct ? (
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tight"></span>
          ) : (
            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-tight"></span>
          )}
        </div>
        <h3 className="text-[0.85rem] font-black text-emerald-950 leading-tight line-clamp-2 min-h-[2.4rem] mb-2 tracking-tight">
          {product.name}
        </h3>

        {/* Dynamic Price/Offer Area */}
        <div className="flex items-center justify-between min-h-[2.5rem]">
          <div className="flex flex-col">
            {isFreeProduct ? (
              <>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[1.1rem] font-black tracking-tighter ${isCurrentlyFree ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isCurrentlyFree ? '₹0.00' : `₹${Number(product.price).toFixed(0)}`}
                  </span>
                  {!isCurrentlyFree && (
                    <span className="text-[0.7rem] font-bold text-slate-300 line-through">₹{Number(product.price).toFixed(0)}</span>
                  )}
                </div>
                {!isCurrentlyFree && (
                  <div className="flex items-center gap-0.5 mt-[-2px]">
                    <Zap size={8} className="text-orange-500 fill-orange-500" />
                    <span className="text-[0.65rem] font-black text-orange-600 uppercase tracking-tighter">
                      ABOVE ₹{minAmount}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <p className="text-[1.1rem] font-black text-emerald-700 tracking-tighter leading-none">
                  ₹{Number(product.price).toFixed(2)}
                </p>
                {product.mrp > product.price && (
                  <span className="text-[0.65rem] font-bold text-emerald-900/30 line-through">₹{Number(product.mrp).toFixed(2)}</span>
                )}
              </>
            )}
          </div>

          {/* Savings Badge - Only if relevant */}
          {!isFreeProduct && product.discount > 0 && (
            <div className="bg-orange-50 text-orange-600 px-2 py-1 rounded-lg border border-orange-100 flex flex-col items-center">
              <span className="text-[0.55rem] font-black leading-none">OFF</span>
              <span className="text-[0.75rem] font-black tracking-tighter leading-none">₹{product.discount.toFixed(0)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Area */}
      <div className="mt-1">
        {qty === 0 ? (
          <button
            onClick={() => addItem(product)}
            className={`w-full font-black py-3 rounded-2xl active:scale-[0.97] transition-all flex items-center justify-center gap-2 text-[0.7rem] uppercase tracking-widest shadow-lg ${isCurrentlyFree
              ? 'bg-emerald-600 text-white shadow-emerald-500/20 hover:bg-emerald-700'
              : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700'
              }`}
          >
            <Plus size={16} strokeWidth={3} />
            {isCurrentlyFree ? 'Claim' : 'Add'}
          </button>
        ) : (
          <div className="flex items-center justify-between bg-emerald-100/50 backdrop-blur-sm rounded-2xl p-1.5 border border-emerald-200/30">
            <button
              onClick={() => updateQuantity(product.id, qty - 1)}
              className="w-9 h-9 rounded-xl bg-white text-emerald-600 flex items-center justify-center active:scale-90 transition-all border border-emerald-100 shadow-sm"
            >
              <Minus size={16} strokeWidth={3} />
            </button>
            <span className="font-black text-emerald-950 text-sm">{qty}</span>
            <button
              onClick={() => updateQuantity(product.id, qty + 1)}
              className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
            >
              <Plus size={16} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
