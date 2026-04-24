import React from 'react';
import { X, Truck, ArrowUpCircle, Square, CheckSquare, Package, Minus, Plus, Loader2, Check } from 'lucide-react';

const RefillsSection = ({
  activeRefillGroup,
  setViewingAgentId,
  loadingRefills,
  groupedRefills,
  auditSearch,
  unselectedRefillItems,
  toggleRefillItemSelection,
  items,
  allVehiclesStock,
  editedQuantities,
  setEditedQuantities,
  handleRejectSingleItem,
  handleApproveSingleItem,
  processingItems,
  isSubmitting,
  handleRejectRefill,
  handleApproveRefill,
  can
}) => {
  if (activeRefillGroup) {
    const group = activeRefillGroup;
    const pendingCount = group.requests.filter(r => r.status === 'PENDING').length;

    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setViewingAgentId(null)}
              className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-500 hover:border-emerald-100 transition-all active:scale-90 shadow-sm"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-600/20">
                {group.user?.name?.[0] || '?'}
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">{group.user?.name || 'Unknown Agent'}</h3>
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-emerald-400" />
                  <span className="text-xs font-black text-gray-400 uppercase tracking-widest">{group.vehicle?.vehicleNumber}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-emerald-50 px-4 py-3 rounded-2xl border border-emerald-100">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Sessions</span>
              <span className="text-lg font-black text-emerald-950">{group.requests.length}</span>
            </div>
            {pendingCount > 0 && (
              <div className="ml-4 flex flex-col items-end">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Action Required</span>
                <span className="text-lg font-black text-amber-500">{pendingCount} Pending</span>
              </div>
            )}
          </div>
        </div>

        {/* Refill Timeline */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
            <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider">Refill Timeline</h4>
          </div>

          <div className="space-y-12 md:space-y-8 relative md:before:absolute md:before:left-[31px] md:before:top-2 md:before:bottom-2 md:before:w-0.5 md:before:bg-gradient-to-b md:before:from-emerald-100 md:before:via-gray-100 md:before:to-gray-50">
            {group.requests.map((req) => (
              <div key={req.id} className="relative pl-0 md:pl-16 group/session">
                {/* Time Indicator Circle (Desktop Only) */}
                <div className={`hidden md:block absolute left-[24px] top-1.5 w-4 h-4 rounded-full border-4 border-white ring-2 ring-offset-2 transition-all group-hover/session:scale-125 ${req.status === 'PENDING' ? 'ring-amber-400 bg-amber-400' :
                  req.status === 'APPROVED' ? 'ring-emerald-400 bg-emerald-400' : 'ring-red-400 bg-red-400'
                  }`} />

                <div className="flex flex-col gap-4">
                  {/* Session Metadata */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100 w-fit">
                          {new Date(req.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                        <span className="text-xl font-black text-emerald-950 font-mono tracking-tighter mt-1">
                          {new Date(req.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </span>
                      </div>
                      <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100 shadow-sm shadow-amber-500/10' :
                        req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-red-50 text-red-600 border-red-100'
                        }`}>
                        {req.status}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {req.items.map(item => {
                      const prod = items.find(p => p.id === item.productId);
                      let excessBadge = null;
                      if (req.status === 'PENDING') {
                        const vehicleInventory = allVehiclesStock[req.vehicleId] || [];
                        const stockItem = vehicleInventory.find(i => i.productId === item.productId);

                        const targetCapacity = stockItem ? Math.max(stockItem.openingQuantity || 0, stockItem.quantity) : 0;
                        const currentQty = stockItem ? stockItem.quantity : 0;
                        const shortfall = targetCapacity - currentQty;
                        const excess = item.quantity - shortfall;

                        if (excess > 0) {
                          excessBadge = (
                            <div className="absolute -top-2 -right-2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow-lg shadow-amber-500/30 ring-2 ring-white flex items-center gap-1 z-10 animate-in zoom-in duration-300">
                              <ArrowUpCircle size={10} strokeWidth={3} />
                              +{excess}
                            </div>
                          );
                        }
                      }

                      const isSelected = !unselectedRefillItems.includes(item.id);
                      return (
                        <div key={item.id} className={`bg-white p-3.5 rounded-[1.5rem] border transition-all duration-300 ${!isSelected ? 'border-gray-100 opacity-40 grayscale' : 'border-indigo-100 shadow-sm'}`}>
                          {/* Integrated Top: Info + Toggle */}
                          <div className="flex items-center gap-3 mb-2.5">
                            {req.status === 'PENDING' && can && can('INVENTORY', 'UPDATE') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRefillItemSelection(item.id); }}
                                className={`shrink-0 transition-all ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`}
                              >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                            )}
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 relative ${isSelected ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                              <Package size={16} />
                              {excessBadge}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[13px] font-black text-gray-900 leading-none truncate block">{item.product?.name}</span>
                              {req.status === 'PENDING' && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">In Store:</span>
                                  <span className={`text-[10px] font-black ${(prod?.stock || 0) < (editedQuantities[item.id] ?? item.quantity) ? 'text-rose-600' : 'text-emerald-600'}`}>
                                    {prod?.stock || 0}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Compact Control Row */}
                          {req.status === 'PENDING' && isSelected ? (
                            <div className="flex items-center gap-2">
                              {/* Qty Adj */}
                              <div className="flex-1 flex items-center justify-between bg-gray-50 rounded-xl px-2 py-1.5 border border-gray-100">
                                {can && can('INVENTORY', 'UPDATE') ? (
                                  <>
                                    <button onClick={() => setEditedQuantities(p => ({ ...p, [item.id]: Math.max(0, (editedQuantities[item.id] ?? item.quantity) - 1) }))} className="p-1 text-gray-400 hover:text-indigo-600"><Minus size={14} /></button>
                                    <input
                                      type="number"
                                      value={editedQuantities[item.id] ?? item.quantity}
                                      onChange={(e) => setEditedQuantities(p => ({ ...p, [item.id]: Math.max(0, parseInt(e.target.value) || 0) }))}
                                      className="w-8 text-center bg-transparent font-black text-xs text-indigo-600 outline-none"
                                    />
                                    <button onClick={() => setEditedQuantities(p => ({ ...p, [item.id]: (editedQuantities[item.id] ?? item.quantity) + 1 }))} className="p-1 text-indigo-600"><Plus size={14} /></button>
                                  </>
                                ) : (
                                  <span className="flex-1 text-center font-black text-xs text-gray-500">
                                    {editedQuantities[item.id] ?? item.quantity}
                                  </span>
                                )}
                              </div>

                              {/* Quick Actions */}
                              {can && can('INVENTORY', 'UPDATE') && (
                                <div className="flex gap-1.5 shrink-0">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleRejectSingleItem(req.id, item.id); }}
                                    disabled={processingItems.has(item.id)}
                                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-50 text-rose-500 border border-rose-100 disabled:opacity-50"
                                  >
                                    {processingItems.has(item.id) ? <Loader2 size={16} className="animate-spin" /> : <X size={16} strokeWidth={3} />}
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleApproveSingleItem(req.id, item.id); }}
                                    disabled={processingItems.has(item.id) || (editedQuantities[item.id] ?? item.quantity) > (prod?.stock || 0)}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl ${(editedQuantities[item.id] ?? item.quantity) > (prod?.stock || 0) ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'} disabled:opacity-50 transition-all`}
                                  >
                                    {processingItems.has(item.id) ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between bg-gray-50/50 rounded-xl px-3 py-2 mt-1">
                              <span className="text-[9px] font-black text-gray-400 uppercase">Final Approval</span>
                              <span className="text-xs font-black text-emerald-600">{item.quantity} pcs</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Action Controls */}
                  {req.status === 'PENDING' && can && can('INVENTORY', 'UPDATE') && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-gray-100 mt-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRejectRefill(req.id); }}
                        disabled={isSubmitting}
                        className="w-full sm:w-auto px-6 py-4 sm:py-2.5 rounded-2xl bg-white border border-red-200 text-red-600 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <X size={16} strokeWidth={3} />
                        Reject Session
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApproveRefill(req.id, req.items); }}
                        disabled={isSubmitting || req.items.some(item => {
                          if (unselectedRefillItems.includes(item.id)) return false;
                          const prod = items.find(p => p.id === item.productId);
                          const qty = editedQuantities[item.id] ?? item.quantity;
                          return prod && qty > (prod.stock || 0);
                        })}
                        className={`w-full sm:w-auto px-10 py-4 sm:py-2.5 ${req.items.some(item => {
                          if (unselectedRefillItems.includes(item.id)) return false;
                          const prod = items.find(p => p.id === item.productId);
                          const qty = editedQuantities[item.id] ?? item.quantity;
                          return prod && qty > (prod.stock || 0);
                        }) ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20'} text-white font-black text-[10px] uppercase tracking-widest rounded-2xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2`}
                      >
                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Package size={16} />}
                        Approve Refill
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Skeleton Loading State */}
      {loadingRefills ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : groupedRefills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-[2.5rem] border border-dashed border-gray-100 shadow-sm">
          <Truck size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-black text-gray-900 tracking-tight">No Refill Requests</h3>
          <p className="text-xs text-gray-400 mt-2 font-black uppercase tracking-widest">Everything is up to date.</p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Agent & Vehicle</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Refill Sessions</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {groupedRefills
                  .filter(g =>
                    g.user?.name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                    g.vehicle?.vehicleNumber?.toLowerCase().includes(auditSearch.toLowerCase())
                  )
                  .map(group => {
                    const pendingCount = group.requests.filter(r => r.status === 'PENDING').length;
                    return (
                      <tr
                        key={group.user?.id || 'unknown'}
                        onClick={() => setViewingAgentId(group.user?.id || group.user?.name || 'unknown')}
                        className="hover:bg-emerald-50/20 transition-all cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white rounded-2xl flex items-center justify-center font-black text-xl transition-all shadow-inner">
                              {group.user?.name?.[0] || '?'}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{group.user?.name || 'Unknown Agent'}</span>
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.vehicle?.vehicleNumber}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-sm font-black text-gray-700">{group.requests.length} Sessions</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${pendingCount > 0 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                            {pendingCount > 0 ? `${pendingCount} Action Required` : 'Verified'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest transition-colors">
                            Manage Refills
                            <X className="rotate-180" size={14} strokeWidth={3} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groupedRefills.map(group => {
              const pendingCount = group.requests.filter(r => r.status === 'PENDING').length;

              return (
                <div
                  key={group.user?.id || 'unknown'}
                  onClick={() => setViewingAgentId(group.user?.id || group.user?.name || 'unknown')}
                  className="bg-white group/card cursor-pointer rounded-[2.5rem] p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-200 transition-all active:scale-[0.98] relative overflow-hidden flex flex-col gap-5"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-0 group-hover/card:opacity-100 transition-opacity">
                    <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
                      <X className="rotate-180" size={16} strokeWidth={3} />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-50 group-hover/card:bg-emerald-600 rounded-3xl flex items-center justify-center text-emerald-600 group-hover/card:text-white font-black text-2xl transition-all shadow-inner">
                      {group.user?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 tracking-tight text-lg truncate mb-1">{group.user?.name || 'Unknown Agent'}</h3>
                      <div className="flex items-center gap-2">
                        <Truck size={12} className="text-gray-300" />
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{group.vehicle?.vehicleNumber}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100/50">
                      <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">History</span>
                      <span className="text-sm font-black text-gray-800">{group.requests.length} Sessions</span>
                    </div>
                    <div className={`${pendingCount > 0 ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'} rounded-2xl p-3 border`}>
                      <span className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${pendingCount > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>Status</span>
                      <span className={`text-sm font-black ${pendingCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {pendingCount > 0 ? `${pendingCount} Pending` : 'Verified'}
                      </span>
                    </div>
                  </div>

                  <div className="text-[10px] font-black text-center text-emerald-600 uppercase tracking-tighter opacity-0 group-hover/card:opacity-100 transition-opacity">
                    Click to View Details →
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default RefillsSection;
