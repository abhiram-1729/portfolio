import ProductCard from './ProductCard';
import { Package } from 'lucide-react';

export default function ProductGrid({ products, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="glass rounded-[1.5rem] p-3 h-40 animate-pulse bg-white/50 border border-emerald-50" />
        ))}
      </div>
    );
  }

  if (!products || products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-emerald-800/20 gap-4">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
            <Package size={40} strokeWidth={1.5} />
        </div>
        <p className="text-xs font-black uppercase tracking-[0.2em]">Inventory Empty</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
