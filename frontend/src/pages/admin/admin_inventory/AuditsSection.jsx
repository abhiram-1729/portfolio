import React from 'react';
import { ArrowLeft, CheckSquare, FileText, Truck, RefreshCw, Package, Gift, Search, Loader2 } from 'lucide-react';

const AuditsSection = ({
  selectedAuditId,
  setSelectedAuditId,
  auditHistory,
  loadingAudit,
  auditSearch,
  setAuditSearch,
  fetchData,
  loading
}) => {
  if (selectedAuditId) {
    const audit = auditHistory.find(a => a.id === selectedAuditId);
    if (!audit) {
      setSelectedAuditId(null);
      return null;
    }

    return (
      <div className="space-y-6 animate-in slide-in-from-right duration-500">
        {/* Detailed View Header */}
        <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSelectedAuditId(null)}
              className="p-3 bg-gray-50 hover:bg-white hover:shadow-sm rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-gray-100 active:scale-90"
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-600/20">
              <CheckSquare size={24} strokeWidth={3} />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl font-black text-gray-900 uppercase leading-none mb-1">Audit Details</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{audit.vehicle?.vehicleNumber} • {audit.vehicle?.vehicleName || 'General Vehicle'}</p>
            </div>
          </div>
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Adjustment Date</span>
            <span className="text-sm font-black text-indigo-600">{new Date(audit.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Detailed View Body */}
        <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10 pb-8 border-b border-gray-50">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><FileText size={12} className="text-indigo-400" /> Admin User</span>
              <span className="text-sm font-black text-gray-800">{audit.user?.name}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Truck size={12} className="text-indigo-400" /> Vehicle Type</span>
              <span className="text-sm font-black text-gray-800">{audit.vehicle?.vehicleName || 'Standard Load'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><RefreshCw size={12} className="text-indigo-400" /> Timestamp</span>
              <span className="text-sm font-black text-gray-800">
                {new Date(audit.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Package size={12} className="text-indigo-400" /> Items Changed</span>
              <span className="text-sm font-black text-gray-800">{audit.items.length} Products</span>
            </div>
            <div className="flex flex-col col-span-full mt-4 bg-indigo-50/30 p-5 rounded-2xl border border-indigo-100/50">
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5"><Gift size={12} /> Auditor's Remark</span>
              <span className="text-sm font-black text-indigo-950 italic leading-relaxed">"{audit.remark || 'No session remarks provided for this adjustment.'}"</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Adjusted Product</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">System Qty</th>
                  <th className="px-6 py-4 text-[10px] font-black text-indigo-600 uppercase tracking-widest text-center">Audited Qty</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {audit.items.map((item) => {
                  const diff = (item.newQuantity || 0) - (item.oldQuantity || 0);
                  return (
                    <tr key={item.id} className="hover:bg-indigo-50/10 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-800 group-hover:text-indigo-600 transition-colors uppercase tracking-tight leading-none mb-1">{item.product?.name}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{item.product?.category?.name || 'General'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-black text-gray-400 text-center">{item.oldQuantity}</td>
                      <td className="px-6 py-4 text-sm font-black text-indigo-600 text-center bg-indigo-50/5 font-mono">{item.newQuantity}</td>
                      <td className="px-6 py-4 text-right">
                        <span className={`inline-flex items-center justify-center min-w-[60px] px-3 py-1 rounded-xl text-[10px] font-black shadow-sm border ${diff > 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          diff < 0 ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            'bg-gray-100 text-gray-400 border-gray-200'
                          }`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? 'FIXED' : diff}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 border-b border-gray-100 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-indigo-50 rounded-3xl flex items-center justify-center text-indigo-600 shadow-inner">
              <CheckSquare size={32} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-none mb-2 uppercase">Audit History</h3>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Package size={14} className="text-indigo-400" />
                Select a record to view detailed adjustments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search logs..."
                className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
              />
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-3 bg-gray-50 hover:bg-indigo-50 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 shadow-sm"
            >
              <Loader2 size={24} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {loadingAudit ? (
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-white border border-gray-50 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : auditHistory.length === 0 ? (
          <div className="text-center py-24 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-gray-200/50">
              <CheckSquare size={40} className="text-gray-200" />
            </div>
            <p className="text-lg font-black text-gray-400 uppercase tracking-[0.2em]">No audit records found</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle Name / Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Admin User</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Timestamp</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right pr-12">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-[11px] font-black">
                {auditHistory
                  .filter(a =>
                    a.vehicle?.vehicleNumber?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                    a.vehicle?.vehicleName?.toLowerCase().includes(auditSearch.toLowerCase()) ||
                    a.user?.name?.toLowerCase().includes(auditSearch.toLowerCase())
                  )
                  .map((audit) => (
                    <tr
                      key={audit.id}
                      onClick={() => setSelectedAuditId(audit.id)}
                      className="hover:bg-indigo-50/30 transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white rounded-xl flex items-center justify-center transition-all shadow-inner">
                            <Truck size={18} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-gray-900 group-hover:text-indigo-600 uppercase tracking-tight transition-colors">{audit.vehicle?.vehicleNumber}</span>
                            <span className="text-[9px] text-gray-400 uppercase tracking-widest">{audit.vehicle?.vehicleName || 'Regular Load'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-gray-700 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">{audit.user?.name}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col">
                          <span className="text-gray-800">{new Date(audit.createdAt).toLocaleDateString()}</span>
                          <span className="text-[9px] text-gray-400 uppercase tracking-tighter">{new Date(audit.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right pr-6">
                        <div className="flex items-center justify-end gap-3">
                          <span className="text-gray-400 italic font-medium truncate max-w-[150px]">{audit.remark || 'N/A'}</span>
                          <div className="p-2 bg-indigo-50 rounded-lg text-indigo-400 group-hover:translate-x-1 transition-all">
                            <Truck className="rotate-180" size={12} strokeWidth={3} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditsSection;
