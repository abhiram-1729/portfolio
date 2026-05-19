import React, { useState, useEffect } from 'react';
import { 
  Search, Link2, CheckCircle2, ChevronRight, Package, Loader2,
  Star, Clock, ShieldCheck, Tag, Info, AlertCircle, Sparkles,
  ToggleLeft, ToggleRight, X, ArrowLeft, ArrowUpRight, DollarSign, Calendar
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import toast from 'react-hot-toast';

const MappingSection = ({ can, setHideMainHeader }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [products, setProducts] = useState([]);
  
  // mappedItems maps productId -> mapping data object
  const [mappedItems, setMappedItems] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vSearch, setVSearch] = useState('');
  const [pSearch, setPSearch] = useState('');
  
  // State to manage showing price history modal
  const [historyModal, setHistoryModal] = useState(null);

  useEffect(() => {
    if (setHideMainHeader) {
      setHideMainHeader(!!selectedVendor);
    }
    return () => {
      if (setHideMainHeader) setHideMainHeader(false);
    };
  }, [selectedVendor, setHideMainHeader]);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, p] = await Promise.all([
          procurementAPI.getVendors({ status: 'ACTIVE' }),
          adminAPI.getItems()
        ]);
        setVendors(v.data);
        setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      } catch { 
        toast.error('Failed to load initial data'); 
      } finally { 
        setLoading(false); 
      }
    };
    load();
  }, []);

  const selectVendor = async (v) => {
    setSelectedVendor(v);
    try {
      const { data } = await procurementAPI.getVendorMappings(v.id);
      
      // Convert mapping array into a lookup object
      const mappingDict = {};
      data.forEach(m => {
        mappingDict[m.productId] = {
          productId: m.productId,
          vendorSku: m.vendorSku || '',
          purchasePrice: String(m.purchasePrice || 0),
          moq: String(m.moq || 1),
          leadTime: String(m.leadTime || 0),
          taxPercent: String(m.taxPercent || 0),
          lastPurchaseRate: String(m.lastPurchaseRate || 0),
          isPreferred: m.isPreferred || false,
          priceHistory: m.priceHistory || []
        };
      });
      setMappedItems(mappingDict);
    } catch { 
      toast.error('Failed to load existing mappings'); 
    }
  };

  const toggleProduct = (productId, standardPrice = 0) => {
    setMappedItems(prev => {
      const next = { ...prev };
      if (next[productId]) {
        delete next[productId];
      } else {
        next[productId] = {
          productId,
          vendorSku: '',
          purchasePrice: String(standardPrice),
          moq: '1',
          leadTime: '3',
          taxPercent: '0',
          lastPurchaseRate: '0',
          isPreferred: false,
          priceHistory: []
        };
      }
      return next;
    });
  };

  const handleFieldChange = (productId, field, value) => {
    setMappedItems(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          [field]: value
        }
      };
    });
  };

  const handleTogglePreferred = (productId) => {
    setMappedItems(prev => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          isPreferred: !prev[productId].isPreferred
        }
      };
    });
  };

  const saveMappings = async () => {
    if (!selectedVendor) return;

    // Client-side validations
    const payload = Object.values(mappedItems).map(item => ({
      productId: item.productId,
      vendorSku: item.vendorSku ? item.vendorSku.trim() : null,
      purchasePrice: parseFloat(item.purchasePrice) || 0,
      moq: parseInt(item.moq) || 1,
      leadTime: parseInt(item.leadTime) || 0,
      taxPercent: parseFloat(item.taxPercent) || 0,
      isPreferred: !!item.isPreferred
    }));

    // Verify validity
    for (const item of payload) {
      if (item.purchasePrice < 0) {
        toast.error('Purchase Price cannot be negative.');
        return;
      }
      if (item.moq < 1) {
        toast.error('Minimum Order Quantity must be at least 1.');
        return;
      }
      if (item.leadTime < 0) {
        toast.error('Lead Time cannot be negative.');
        return;
      }
    }

    setSaving(true);
    try {
      await procurementAPI.updateVendorMappings(selectedVendor.id, { mappings: payload });
      toast.success('Supplier mappings updated successfully');
      
      // Reload mappings to get generated IDs and histories
      selectVendor(selectedVendor);
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Failed to save mappings'); 
    } finally { 
      setSaving(false); 
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-3">
      <Loader2 className="animate-spin text-emerald-600" size={40} />
      <span className="text-[10px] font-black uppercase tracking-widest">Loading catalog...</span>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {!selectedVendor ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in slide-in-from-left duration-300">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Procurement Management</h4>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Vendor Item Mapping</h2>
              </div>
              <div className="relative group w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search vendor..." 
                  className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                  value={vSearch}
                  onChange={e => setVSearch(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {vendors.filter(v => 
                  v.vendorName.toLowerCase().includes(vSearch.toLowerCase()) || 
                  v.mobile.includes(vSearch)
                ).map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => selectVendor(v)}
                    className="group bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 hover:scale-[1.01] active:scale-[0.99] transition-all text-left flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shrink-0">
                        <Link2 size={22} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-black text-gray-950 tracking-tight truncate group-hover:text-emerald-600 transition-colors">{v.vendorName}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{v.mobile}</span>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-0 animate-in slide-in-from-right duration-300">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1 relative">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedVendor(null)}
                  className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-95"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="flex flex-col">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Vendor Item Mapping
                  </h4>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">{selectedVendor.vendorName}</h2>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {/* Stats indicators */}
                <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-100/50 px-3 py-1.5 rounded-xl">
                  <Sparkles size={12} className="text-emerald-600" />
                  <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider">
                    {Object.keys(mappedItems).length} Mapped Products
                  </span>
                </div>
                
                <div className="relative group w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={12} />
                  <input 
                    type="text" 
                    placeholder="Filter products..." 
                    className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                    value={pSearch}
                    onChange={e => setPSearch(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white pb-28">
              <div className="flex flex-col gap-3 w-full max-w-6xl mx-auto">
                {products
                  .filter(p => p.name.toLowerCase().includes(pSearch.toLowerCase()))
                  .sort((a, b) => {
                    const isAMapped = !!mappedItems[a.id];
                    const isBMapped = !!mappedItems[b.id];
                    if (isAMapped && !isBMapped) return -1;
                    if (!isAMapped && isBMapped) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map(p => {
                  const isMapped = !!mappedItems[p.id];
                  const itemData = mappedItems[p.id];

                  return (
                    <div 
                      key={p.id}
                      className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                        isMapped 
                          ? 'bg-slate-50/40 border-emerald-200 shadow-sm' 
                          : 'bg-white border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {/* Main row click to toggle mapping */}
                      <div 
                        onClick={() => toggleProduct(p.id, p.purchasePrice || p.price)}
                        className={`flex items-center justify-between p-4 cursor-pointer select-none transition-all ${
                          isMapped ? 'bg-slate-50/80 border-b border-slate-100' : 'hover:bg-slate-50/20'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                            isMapped ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400'
                          }`}>
                            <Package size={16} />
                          </div>
                          
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-gray-900 tracking-tight">{p.name}</span>
                              {isMapped && itemData.isPreferred && (
                                <span className="inline-flex items-center gap-0.5 bg-amber-50 border border-amber-200/50 px-1.5 py-0.5 rounded text-[8px] font-black uppercase text-amber-600 tracking-wide">
                                  <Star size={8} fill="currentColor" /> Preferred Supplier
                                </span>
                              )}
                            </div>
                            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">ID: {p.id.slice(-6).toUpperCase()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">Standard Price</span>
                            <span className="text-xs font-black text-slate-800">₹{p.purchasePrice || p.price}</span>
                          </div>
                          
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isMapped ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200'
                          }`}>
                            {isMapped && <CheckCircle2 size={12} strokeWidth={3} />}
                          </div>
                        </div>
                      </div>

                      {/* Detail inputs expanded if mapped */}
                      {isMapped && (
                        <div className="p-4 bg-white grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 animate-in slide-in-from-top-2 duration-300">
                          {/* Vendor SKU */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Vendor SKU</label>
                            <input 
                              type="text" 
                              value={itemData.vendorSku} 
                              onChange={e => handleFieldChange(p.id, 'vendorSku', e.target.value)}
                              className="w-full bg-slate-50/50 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                              placeholder="e.g. SKU-123"
                            />
                          </div>

                          {/* Purchase Price */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Purchase Price (₹)</label>
                              {itemData.priceHistory?.length > 0 && (
                                <button 
                                  type="button" 
                                  onClick={() => setHistoryModal(itemData)}
                                  className="text-emerald-600 hover:text-emerald-700 transition-colors"
                                  title="View Rate History Logs"
                                >
                                  <Clock size={10} strokeWidth={3} />
                                </button>
                              )}
                            </div>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] font-bold">₹</span>
                              <input 
                                type="number" 
                                value={itemData.purchasePrice} 
                                onChange={e => handleFieldChange(p.id, 'purchasePrice', e.target.value)}
                                className="w-full bg-slate-50/50 rounded-xl pl-6 pr-2 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* MOQ */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">MOQ (Units)</label>
                            <input 
                              type="number" 
                              value={itemData.moq} 
                              onChange={e => handleFieldChange(p.id, 'moq', e.target.value)}
                              className="w-full bg-slate-50/50 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                              placeholder="1"
                            />
                          </div>

                          {/* Lead Time */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Lead Time (Days)</label>
                            <input 
                              type="number" 
                              value={itemData.leadTime} 
                              onChange={e => handleFieldChange(p.id, 'leadTime', e.target.value)}
                              className="w-full bg-slate-50/50 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                              placeholder="e.g. 3"
                            />
                          </div>

                          {/* Tax % */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400">Tax %</label>
                            <input 
                              type="number" 
                              value={itemData.taxPercent} 
                              onChange={e => handleFieldChange(p.id, 'taxPercent', e.target.value)}
                              className="w-full bg-slate-50/50 rounded-xl px-3 py-1.5 text-xs font-bold border border-slate-100 focus:bg-white focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all"
                              placeholder="0%"
                            />
                          </div>

                          {/* Last Purchase Rate */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">Last Pur. Rate</label>
                            <div className="bg-slate-50 rounded-xl px-3 py-2 text-xs font-black text-slate-500 border border-slate-100 flex items-center justify-between">
                              <span>₹{parseFloat(itemData.lastPurchaseRate) || '—'}</span>
                              <ArrowUpRight size={12} className="text-gray-300" />
                            </div>
                          </div>

                          {/* Preferred Vendor Switch */}
                          <div className="space-y-1 flex flex-col justify-end pb-1 items-start md:items-center">
                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 select-none cursor-pointer" onClick={() => handleTogglePreferred(p.id)}>
                              Preferred Supplier
                            </label>
                            <button
                              type="button"
                              onClick={() => handleTogglePreferred(p.id)}
                              className="focus:outline-none transition-all active:scale-95 mt-1"
                            >
                              {itemData.isPreferred ? (
                                <ToggleRight size={26} className="text-amber-500 cursor-pointer" />
                              ) : (
                                <ToggleLeft size={26} className="text-gray-300 cursor-pointer" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Save Button Container */}
            {can('PROCUREMENT', 'UPDATE', 'MAPPING') && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                <div className="flex justify-center pointer-events-auto">
                  <button 
                    onClick={saveMappings} 
                    disabled={saving}
                    className="flex items-center gap-3 bg-emerald-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_20px_50px_rgba(5,150,105,0.25)] hover:bg-emerald-700 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {saving ? 'Saving...' : 'Save Mapping Changes'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Historical Purchase Rate Logs Modal */}
      {historyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setHistoryModal(null)}>
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-50 pb-3">
              <div>
                <h3 className="text-sm font-black text-gray-950 uppercase tracking-tight">Price History Log</h3>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Historical Purchase Rate Tracking</p>
              </div>
              <button onClick={() => setHistoryModal(null)} className="p-1 hover:bg-gray-50 rounded-xl text-gray-400 hover:text-rose-500 transition-all"><X size={18} /></button>
            </div>

            <div className="space-y-4 py-2">
              {historyModal.priceHistory?.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <Clock size={28} className="mx-auto text-gray-200" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No price history logged yet</p>
                </div>
              ) : (
                <div className="relative border-l border-emerald-100 pl-5 ml-2.5 space-y-5">
                  {historyModal.priceHistory.map((log, idx) => (
                    <div key={log.id} className="relative group">
                      {/* Timeline dot */}
                      <span className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-emerald-500 bg-white group-hover:scale-125 transition-transform" />
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-950 uppercase tracking-wide">
                            Price Changed
                          </span>
                          <span className="text-[8px] font-bold text-gray-400 flex items-center gap-1">
                            <Calendar size={10} /> {new Date(log.changedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        
                        <div className="bg-slate-50 border border-slate-100/50 p-2.5 rounded-xl flex items-center justify-between text-xs font-bold">
                          <div className="flex flex-col">
                            <span className="text-[7.5px] font-black text-gray-400 uppercase tracking-wider">Before</span>
                            <span className="text-gray-500 line-through">₹{log.oldPrice}</span>
                          </div>
                          <ChevronRight size={14} className="text-gray-300" />
                          <div className="flex flex-col items-end">
                            <span className="text-[7.5px] font-black text-emerald-600 uppercase tracking-wider">New Rate</span>
                            <span className="text-emerald-700 font-black">₹{log.newPrice}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingSection;
