import React, { useState, useEffect } from 'react';
import { X, Truck, ArrowUpCircle, Square, CheckSquare, Package, Minus, Plus, Loader2, Check, History, Clock, ArrowLeft, Printer, FileDown, FileText, RefreshCw } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import * as XLSX from 'xlsx';

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
  const [activeTab, setActiveTab] = useState('active');
  const [historyData, setHistoryData] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await adminAPI.getRefillHistory();
      
      const grouped = {};
      res.data.forEach(item => {
        const d = new Date(item.date);
        const timeKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${Math.floor(d.getMinutes() / 5)}`; 
        const key = `${item.vehicleId}_${timeKey}`;
        if (!grouped[key]) {
          grouped[key] = {
            date: item.date,
            vehicle: item.vehicle,
            user: item.user,
            items: []
          };
        }
        grouped[key].items.push(item);
      });
      
      setHistoryData(Object.values(grouped).sort((a,b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const exportHistoryToExcel = () => {
    const data = historyData.map(session => ({
      'Vehicle Number': session.vehicle?.vehicleNumber,
      'Vehicle Type': session.vehicle?.vehicleName || 'Standard Load',
      'Authorized By': session.user?.name || 'System Admin',
      'Date': new Date(session.date).toLocaleDateString(),
      'Time': new Date(session.date).toLocaleTimeString(),
      'SKUs Refilled': session.items.length,
      'Total Qty': session.items.reduce((acc, item) => acc + item.quantity, 0),
      'Timestamp': new Date(session.date).toISOString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RefillHistory");
    XLSX.writeFile(wb, `Refill_History_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportRefillDetailToExcel = () => {
    if (!selectedSession) return;
    const data = selectedSession.items.map(item => ({
      'Product Name': item.product?.name,
      'Category': item.product?.category?.name || 'General',
      'SKU Code': item.product?.skuCode,
      'Barcode': item.product?.barcode,
      'Quantity Refilled': item.quantity,
      'Unit': item.product?.unit?.name || 'pcs',
      'Vehicle': selectedSession.vehicle?.vehicleNumber,
      'Date': new Date(selectedSession.date).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "RefillDetails");
    XLSX.writeFile(wb, `Refill_Details_${selectedSession.vehicle?.vehicleNumber}_${new Date(selectedSession.date).toLocaleDateString()}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

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
                <div className={`hidden md:block absolute left-[24px] top-1.5 w-4 h-4 rounded-full border-4 border-white ring-2 ring-offset-2 transition-all group-hover/session:scale-125 ${req.status === 'PENDING' ? 'ring-emerald-400 bg-emerald-400' :
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
                      <div className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-widest ${req.status === 'PENDING' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-sm shadow-emerald-500/10' :
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
                            <div className="absolute -top-2 -right-2 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow-lg shadow-emerald-500/30 ring-2 ring-white flex items-center gap-1 z-10 animate-in zoom-in duration-300">
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
                            {req.status === 'PENDING' && can && can('INVENTORY', 'UPDATE', 'REFILLS') && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleRefillItemSelection(item.id); }}
                                className={`shrink-0 transition-all ${isSelected ? 'text-indigo-600' : 'text-gray-300'}`}
                              >
                                {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                              </button>
                            )}
                              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black shrink-0 ${req.status === 'REJECTED' ? 'bg-rose-50 text-rose-600 border-rose-200' :
                                req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                                  'bg-emerald-50 text-emerald-600 border-emerald-200'
                                }`}>
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
                                {can && can('INVENTORY', 'UPDATE', 'REFILLS') ? (
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
                              {can && can('INVENTORY', 'UPDATE', 'REFILLS') && (
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
      <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 max-w-fit overflow-x-auto">
        <button onClick={() => setActiveTab('active')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'active' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>
           <ArrowUpCircle size={14} className="inline mr-2 mb-0.5" /> Pending Requests
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>
           <History size={14} className="inline mr-2 mb-0.5" /> Refill History
        </button>
      </div>

      {activeTab === 'active' ? (
        <>
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
    </>
  ) : (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 min-h-[400px]">
          {selectedSession ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 print:p-0">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page { size: A4; margin: 10mm; }
                  body { background: white !important; -webkit-print-color-adjust: exact; }
                  body * { visibility: hidden; }
                  .print-section, .print-section * { visibility: visible; }
                  .print-section { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    border: none !important; 
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 !important;
                  }
                  .no-print { display: none !important; }
                  .print-header { display: block !important; margin-bottom: 20px; border-bottom: 3px solid #059669; padding-bottom: 10px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10pt; }
                  th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
                  th { background-color: #f8fafc !important; color: #059669 !important; font-weight: 900 !important; text-transform: uppercase; letter-spacing: 0.05em; font-size: 8pt; }
                  .page-break-inside-avoid { page-break-inside: avoid; }
                }
                .print-header { display: none; }
              `}} />
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 no-print">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSelectedSession(null)}
                    className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all border border-gray-100"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Refill Details</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Refill Audit Session</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportRefillDetailToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm">
                    <FileDown size={14} /> Excel
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-sm">
                    <Printer size={14} /> Print
                  </button>
                </div>
              </div>

              <div className="print-section">
                <div className="print-header">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-black text-emerald-600 uppercase">Refill Session Report</h1>
                      <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">VillageKart Sales Tracker</p>
                    </div>
                    <div className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Session ID: {selectedSession.id || 'N/A'}<br/>
                      Date: {new Date(selectedSession.date).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-x-12 gap-y-6 mb-8 pb-6 border-b border-gray-50">
                  <div className="flex flex-col min-w-[150px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Truck size={10} className="text-emerald-400" /> Vehicle</span>
                    <span className="text-xs font-black text-gray-800 uppercase">{selectedSession.vehicle?.vehicleNumber || 'Unknown'}</span>
                  </div>
                  <div className="flex flex-col min-w-[150px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Check size={10} className="text-emerald-400" /> Authorized By</span>
                    <span className="text-xs font-black text-gray-800">{selectedSession.user?.name || 'System Admin'}</span>
                  </div>
                  <div className="flex flex-col min-w-[150px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><RefreshCw size={10} className="text-emerald-400" /> Timestamp</span>
                    <span className="text-xs font-black text-gray-800">
                      {new Date(selectedSession.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  <div className="flex flex-col min-w-[100px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Package size={10} className="text-emerald-400" /> Total Items</span>
                    <span className="text-xs font-black text-emerald-600">{selectedSession.items.length} Products</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-gray-50/50">
                        <th className="px-3 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                        <th className="px-3 py-2 text-[8px] font-black text-gray-400 uppercase tracking-widest text-center">SKU</th>
                        <th className="px-3 py-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedSession.items.map((item, i) => (
                        <tr key={`det-ref-${i}`} className="hover:bg-emerald-50/10 transition-colors group">
                          <td className="px-3 py-1.5">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-gray-800 group-hover:text-emerald-600 transition-colors uppercase truncate max-w-[150px] leading-tight">{item.product?.name}</span>
                              <span className="text-[7px] font-bold text-gray-400 uppercase tracking-tighter">{item.product?.category?.name || 'General'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-1.5 text-[9px] font-bold text-gray-400 text-center font-mono">{item.product?.skuCode || '---'}</td>
                          <td className="px-3 py-1.5 text-right">
                            <span className="text-[10px] font-black text-emerald-600">+{item.quantity}</span>
                            <span className="text-[7px] font-bold text-gray-400 uppercase ml-0.5">{item.product?.unit?.name || 'pcs'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-20 hidden print:block">
                  <div className="flex justify-between px-10 gap-20">
                    <div className="text-center flex-1">
                      <div className="border-t border-gray-400 pt-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Authorized Signatory</p>
                      </div>
                    </div>
                    <div className="text-center flex-1">
                      <div className="border-t border-gray-400 pt-2">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Receiver's Signature</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">This is a system generated inventory manifest from VillageKart Sales Tracker.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="print-section">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page { size: A4 landscape; margin: 10mm; }
                  body { background: white !important; -webkit-print-color-adjust: exact; }
                  body * { visibility: hidden; }
                  .print-section, .print-section * { visibility: visible; }
                  .print-section { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    width: 100%; 
                    border: none !important; 
                    box-shadow: none !important;
                    padding: 0 !important;
                  }
                  .no-print { display: none !important; }
                  .print-header { display: block !important; margin-bottom: 20px; border-bottom: 3px solid #059669; padding-bottom: 10px; }
                  table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9pt; }
                  th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                  th { background-color: #f8fafc !important; color: #059669 !important; font-weight: 900 !important; text-transform: uppercase; }
                }
                .print-header { display: none; }
              `}} />
              <div className="print-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-black text-emerald-600">REFILL HISTORY LOGS</h1>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">VillageKart Sales Tracker</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Export Date</p>
                    <p className="text-sm font-black">{new Date().toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between no-print mb-6 pb-4 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                  <History size={18} className="text-emerald-500" />
                  Refill History
                </h4>
                <div className="flex items-center gap-2">
                  <button onClick={exportHistoryToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm">
                    <FileDown size={14} /> Export Excel
                  </button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100 shadow-sm">
                    <Printer size={14} /> Print History
                  </button>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Clock size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-bold text-gray-400">No refill history found.</p>
                </div>
              ) : (
                <>
                  <div className="no-print bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Refill Session / Date</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Vehicle Info</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Authorized By</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Items / Qty</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {historyData.map((session, idx) => (
                          <tr 
                            key={`ref-hist-row-${idx}`} 
                            onClick={() => setSelectedSession(session)}
                            className="hover:bg-emerald-50/30 transition-all cursor-pointer group"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all shadow-inner">
                                  <Clock size={18} />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-gray-900 uppercase tracking-tight">
                                    {new Date(session.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-bold uppercase">
                                    {new Date(session.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex flex-col items-center">
                                <span className="text-xs font-black text-emerald-700 uppercase tracking-tight">{session.vehicle?.vehicleNumber}</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase">{session.vehicle?.vehicleName || 'Standard'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span className="text-[11px] font-black text-gray-600 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
                                {session.user?.name || 'System'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-emerald-600">{session.items.length} SKUs</span>
                                <span className="text-[9px] text-gray-400 font-bold uppercase">
                                  Total: {session.items.reduce((acc, item) => acc + item.quantity, 0)} Units
                                </span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Print Only Table for History */}
                  <div className="hidden print:block">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase">Date & Time</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase">Vehicle Number</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase">Admin</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase text-center">Items</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase text-right">Total Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map((session, idx) => (
                          <tr key={`print-ref-${idx}`} className="page-break-inside-avoid">
                            <td className="border border-gray-200 p-2 text-[10px]">
                              {new Date(session.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </td>
                            <td className="border border-gray-200 p-2 text-[10px] font-bold uppercase">
                              {session.vehicle?.vehicleNumber || '---'}
                            </td>
                            <td className="border border-gray-200 p-2 text-[10px]">
                              {session.user?.name || 'System'}
                            </td>
                            <td className="border border-gray-200 p-2 text-[10px] text-center font-bold">
                              {session.items.length}
                            </td>
                            <td className="border border-gray-200 p-2 text-[10px] text-right font-bold">
                              {session.items.reduce((acc, item) => acc + item.quantity, 0)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-8 pt-4 border-t border-gray-200 text-right text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                      End of Refill History Report • Total Sessions: {historyData.length}
                    </div>
                  </div>
                </>
              ) }
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RefillsSection;
