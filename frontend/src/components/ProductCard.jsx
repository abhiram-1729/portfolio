import { Plus, Minus, Package } from 'lucide-react';
import { useCartStore } from '../store/cartStore';

export default function ProductCard({ product }) {
  const { items, addItem, updateQuantity } = useCartStore();
  const cartItem = items.find((i) => i.productId === product.id);
  const qty = cartItem?.quantity || 0;

  return (
    <div className="glass rounded-[1.25rem] p-2 flex flex-col gap-2 hover:shadow-xl transition-all duration-400 animate-slide-up bg-white/60 border border-white/80">
      {/* Product Image */}
      <div className="rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 h-24 flex items-center justify-center relative shadow-inner">
        {product.image ? (
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <Package size={28} className="text-slate-300 drop-shadow-sm" />
        )}
        {/* Subtle overlay for contrast */}
        <div className="absolute inset-0 bg-black/5 mix-blend-multiply" />
      </div>

      {/* Product Info */}
      <div className="flex-1 px-1">
        <p className="text-[0.82rem] font-bold text-emerald-950 leading-[1.1] line-clamp-2 min-h-[2.2rem]">{product.name}</p>
        
        <div className="flex flex-col mt-2 space-y-1">
          {/* MRP Row */}
          {product.mrp > product.price && (
            <div className="flex items-center justify-between">
              <span className="text-[0.6rem] font-black text-emerald-900/30 uppercase tracking-tighter">MRP</span>
              <span className="text-[0.7rem] text-emerald-900/40 font-bold line-through tracking-tighter">₹{product.mrp.toFixed(2)}</span>
            </div>
          )}
          
          {/* Discount Row */}
          {product.discount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[0.6rem] font-black text-orange-400 uppercase tracking-tighter">OFF</span>
              <span className="text-[0.65rem] font-black text-orange-600 bg-orange-50 px-1 rounded-md border border-orange-100 animate-pulse-subtle">
                ₹{product.discount.toFixed(0)}
              </span>
            </div>
          )}

          {/* Final Price Row */}
          <div className="flex items-center justify-between pt-0.5 border-t border-emerald-50/50 mt-0.5">
            <span className="text-[0.65rem] font-black text-emerald-800/40 uppercase tracking-tighter">Deal</span>
            <p className="text-emerald-700 font-black text-[1rem] tracking-tighter leading-none">₹{product.price.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quantity Controls */}
      <div className="px-0.5 pb-0.5">
        {qty === 0 ? (
          <button
            onClick={() => addItem(product)}
            className="w-full bg-emerald-600 text-white font-black flex items-center justify-center gap-1.5 py-2.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <span className="relative z-10 flex items-center gap-1.5 uppercase text-[0.65rem] tracking-[0.1em]">
              <Plus size={14} strokeWidth={3} /> Add
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between bg-emerald-50 rounded-xl p-1 border border-emerald-100/50 shadow-inner">
            <button
              onClick={() => updateQuantity(product.id, qty - 1)}
              className="w-8 h-8 rounded-lg bg-white text-emerald-600 flex items-center justify-center active:scale-90 transition-all border border-emerald-200 shadow-sm hover:bg-emerald-100"
            >
              <Minus size={14} strokeWidth={3} />
            </button>
            <span className="font-black text-emerald-900 text-sm w-5 text-center">{qty}</span>
            <button
              onClick={() => updateQuantity(product.id, qty + 1)}
              className="w-8 h-8 rounded-lg bg-emerald-600 shadow-md shadow-emerald-600/30 flex items-center justify-center active:scale-90 transition-all hover:bg-emerald-700"
            >
              <Plus size={14} strokeWidth={3} className="text-white" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
