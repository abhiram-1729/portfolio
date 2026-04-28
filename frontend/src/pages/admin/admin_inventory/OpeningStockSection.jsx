import React from 'react';
import { ClipboardList, Search, Barcode, Package, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

const OpeningStockSection = ({
  items,
  openingSearch,
  setOpeningSearch,
  setCurrentPage,
  setShowScanner,
  setScannerTarget,
  itemsPerPage,
  currentPage,
  stockInputs,
  setStockInputs,
  handleUpdateStock,
  processingItems,
  can
}) => {
  const filteredOpeningItems = items.filter(item => {
    const search = openingSearch.toLowerCase();
    return item.name.toLowerCase().includes(search) ||
      (item.displayId && item.displayId.toLowerCase().includes(search)) ||
      (item.barcode && item.barcode.toLowerCase().includes(search));
  });

  const totalOpeningPages = Math.ceil(filteredOpeningItems.length / itemsPerPage);
  const paginatedItems = filteredOpeningItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 sm:px-2">
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
            <ClipboardList size={28} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Opening Stock Initialization</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Master Inventory Setup</span>
              <span className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-[10px] font-bold text-gray-400">Set your starting balances</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-72 flex items-center gap-2 bg-gray-50 border border-transparent rounded-2xl focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 transition-all px-4">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={openingSearch}
              onChange={(e) => { setOpeningSearch(e.target.value); setCurrentPage(1); }}
              className="block w-full py-3 bg-transparent text-xs font-bold text-gray-900 outline-none"
            />
            <button
              onClick={() => {
                setScannerTarget('opening');
                setShowScanner(true);
              }}
              className="p-1.5 rounded-xl text-gray-300 hover:text-indigo-600 transition-all shrink-0"
              title="Scan Barcode"
            >
              <Barcode size={16} />
            </button>
          </div>
          <div className="px-4 py-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest">Live Connectivity</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Product Detail</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Category</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Current Store Stock</th>
                {can && can('INVENTORY', 'UPDATE', 'MASTER') && (
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-indigo-600 text-center bg-indigo-50/30">Set Opening Stock</th>
                )}
                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/50">
              {paginatedItems.map(item => (
                <tr key={`opening-${item.id}`} className="hover:bg-gray-50/30 transition-all group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 overflow-hidden shadow-inner group-hover:scale-110 transition-transform">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : <Package size={18} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-800 leading-tight">{item.name}</span>
                        <span className="text-[10px] font-bold text-gray-400">ID: {item.displayId || item.id.substring(0, 8)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-3 py-1 bg-gray-50 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-wider border border-gray-100">{item.category?.name}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-gray-700">{item.stock || 0}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">In Warehouse</span>
                    </div>
                  </td>
                  {can && can('INVENTORY', 'UPDATE', 'MASTER') && (
                    <td className="px-6 py-5 text-center bg-indigo-50/10">
                      <div className="flex justify-center">
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            className="w-28 bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm text-center font-black text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm group-hover:shadow-md"
                            placeholder="0"
                            value={stockInputs[item.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === '' || parseInt(val) >= 0) {
                                setStockInputs(p => ({ ...p, [item.id]: val }));
                              }
                            }}
                          />
                        </div>
                      </div>
                    </td>
                  )}
                  <td className="px-8 py-5 text-right">
                    {can && can('INVENTORY', 'UPDATE', 'MASTER') && (
                      <button
                        onClick={() => handleUpdateStock(item.id, stockInputs[item.id], 'set')}
                        disabled={processingItems.has(item.id) || !stockInputs[item.id]}
                        className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-30 flex items-center gap-2 ml-auto"
                      >
                        {processingItems.has(item.id) ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} strokeWidth={3} />}
                        Initialize
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOpeningItems.length === 0 && (
          <div className="py-20 text-center flex flex-col items-center">
            <Package size={48} className="text-gray-200 mb-4" />
            <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No products found matching your search</p>
          </div>
        )}

        {/* Pagination */}
        {totalOpeningPages > 1 && (
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-8 px-8 border-t border-gray-50 bg-gray-50/20">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Showing {Math.min(filteredOpeningItems.length, (currentPage - 1) * itemsPerPage + 1)} to {Math.min(filteredOpeningItems.length, currentPage * itemsPerPage)} of {filteredOpeningItems.length} Products
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                <ArrowLeft size={14} /> Previous
              </button>
              {(() => {
                let pages = [];
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalOpeningPages, startPage + 4);
                if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

                for (let i = startPage; i <= endPage; i++) {
                  if (i > 0) {
                    pages.push(
                      <button
                        key={i}
                        onClick={() => { setCurrentPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-gray-100 text-gray-400 hover:border-indigo-200'}`}
                      >
                        {i}
                      </button>
                    );
                  }
                }
                return pages;
              })()}
              <button
                disabled={currentPage === totalOpeningPages}
                onClick={() => { setCurrentPage(p => Math.min(totalOpeningPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
              >
                Next <ArrowLeft size={14} className="rotate-180" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OpeningStockSection;
