import React from 'react';
import { Grid, Package, Loader2 } from 'lucide-react';

const StoreStockSection = ({
  loadingInventory,
  warehouseStock,
  warehouseSearch,
  setWarehouseSearch,
  warehouseCategory,
  setWarehouseCategory,
  categories,
}) => {
  const filteredStock = warehouseStock.filter(s => {
    const matchesSearch = s.product.name.toLowerCase().includes(warehouseSearch.toLowerCase()) ||
      (s.product.barcode && s.product.barcode.toLowerCase().includes(warehouseSearch.toLowerCase())) ||
      (s.product.displayId && s.product.displayId.toLowerCase().includes(warehouseSearch.toLowerCase()));
    const matchesCategory = warehouseCategory === 'ALL' || s.product.category?.name === warehouseCategory;
    return matchesSearch && matchesCategory;
  });

  const totalValuation = filteredStock.reduce((acc, s) => acc + (s.quantity * (s.product.landingPrice || s.product.purchasePrice || s.product.price || 0)), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {loadingInventory ? (
        <div className="grid grid-cols-1 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm animate-pulse flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1">
                <div className="w-10 h-10 bg-gray-100 rounded-xl" />
                <div className="space-y-2 flex-1">
                  <div className="w-24 h-3 bg-gray-100 rounded-md" />
                  <div className="w-12 h-2 bg-gray-50 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="w-12 h-8 bg-gray-50 rounded-lg" />
                <div className="w-16 h-8 bg-gray-50 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                  <Grid size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">SOH Intelligence</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">{warehouseStock.length} Active SKUs</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                      <Package size={10} className="text-blue-500" />
                      <span className="text-[10px] font-black text-blue-700 uppercase tracking-widest">
                        {warehouseStock.reduce((acc, s) => acc + s.quantity, 0)} Total Units
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20 group-hover:scale-110 transition-transform">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Store Stock Inventory</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Warehouse Valuation</p>
                </div>
              </div>
              <div className="flex flex-col items-end bg-gray-50 px-6 py-3 rounded-[1.5rem] border border-gray-100 shadow-inner">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Valuation</span>
                <span className="text-xl font-black text-emerald-600 tracking-tighter">₹{totalValuation.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden scroll-smooth">
            <div className="flex items-center gap-1.5 py-1">
              <span className="px-3 py-1.5 bg-gray-50 text-gray-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">Quick Filters</span>
            </div>
            <button
              onClick={() => setWarehouseCategory('ALL')}
              className={`flex-shrink-0 whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all border ${warehouseCategory === 'ALL' ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                }`}
            >
              All Stock
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setWarehouseCategory(cat.name)}
                className={`flex-shrink-0 whitespace-nowrap px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all border ${warehouseCategory === cat.name ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-2">
            {filteredStock.map((stock) => (
              <div key={stock.id} className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all group flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover:text-emerald-600 transition-colors shrink-0">
                    {stock.product.image ? (
                      <img src={stock.product.image} className="w-full h-full object-cover rounded-xl" alt="" />
                    ) : (
                      <Grid size={18} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate">{stock.product.name}</h4>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">{stock.product.category?.name || 'General'}</span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-6 shrink-0">
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">Buy</span>
                    <span className="text-[10px] font-bold text-gray-600">₹{stock.product.landingPrice || 0}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">Sale</span>
                    <span className="text-[10px] font-bold text-gray-600">₹{stock.product.price || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex flex-col items-end min-w-[3rem]">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Stock</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-base font-black tracking-tighter ${stock.quantity > (stock.product.minStockAlert || 5) ? 'text-gray-950' : 'text-rose-600'}`}>
                        {stock.quantity}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end min-w-[4rem]">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Valuation</span>
                    <span className="text-xs font-black text-emerald-600 tracking-tight">₹{(stock.quantity * (stock.product.landingPrice || 0)).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default StoreStockSection;
