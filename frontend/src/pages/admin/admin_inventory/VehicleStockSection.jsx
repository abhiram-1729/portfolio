import React from 'react';
import { Truck, Package, Search, Barcode, Pencil, Gift, FileText, CheckSquare, ArrowLeft } from 'lucide-react';

const VehicleStockSection = ({
  loadingVehicles,
  viewingVehicleId,
  setViewingVehicleId,
  vehicles,
  allVehiclesStock,
  vehicleSearch,
  setVehicleSearch,
  setShowScanner,
  setScannerTarget,
  isAuditMode,
  setIsAuditMode,
  setAuditQuantities,
  handleAuditSave,
  isSubmitting,
  auditRemark,
  setAuditRemark,
  auditQuantities,
  auditHistory,
  setSubTab
}) => {
  if (loadingVehicles) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-[2rem] h-64 border border-gray-100 shadow-sm" />
        ))}
      </div>
    );
  }

  if (viewingVehicleId) {
    const v = vehicles.find(vh => vh.id === viewingVehicleId);
    if (!v) return null;

    const inventory = allVehiclesStock[v.id] || [];
    const filteredActiveStock = inventory.filter(i => {
      if (!i.quantity || i.quantity <= 0) return false;
      const q = vehicleSearch.toLowerCase();
      return !q ||
        (i.product?.name?.toLowerCase() || "").includes(q) ||
        (i.product?.barcode?.toLowerCase() || "").includes(q) ||
        (i.product?.displayId?.toLowerCase() || "").includes(q);
    });
    const totalValue = filteredActiveStock.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product?.price || 0)), 0);
    const agentStr = v.assignedUsers?.[0] ? v.assignedUsers[0].name : 'Unassigned';

    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <button
          onClick={() => setViewingVehicleId(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm w-fit"
        >
          ← Back to Vehicles
        </button>

        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center border-b border-gray-100 pb-5 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-emerald-600/20">
                <Truck size={28} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-1">{agentStr}</h3>
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 w-fit">{v.vehicleNumber}</span>
              </div>
            </div>
            <div className="flex flex-col items-end bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-inner">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Total Stock Value</span>
              <span className="text-2xl font-black text-blue-900 tracking-tighter">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          {/* Audit Quick Info */}
          {auditHistory.filter(a => a.vehicleId === viewingVehicleId).length > 0 && (
            <div className="flex items-center justify-between bg-indigo-50/50 p-4 rounded-[2rem] border border-indigo-100 shadow-inner">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <CheckSquare size={20} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Last Audit Performed</span>
                  <span className="text-xs font-black text-indigo-900">
                    {new Date(auditHistory.find(a => a.vehicleId === viewingVehicleId).createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => { setSubTab('audits'); setViewingVehicleId(null); }}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                View Full History →
              </button>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="font-black text-gray-900 flex items-center gap-2 text-sm uppercase tracking-widest">
                <Package size={18} className="text-emerald-500" />
                Loaded Inventory
              </h4>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all min-w-[200px] md:min-w-[300px]">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={vehicleSearch}
                    onChange={(e) => setVehicleSearch(e.target.value)}
                    className="bg-transparent text-[10px] font-bold text-gray-700 focus:outline-none w-full"
                  />
                  <button
                    onClick={() => {
                      setScannerTarget('tracking');
                      setShowScanner(true);
                    }}
                    className="p-1 rounded-lg hover:bg-white text-gray-400 hover:text-emerald-600 transition-all"
                    title="Scan Barcode"
                  >
                    <Barcode size={14} />
                  </button>
                </div>
                {isAuditMode ? (
                  <>
                    <button
                      onClick={() => { setIsAuditMode(false); setAuditQuantities({}); }}
                      className="px-4 py-2 rounded-xl border border-gray-200 text-gray-500 text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAuditSave}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-50 transition-all"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Audit'}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setIsAuditMode(true);
                      const initial = {};
                      filteredActiveStock.forEach(s => initial[s.productId] = s.quantity);
                      setAuditQuantities(initial);
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <Pencil size={12} />
                    Audit Inventory
                  </button>
                )}
              </div>
            </div>

            {isAuditMode && (
              <div className="flex items-center gap-3 bg-emerald-50/50 p-4 rounded-[1.5rem] border border-emerald-100 animate-in slide-in-from-top-2 mb-2">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-100">
                  <FileText size={20} />
                </div>
                <div className="flex flex-col flex-1">
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Audit Note / Remark</span>
                  <input
                    type="text"
                    placeholder="e.g. Stock mismatch correction, Route end audit..."
                    className="bg-transparent border-none outline-none text-sm font-black text-emerald-900 placeholder:text-emerald-300 w-full"
                    value={auditRemark}
                    onChange={(e) => setAuditRemark(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}

            {filteredActiveStock.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                <Package size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No active stock loaded</p>
              </div>
            ) : (
              <>
                <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredActiveStock.map(item => (
                    <div key={`track-item-${item.id}`} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-100 transition-colors rounded-2xl border border-gray-100 group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                          {item.product?.isFree ? <Gift size={18} className="text-emerald-500" /> : <Package size={18} className="text-gray-400 group-hover:text-emerald-500" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-gray-800 line-clamp-1 leading-tight">{item.product?.name || 'Unknown'}</span>
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter mt-0.5">Rate: ₹{item.product?.price || 0}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end shrink-0 pl-2">
                        {isAuditMode ? (
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Audit</span>
                              <input
                                type="number"
                                min="0"
                                onWheel={(e) => e.target.blur()}
                                className="w-14 bg-white border border-emerald-200 rounded-lg px-2 py-1.5 text-sm font-black text-emerald-700 outline-none text-right"
                                value={auditQuantities[item.productId] ?? item.quantity}
                                onChange={(e) => setAuditQuantities({ ...auditQuantities, [item.productId]: Math.max(0, parseInt(e.target.value) || 0) })}
                              />
                            </div>
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] font-black text-gray-400 uppercase mb-0.5">Diff</span>
                              <div className={`w-12 py-1.5 rounded-lg text-center text-[10px] font-black border ${(item.quantity - (auditQuantities[item.productId] ?? item.quantity)) > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                (item.quantity - (auditQuantities[item.productId] ?? item.quantity)) < 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                  'bg-gray-50 text-gray-400 border-gray-100'
                                }`}>
                                {item.quantity - (auditQuantities[item.productId] ?? item.quantity)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="text-sm font-black text-gray-900 leading-tight">{item.quantity} <span className="text-[9px] text-gray-400 uppercase">Qty</span></span>
                            <span className="text-[10px] font-black text-gray-500 mt-0.5">₹{(item.quantity * parseFloat(item.product?.price || 0)).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Rate</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">System Qty</th>
                        {isAuditMode && (
                          <>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 text-center bg-emerald-50/30">Audit Count</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-600 text-center bg-rose-50/20">Difference</th>
                          </>
                        )}
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {filteredActiveStock.map((item) => {
                        const qty = isAuditMode ? (auditQuantities[item.productId] ?? item.quantity) : item.quantity;
                        const price = parseFloat(item.product?.price || 0);
                        const displayAmount = qty * price;
                        return (
                          <tr key={`track-table-${item.id}`} className="hover:bg-gray-50/30 transition-colors group">
                            <td className="px-6 py-4 border-r border-gray-50 group-hover:border-transparent">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 shadow-inner flex items-center justify-center">
                                  {item.product?.isFree ? <Gift size={18} className="text-emerald-500" /> : <Package size={18} className="text-gray-400 group-hover:text-emerald-500" />}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-gray-800 line-clamp-1">{item.product?.name || 'Unknown'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center border-r border-gray-50 group-hover:border-transparent">
                              <span className="text-xs font-black text-gray-500">₹{price}</span>
                            </td>
                            <td className="px-6 py-4 border-r border-gray-50 group-hover:border-transparent text-center">
                              <span className={`text-sm font-black ${isAuditMode ? 'text-indigo-300' : 'text-gray-900'}`}>{item.quantity}</span>
                            </td>
                            {isAuditMode && (
                              <>
                                <td className="px-6 py-4 border-r border-emerald-50 bg-emerald-50/10 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    onWheel={(e) => e.target.blur()}
                                    className="w-16 bg-white border border-emerald-200 rounded-xl px-2 py-2 text-sm text-center font-black text-emerald-700 outline-none"
                                    value={auditQuantities[item.productId] ?? item.quantity}
                                    onChange={(e) => setAuditQuantities({ ...auditQuantities, [item.productId]: Math.max(0, parseInt(e.target.value) || 0) })}
                                  />
                                </td>
                                <td className="px-6 py-4 border-r border-rose-50 bg-rose-50/5 text-center">
                                  <div className={`inline-flex items-center justify-center w-12 h-8 rounded-xl font-black text-xs border ${(item.quantity - (auditQuantities[item.productId] ?? item.quantity)) > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                                    (item.quantity - (auditQuantities[item.productId] ?? item.quantity)) < 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                      'bg-indigo-50 text-indigo-400 border-indigo-100'
                                    }`}>
                                    {item.quantity - (auditQuantities[item.productId] ?? item.quantity)}
                                  </div>
                                </td>
                              </>
                            )}
                            <td className="px-6 py-4 text-right">
                              <span className="text-sm font-black text-emerald-700">₹{displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Agent & Vehicle</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Inventory Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Last Audit</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {vehicles.map(v => {
              const inventory = allVehiclesStock[v.id] || [];
              const activeStock = inventory.filter(i => i.quantity > 0);
              const totalValue = activeStock.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product?.price || 0)), 0);
              const agentStr = v.assignedUsers?.[0] ? v.assignedUsers[0].name : 'Unassigned';
              const lastAudit = auditHistory.find(a => a.vehicleId === v.id);

              return (
                <tr
                  key={`track-row-list-${v.id}`}
                  onClick={() => setViewingVehicleId(v.id)}
                  className="hover:bg-emerald-50/20 transition-all cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                        <Truck size={24} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 tracking-tight leading-none mb-1">{agentStr}</span>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{v.vehicleNumber}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-black text-gray-700">{activeStock.length} SKUs</span>
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">₹{totalValue.toLocaleString('en-IN')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {lastAudit ? (
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-indigo-600 leading-none mb-0.5">{new Date(lastAudit.createdAt).toLocaleDateString()}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Verified</span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">Never Audited</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 text-[10px] font-black text-gray-300 uppercase tracking-widest group-hover:text-emerald-600 transition-colors">
                      View Detailed Inventory
                      <ArrowLeft className="rotate-180" size={14} strokeWidth={3} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicles.map(v => {
          const inventory = allVehiclesStock[v.id] || [];
          const activeStock = inventory.filter(i => i.quantity > 0);
          const totalValue = activeStock.reduce((acc, item) => acc + (item.quantity * parseFloat(item.product?.price || 0)), 0);
          const agentStr = v.assignedUsers?.[0] ? v.assignedUsers[0].name : 'Unassigned';
          const lastAudit = auditHistory.find(a => a.vehicleId === v.id);

          return (
            <div
              key={`track-card-${v.id}`}
              onClick={() => setViewingVehicleId(v.id)}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm hover:border-emerald-300 hover:shadow-xl hover:shadow-emerald-500/5 transition-all cursor-pointer group flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-50 group-hover:bg-emerald-600 rounded-2xl flex items-center justify-center text-gray-400 group-hover:text-white transition-all shrink-0 shadow-inner">
                  <Truck size={24} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-black text-gray-900 truncate leading-none mb-1">{agentStr}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{v.vehicleNumber}</span>
                </div>
              </div>
              <div className="bg-gray-50 group-hover:bg-emerald-50/50 transition-colors p-3 rounded-2xl flex justify-between items-center border border-transparent group-hover:border-emerald-100 italic">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">Stock Items</span>
                  <span className="text-sm font-black text-gray-700 leading-none mt-1">{activeStock.length} SKUs</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black uppercase text-indigo-600/70 tracking-widest">Last Audit</span>
                  <span className="text-sm font-black text-indigo-700 leading-none mt-1">
                    {lastAudit ? new Date(lastAudit.createdAt).toLocaleDateString() : 'Never'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-gray-400 group-hover:text-emerald-600 mt-1 transition-colors">
                <span>View Details</span>
                <ArrowLeft className="rotate-180" size={12} strokeWidth={3} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VehicleStockSection;
