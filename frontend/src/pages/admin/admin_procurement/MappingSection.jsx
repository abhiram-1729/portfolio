import React, { useState, useEffect } from 'react';
import { 
  Search, Link2, CheckCircle2, ChevronRight, Package, Loader2
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import toast from 'react-hot-toast';

const MappingSection = ({ can, setHideMainHeader }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [mappedIds, setMappedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vSearch, setVSearch] = useState('');
  const [pSearch, setPSearch] = useState('');

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
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const selectVendor = async (v) => {
    setSelectedVendor(v);
    try {
      const { data } = await procurementAPI.getVendorMappings(v.id);
      setMappedIds(new Set(data.map(m => m.productId)));
    } catch { toast.error('Failed to load mappings'); }
  };

  const toggleProduct = (pid) => {
    setMappedIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const saveMappings = async () => {
    if (!selectedVendor) return;
    setSaving(true);
    try {
      await procurementAPI.updateVendorMappings(selectedVendor.id, { productIds: [...mappedIds] });
      toast.success('Mappings saved');
    } catch { toast.error('Failed to save mappings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      {!selectedVendor ? (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 animate-in slide-in-from-left duration-300">
          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col flex-1">
            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-1">Procurement Management</h4>
                <h2 className="text-xl font-black text-gray-900 tracking-tight">Select Vendor to Map Items</h2>
              </div>
              <div className="relative group w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  placeholder="Search vendor by name or mobile..." 
                  className="w-full bg-white border border-gray-100 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                  value={vSearch}
                  onChange={e => setVSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="flex flex-col gap-2 w-full">
                {vendors.filter(v => 
                  v.vendorName.toLowerCase().includes(vSearch.toLowerCase()) || 
                  v.mobile.includes(vSearch)
                ).map(v => (
                  <button 
                    key={v.id} 
                    onClick={() => selectVendor(v)}
                    className="group bg-white py-2.5 px-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all text-left flex items-center justify-between w-full"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                        <Link2 size={20} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition-colors">{v.vendorName}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">{v.mobile}</span>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
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
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div className="flex flex-col">
                  <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">
                    Items for opening vendors
                  </h4>
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">{selectedVendor.vendorName}</h2>
                </div>
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

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-white pb-24">
              <div className="flex flex-col gap-1.5 w-full">
                {products.filter(p => p.name.toLowerCase().includes(pSearch.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => toggleProduct(p.id)}
                    className={`flex items-center justify-between py-2 px-4 rounded-lg border transition-all text-left group w-full ${
                      mappedIds.has(p.id)
                        ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-500/10'
                        : 'border-gray-50 hover:border-emerald-100 hover:bg-gray-50/30'
                    }`}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-7 h-7 rounded-md flex items-center justify-center transition-all shrink-0 ${
                        mappedIds.has(p.id) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-gray-100 text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600'
                      }`}>
                        {mappedIds.has(p.id) ? <CheckCircle2 size={14} /> : <Package size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-[13px] font-bold text-gray-900 truncate block">{p.name}</span>
                        <span className="text-[9px] text-gray-400 leading-none">ID: {p.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-5">
                      <div className="flex flex-col items-end">
                        <span className="text-[13px] font-black text-emerald-600">₹{p.purchasePrice || p.price}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                        mappedIds.has(p.id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-gray-200 group-hover:border-emerald-500'
                      }`}>
                        {mappedIds.has(p.id) && <CheckCircle2 size={8} strokeWidth={4} />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Sticky Save Button Container */}
            {can('PROCUREMENT', 'UPDATE', 'MAPPING') && (
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
                <div className="flex justify-center pointer-events-auto">
                  <button 
                    onClick={saveMappings} 
                    disabled={saving}
                    className="flex items-center gap-3 bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-[0_20px_50px_rgba(5,150,105,0.3)] hover:bg-emerald-700 hover:-translate-y-1 transition-all active:translate-y-0 disabled:opacity-50"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {saving ? 'Saving...' : 'Save Mappings'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MappingSection;
