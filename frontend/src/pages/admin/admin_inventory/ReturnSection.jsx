import React from 'react';
import { Truck, Search, Barcode, ArrowDownCircle, Gift, Package, ArrowLeft, Loader2 } from 'lucide-react';
import { StockItemRow } from './SharedComponents';

const ReturnSection = ({
  groupedReturnItems,
  itemsPerPage,
  currentPage,
  setCurrentPage,
  stockQuantities,
  handleQuantityChange,
  selectedVehicleId,
  setSelectedVehicleId,
  vehicles,
  returnSearch,
  setReturnSearch,
  setScannerTarget,
  setShowScanner,
  totalReturnInventoryValue,
  handleStockAction,
  isSubmitting,
  hasInvalidReturnQuantities,
  vehicleInventoryMap
}) => {
  const allFiltered = [...groupedReturnItems.regular, ...groupedReturnItems.free];
  const totalPages = Math.ceil(allFiltered.length / itemsPerPage);
  const paginatedItemsFromAll = allFiltered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const regularItems = paginatedItemsFromAll.filter(i => !i.isFree);
  const freeItems = paginatedItemsFromAll.filter(i => i.isFree);

  const renderReturnTable = (itemsToRender, isFreeGroup = false) => (
    <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50">
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">In Vehicle</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Store Stock</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-orange-600 text-center bg-orange-50/10">Return Qty</th>
            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Return Value</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {itemsToRender.map((item) => {
            const qty = parseFloat(stockQuantities[item.id]) || 0;
            const price = parseFloat(item.price) || 0;
            const currentStock = vehicleInventoryMap[item.id] || 0;
            const displayAmount = qty * price;
            return (
              <tr key={`return-table-${item.id}`} className={`hover:bg-gray-50/30 transition-colors group ${isFreeGroup ? 'bg-emerald-50/10' : ''}`}>
                <td className="px-6 py-4 border-r border-gray-50 group-hover:border-transparent">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden border shadow-inner shrink-0 ${item.isFree ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-gray-50 border-gray-100 text-gray-600'}`}>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        item.isFree ? <Gift size={14} /> : <Package size={14} />
                      )}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 leading-tight">{item.name}</span>
                      <span className="text-[10px] font-bold text-blue-500">Rate: ₹{price}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center border-r border-gray-50 group-hover:border-transparent">
                  <span className="text-sm font-black text-gray-700">{currentStock}</span>
                </td>
                <td className="px-6 py-4 text-center border-r border-gray-50 group-hover:border-transparent">
                  <span className="text-[11px] font-black text-emerald-600">{item.stock || 0}</span>
                </td>
                <td className="px-6 py-4 border-r border-gray-50 group-hover:border-transparent">
                  <div className="flex flex-col items-center justify-center gap-1">
                    <input
                      type="number"
                      placeholder="0"
                      min="0"
                      onWheel={(e) => e.target.blur()}
                      className={`w-20 bg-white border ${qty > currentStock ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200'} rounded-xl px-2 py-2 text-sm text-center font-black focus:ring-2 focus:ring-orange-500/20 outline-none transition-all shadow-sm`}
                      value={stockQuantities[item.id] || ''}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value) || 0);
                        handleQuantityChange(item.id, val);
                      }}
                    />
                    {qty > currentStock && (
                      <span className="text-[8px] font-black text-rose-600 uppercase animate-pulse">Exceeds Store Stock</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-black ${qty > 0 ? 'text-orange-600' : 'text-gray-300'}`}>
                    ₹{displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Vehicle</label>
          <div className="relative">
            <select
              value={selectedVehicleId}
              onChange={(e) => setSelectedVehicleId(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select Vehicle No.</option>
              {vehicles.map(v => {
                const nameStr = v.vehicleName ? `(${v.vehicleName})` : '';
                const agentStr = v.assignedUsers?.[0] ? `- Agent: ${v.assignedUsers[0].name}` : '- Unassigned';
                return (
                  <option key={v.id} value={v.id}>
                    {`${v.vehicleNumber} ${nameStr} ${agentStr}`}
                  </option>
                );
              })}
            </select>
            <Truck size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="pt-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest">
              <ArrowDownCircle size={18} className="text-orange-500" />
              Stock Return
            </h4>
            <div className="w-full md:max-w-md flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or barcode..."
                className="w-full bg-transparent border-none outline-none text-sm"
                value={returnSearch}
                onChange={(e) => setReturnSearch(e.target.value)}
              />
              <button
                onClick={() => {
                  setScannerTarget('returnOps');
                  setShowScanner(true);
                }}
                className="p-1.5 rounded-lg hover:bg-white text-gray-400 hover:text-orange-600 transition-all"
                title="Scan Barcode"
              >
                <Barcode size={16} />
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {selectedVehicleId ? (
              <>
                <div className="flex items-center justify-between bg-blue-50 p-6 rounded-3xl border border-blue-100 shadow-sm mb-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">In-Vehicle Inventory Value</span>
                    <span className="text-2xl font-black text-blue-900">₹{totalReturnInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="w-14 h-14 bg-blue-500 shadow-lg shadow-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-400">
                    <Package className="text-white" size={28} />
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-6 max-h-[60vh] overflow-y-auto pr-1 -mr-1">
                  {regularItems.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Regular Products</h4>
                      {regularItems.map((item) => (
                        <StockItemRow
                          key={`return-mob-${item.id}`}
                          item={item}
                          quantity={stockQuantities[item.id]}
                          onChange={handleQuantityChange}
                          currentStock={vehicleInventoryMap[item.id] || 0}
                          mode="return"
                        />
                      ))}
                    </div>
                  )}
                  {freeItems.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-1 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                      {freeItems.map((item) => (
                        <StockItemRow
                          key={`return-free-mob-${item.id}`}
                          item={item}
                          quantity={stockQuantities[item.id]}
                          onChange={handleQuantityChange}
                          currentStock={vehicleInventoryMap[item.id] || 0}
                          mode="return"
                          isFree
                        />
                      ))}
                    </div>
                  )}
                  {allFiltered.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-xs italic">No items found matching "{returnSearch}"</div>
                  )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block">
                  {regularItems.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-4">Regular Products</h4>
                      {renderReturnTable(regularItems)}
                    </div>
                  )}
                  {freeItems.length > 0 && (
                    <div className="space-y-3 mt-4">
                      <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest pl-4 flex items-center gap-1.5"><Gift size={14} /> Promotional Gifts</h4>
                      {renderReturnTable(freeItems, true)}
                    </div>
                  )}
                  {allFiltered.length === 0 && (
                    <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                      <p className="text-sm font-bold text-gray-400">No items found matching "{returnSearch}"</p>
                    </div>
                  )}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => { setCurrentPage(p => Math.max(1, p - 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                      >
                        <ArrowLeft size={14} /> Prev
                      </button>
                      {(() => {
                        let pages = [];
                        let startPage = Math.max(1, currentPage - 2);
                        let endPage = Math.min(totalPages, startPage + 4);
                        if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
                        for (let i = startPage; i <= endPage; i++) {
                          if (i > 0) {
                            pages.push(
                              <button
                                key={`return-page-${i}`}
                                onClick={() => { setCurrentPage(i); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === i ? 'bg-orange-600 text-white shadow-lg shadow-orange-500/20' : 'bg-white border border-gray-100 text-gray-400 hover:border-emerald-200'}`}
                              >
                                {i}
                              </button>
                            );
                          }
                        }
                        return pages;
                      })()}
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => { setCurrentPage(p => Math.min(totalPages, p + 1)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                        className="p-2.5 rounded-xl border border-gray-100 bg-white text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-all font-black text-[10px] uppercase tracking-widest flex items-center gap-2"
                      >
                        Next <ArrowLeft size={14} className="rotate-180" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border border-dashed border-gray-200">
                <Truck size={48} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Vehicle Not Selected</h3>
                <p className="text-xs text-gray-400 mt-2 font-bold uppercase tracking-widest">Please select a vehicle from the dropdown above</p>
              </div>
            )}
          </div>

          <button
            onClick={() => handleStockAction('RETURN')}
            disabled={!selectedVehicleId || isSubmitting || hasInvalidReturnQuantities}
            className={`w-full ${hasInvalidReturnQuantities ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700'} text-white font-black py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm uppercase tracking-widest mt-2 shadow-orange-600/20`}
          >
            {isSubmitting ? <><Loader2 size={20} className="animate-spin" /> Processing...</> : 'Confirm & Submit Return'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReturnSection;
