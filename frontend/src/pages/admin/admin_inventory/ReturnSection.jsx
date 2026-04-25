import React, { useState, useEffect } from 'react';
import { Truck, Search, Barcode, ArrowDownCircle, Gift, Package, ArrowLeft, Loader2, History, Clock, Printer, FileDown, FileText, RefreshCw, Check } from 'lucide-react';
import { StockItemRow } from './SharedComponents';
import adminAPI from '../../../services/adminService';
import * as XLSX from 'xlsx';

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
  vehicleInventoryMap,
  can
}) => {
  const [activeTab, setActiveTab] = useState('return');
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
      const res = await adminAPI.getReturnHistory();
      
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

  const handlePrint = () => {
    window.print();
  };

  const exportHistoryToExcel = () => {
    const data = historyData.map(session => ({
      'Vehicle Number': session.vehicle?.vehicleNumber,
      'Vehicle Type': session.vehicle?.vehicleName || 'Standard Load',
      'Received By': session.user?.name || 'System Admin',
      'Date': new Date(session.date).toLocaleDateString(),
      'Time': new Date(session.date).toLocaleTimeString(),
      'SKUs Returned': session.items.length,
      'Total Qty': session.items.reduce((acc, item) => acc + item.quantity, 0),
      'Timestamp': new Date(session.date).toISOString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ReturnHistory");
    XLSX.writeFile(wb, `Return_History_${new Date().toLocaleDateString()}.xlsx`);
  };

  const exportReturnDetailToExcel = () => {
    if (!selectedSession) return;
    const data = selectedSession.items.map(item => ({
      'Product Name': item.product?.name,
      'Category': item.product?.category?.name || 'General',
      'SKU Code': item.product?.skuCode,
      'Rate': item.priceAtTime || item.product?.price,
      'Quantity Returned': item.quantity,
      'Unit': item.product?.unit?.name || 'pcs',
      'Total Value': (item.quantity * (item.priceAtTime || item.product?.price)).toFixed(2),
      'Vehicle': selectedSession.vehicle?.vehicleNumber,
      'Date': new Date(selectedSession.date).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ReturnDetails");
    XLSX.writeFile(wb, `Return_Details_${selectedSession.vehicle?.vehicleNumber}_${new Date(selectedSession.date).toLocaleDateString()}.xlsx`);
  };

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
            {can && can('INVENTORY', 'UPDATE') && (
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 text-center bg-emerald-50/10">Return Qty</th>
            )}
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
                {can && can('INVENTORY', 'UPDATE') && (
                  <td className="px-6 py-4 border-r border-gray-50 group-hover:border-transparent bg-emerald-50/5">
                    <div className="flex flex-col items-center justify-center gap-1">
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        onWheel={(e) => e.target.blur()}
                        className={`w-20 bg-white border ${qty > currentStock ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-gray-200'} rounded-xl px-2 py-2 text-sm text-center font-black focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm`}
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
                )}
                <td className="px-6 py-4 text-right">
                  <span className={`text-sm font-black ${qty > 0 ? 'text-emerald-600' : 'text-gray-300'}`}>
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
    <div className="space-y-6 animate-in fade-in duration-500 print:p-0">
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
        }
        .print-header { display: none; }
      `}} />
      <div className="flex items-center gap-2 p-1 bg-gray-50 rounded-2xl border border-gray-100 max-w-fit no-print">
        <button onClick={() => setActiveTab('return')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'return' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>
          <ArrowDownCircle size={14} className="inline mr-2 mb-0.5" /> Return Operations
        </button>
        <button onClick={() => setActiveTab('history')} className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}>
          <History size={14} className="inline mr-2 mb-0.5" /> Return History
        </button>
      </div>

      {activeTab === 'return' ? (
        <div className="no-print space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
            <div className="lg:col-span-3 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-emerald-600"></div>
              <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-gray-100 gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 shadow-inner">
                    <ArrowDownCircle size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2 uppercase">Stock Return</h3>
                    <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Barcode size={14} className="text-emerald-400" /> Reclaim stock from vehicles
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" placeholder="Search products..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all shadow-inner" value={returnSearch} onChange={(e) => setReturnSearch(e.target.value)} />
                  </div>
                  <button onClick={() => { setScannerTarget('returnOps'); setShowScanner(true); }} className="p-3 bg-gray-50 hover:bg-emerald-50 rounded-2xl text-gray-400 hover:text-emerald-600 transition-all border border-transparent hover:border-emerald-100 shadow-sm">
                    <Barcode size={24} />
                  </button>
                </div>
              </div>

              {selectedVehicleId ? (
                <>
                  {regularItems.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Regular Products</h4>
                      {renderReturnTable(regularItems)}
                    </div>
                  )}
                  {freeItems.length > 0 && (
                    <div className="mt-8">
                      <div className="flex items-center gap-2 mb-4 px-2">
                        <Gift size={16} className="text-emerald-500" />
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">Free / Promotional Items</h4>
                      </div>
                      {renderReturnTable(freeItems, true)}
                    </div>
                  )}

                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-8 py-4 border-t border-gray-50">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 disabled:opacity-30 transition-colors">Prev</button>
                      <span className="text-[10px] font-black text-emerald-600 px-4 py-2 bg-emerald-50 rounded-xl">Page {currentPage} of {totalPages}</span>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-emerald-600 disabled:opacity-30 transition-colors">Next</button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 bg-gray-50/50 rounded-[2.5rem] border border-dashed border-gray-200">
                  <Truck size={48} className="mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-black text-gray-900 uppercase">Select Vehicle</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">Select a vehicle to start reclaiming stock</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-600 mb-6 shadow-inner">
                  <Truck size={40} strokeWidth={2.5} />
                </div>
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Source Vehicle</h4>
                <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-4 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-center" value={selectedVehicleId} onChange={(e) => setSelectedVehicleId(e.target.value)}>
                  <option value="">Select a Vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName})</option>
                  ))}
                </select>
              </div>

              <div className="bg-emerald-600 p-8 rounded-[2.5rem] shadow-xl shadow-emerald-600/20 text-white relative overflow-hidden group">
                <h4 className="text-[10px] font-black text-emerald-200 uppercase tracking-[0.2em] mb-4">Total Return Value</h4>
                <div className="text-4xl font-black mb-8 leading-none tracking-tighter">₹{totalReturnInventoryValue.toFixed(2)}</div>
                <button onClick={() => handleStockAction('RETURN')} disabled={isSubmitting || !selectedVehicleId || totalReturnInventoryValue === 0 || hasInvalidReturnQuantities} className="w-full bg-white text-emerald-600 py-5 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-emerald-50 active:scale-95 transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <ArrowDownCircle size={18} strokeWidth={3} />}
                  Complete Return
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 min-h-[400px]">
          {selectedSession ? (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 print:p-0">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 no-print">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedSession(null)} className="p-2.5 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-all border border-gray-100"><ArrowLeft size={18} /></button>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Return Details</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Inventory Reclaim Session</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={exportReturnDetailToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"><FileDown size={14} /> Excel</button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"><Printer size={14} /> Print</button>
                </div>
              </div>

              <div className="print-section">
                <div className="print-header">
                  <div className="flex justify-between items-center">
                    <div>
                      <h1 className="text-2xl font-black text-emerald-600 uppercase">Stock Return Report</h1>
                      <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">VillageKart Sales Tracker</p>
                    </div>
                    <div className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Date: {new Date(selectedSession.date).toLocaleString()}</div>
                  </div>
                </div>

                <div className="flex flex-wrap items-start gap-x-12 gap-y-6 mb-8 pb-6 border-b border-gray-50">
                  <div className="flex flex-col min-w-[150px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Truck size={10} className="text-emerald-400" /> Vehicle</span>
                    <span className="text-xs font-black text-gray-800 uppercase">{selectedSession.vehicle?.vehicleNumber || 'Unknown'}</span>
                  </div>
                  <div className="flex flex-col min-w-[150px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Check size={10} className="text-emerald-400" /> Received By</span>
                    <span className="text-xs font-black text-gray-800">{selectedSession.user?.name || 'System Admin'}</span>
                  </div>
                  <div className="flex flex-col min-w-[150px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><RefreshCw size={10} className="text-emerald-400" /> Timestamp</span>
                    <span className="text-xs font-black text-gray-800">{new Date(selectedSession.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
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
                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Rate</th>
                        <th className="px-4 py-3 text-[9px] font-black text-emerald-600 uppercase tracking-widest text-right">Qty Returned</th>
                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {selectedSession.items.map((item, i) => (
                        <tr key={`det-ret-${i}`} className="hover:bg-emerald-50/10 transition-colors group">
                          <td className="px-4 py-2.5">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-gray-800 group-hover:text-emerald-600 transition-colors uppercase tracking-tight leading-none mb-0.5">{item.product?.name}</span>
                              <span className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">{item.product?.category?.name || 'General'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-[10px] font-bold text-gray-400 text-center">₹{(item.priceAtTime || item.product?.price || 0).toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right"><span className="text-[11px] font-black text-emerald-600">-{item.quantity}</span><span className="text-[8px] font-bold text-gray-400 uppercase ml-1">{item.product?.unit?.name || 'pcs'}</span></td>
                          <td className="px-4 py-2.5 text-right text-[11px] font-black text-gray-900">₹{(item.quantity * (item.priceAtTime || item.product?.price || 0)).toFixed(2)}</td>
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
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Driver / Agent Signature</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 text-center">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">This is a system generated return manifest from VillageKart Sales Tracker.</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="print-section">
              <div className="print-header">
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-black text-emerald-600 uppercase">Return History Logs</h1>
                    <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">VillageKart Sales Tracker</p>
                  </div>
                  <div className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Export Date: {new Date().toLocaleString()}</div>
                </div>
              </div>
              <div className="flex items-center justify-between no-print mb-6 pb-4 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900 flex items-center gap-2 uppercase tracking-widest"><History size={18} className="text-emerald-500" /> Return History</h4>
                <div className="flex items-center gap-2">
                  <button onClick={exportHistoryToExcel} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm"><FileDown size={14} /> Export Excel</button>
                  <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-all border border-gray-100 shadow-sm"><Printer size={14} /> Print History</button>
                </div>
              </div>

              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={32} className="animate-spin text-emerald-500" /></div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><Clock size={32} className="mx-auto text-gray-300 mb-3" /><p className="text-sm font-bold text-gray-400">No return history found.</p></div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 no-print">
                    {historyData.map((session, idx) => (
                      <button key={`ret-hist-${idx}`} onClick={() => setSelectedSession(session)} className="group bg-gray-50/50 border border-gray-100 rounded-3xl p-5 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all text-left relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors" />
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shadow-sm">{new Date(session.date).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                          <div className="p-2 rounded-xl bg-white border border-gray-100 text-gray-400 group-hover:text-emerald-600 group-hover:border-emerald-200 transition-all"><Package size={14} /></div>
                        </div>
                        <div className="space-y-3 relative z-10">
                          <div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Vehicle Number</span><h5 className="font-black text-gray-900 text-sm flex items-center gap-2 uppercase"><Truck size={16} className="text-emerald-500" /> {session.vehicle?.vehicleNumber || 'Unspecified'}</h5></div>
                          <div className="flex items-center justify-between pt-3 border-t border-gray-100/50">
                            <div><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Returned By</span><span className="text-xs font-bold text-gray-700">{session.user?.name || 'System Admin'}</span></div>
                            <div className="text-right"><span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-0.5">Total SKU's</span><span className="text-xs font-black text-emerald-600">{session.items.length} Items</span></div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="hidden print:block">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase">Date & Time</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase">Vehicle Number</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase">Admin</th>
                          <th className="border border-gray-300 p-2 text-[10px] font-black uppercase text-center">Items</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map((session, idx) => (
                          <tr key={`print-ret-${idx}`} className="page-break-inside-avoid">
                            <td className="border border-gray-200 p-2 text-[10px]">{new Date(session.date).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td className="border border-gray-200 p-2 text-[10px] font-bold uppercase">{session.vehicle?.vehicleNumber || '---'}</td>
                            <td className="border border-gray-200 p-2 text-[10px]">{session.user?.name || 'System'}</td>
                            <td className="border border-gray-200 p-2 text-[10px] text-center font-bold">{session.items.length}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReturnSection;
