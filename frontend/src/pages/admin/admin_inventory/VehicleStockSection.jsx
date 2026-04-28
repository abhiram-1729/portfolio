import React from 'react';
import { Truck, Package, Search, Barcode, Pencil, Gift, FileText, CheckSquare, ArrowLeft, Printer, FileDown } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  setSubTab,
  can
}) => {
  const handlePrint = () => {
    window.print();
  };

  const exportStockToExcel = (v, stock) => {
    const data = stock.map(item => ({
      'Product Name': item.product?.name,
      'Category': item.product?.category?.name || 'General',
      'SKU Code': item.product?.skuCode,
      'Barcode': item.product?.barcode,
      'Rate': item.product?.price || 0,
      'Current Quantity': item.quantity,
      'Unit': item.product?.unit?.name || 'pcs',
      'Total Value': (item.quantity * parseFloat(item.product?.price || 0)).toFixed(2),
      'Vehicle': v.vehicleNumber,
      'Report Date': new Date().toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "VehicleStock");
    XLSX.writeFile(wb, `Stock_${v.vehicleNumber}_${new Date().toLocaleDateString()}.xlsx`);
  };

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
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300 print:p-0">
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
        <div className="flex items-center justify-between no-print">
          <button
            onClick={() => setViewingVehicleId(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 transition-colors font-bold text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm w-fit"
          >
            ← Back to Vehicles
          </button>
          <div className="flex items-center gap-2">
            <button onClick={() => exportStockToExcel(v, filteredActiveStock)} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"><FileDown size={14} /> Excel</button>
            <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all border border-gray-100 shadow-sm"><Printer size={14} /> Print</button>
          </div>
        </div>

        <div className="print-section">
          <div className="print-header">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-black text-emerald-600 uppercase">Live Vehicle Stock Report</h1>
                <p className="text-xs font-bold text-gray-400 tracking-[0.2em] uppercase">VillageKart Sales Tracker</p>
              </div>
              <div className="text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Report Date: {new Date().toLocaleString()}</div>
            </div>
          </div>

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

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 no-print">
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
                  {can && can('INVENTORY', 'UPDATE', 'AUDITS') && (
                    isAuditMode ? (
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
                    )
                  )}
                </div>
              </div>

              <div className="hidden print:block mb-4">
                <p className="text-[10px] font-bold text-gray-500 uppercase">Live inventory of products currently held in the vehicle.</p>
              </div>

              {filteredActiveStock.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                  <Package size={32} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No active stock loaded</p>
                </div>
              ) : (
                <>
                  <div className="md:hidden grid grid-cols-1 sm:grid-cols-2 gap-3 no-print">
                    {filteredActiveStock.map(item => (
                      <div key={`track-item-mob-${item.id}`} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-emerald-50/50 hover:border-emerald-100 transition-colors rounded-2xl border border-gray-100 group">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 shadow-sm flex items-center justify-center">
                            {item.product?.isFree ? <Gift size={18} className="text-emerald-500" /> : <Package size={18} className="text-gray-400 group-hover:text-emerald-500" />}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-gray-800 line-clamp-1 leading-tight">{item.product?.name || 'Unknown'}</span>
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter mt-0.5">Rate: ₹{item.product?.price || 0}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-sm font-black text-gray-900 leading-tight">{item.quantity}</span>
                          <span className="text-[10px] font-black text-gray-500 mt-0.5">₹{(item.quantity * parseFloat(item.product?.price || 0)).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="hidden md:block print:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-6">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Rate</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">System Qty</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Total Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredActiveStock.map((item) => {
                          const price = parseFloat(item.product?.price || 0);
                          const displayAmount = item.quantity * price;
                          return (
                            <tr key={`track-table-pc-${item.id}`} className="hover:bg-gray-50/30 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-100 shadow-inner flex items-center justify-center no-print">
                                    {item.product?.isFree ? <Gift size={18} className="text-emerald-500" /> : <Package size={18} className="text-gray-400 group-hover:text-emerald-500" />}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-[11px] font-black text-gray-800 line-clamp-1 uppercase tracking-tight">{item.product?.name || 'Unknown'}</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase">{item.product?.skuCode}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-xs font-black text-gray-500">₹{price}</span>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="text-sm font-black text-gray-900">{item.quantity}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <span className="text-sm font-black text-emerald-700">₹{displayAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-20 hidden print:block">
                    <div className="flex justify-between px-10 gap-20">
                      <div className="text-center flex-1">
                        <div className="border-t border-gray-400 pt-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Authorized Auditor</p>
                        </div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="border-t border-gray-400 pt-2">
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Agent / Custodian</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-8 text-center">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tighter">This is a system generated stock report from VillageKart Sales Tracker.</p>
                    </div>
                  </div>
                </>
              )}
            </div>
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
