import React, { useState, useEffect } from 'react';
import { 
  Search, Link2, CheckCircle2, ChevronRight, Package, Loader2
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import toast from 'react-hot-toast';

const MappingSection = ({ can }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [mappedIds, setMappedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vSearch, setVSearch] = useState('');
  const [pSearch, setPSearch] = useState('');

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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendor List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 bg-gray-50/50">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-3">Select Vendor</h4>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search vendor..." 
                className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                value={vSearch}
                onChange={e => setVSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="max-h-[60vh] overflow-y-auto custom-scrollbar">
            {vendors.filter(v => 
              v.vendorName.toLowerCase().includes(vSearch.toLowerCase()) || 
              v.mobile.includes(vSearch)
            ).map(v => (
              <button key={v.id} onClick={() => selectVendor(v)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-center justify-between transition-all ${
                  selectedVendor?.id === v.id ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : 'hover:bg-gray-50'
                }`}>
                <div>
                  <span className="text-sm font-bold text-gray-900">{v.vendorName}</span>
                  <p className="text-[10px] text-gray-400">{v.mobile}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Mapping */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
            <div className="flex flex-col gap-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                {selectedVendor ? `Items for ${selectedVendor.vendorName}` : 'Mapping Registry'}
              </h4>
              {selectedVendor && (
                <div className="relative group mt-2 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={12} />
                  <input 
                    type="text" 
                    placeholder="Filter products..." 
                    className="w-full bg-white border border-gray-100 rounded-lg pl-8 pr-3 py-1.5 text-[11px] font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                    value={pSearch}
                    onChange={e => setPSearch(e.target.value)}
                  />
                </div>
              )}
            </div>
            {selectedVendor && can('PROCUREMENT', 'UPDATE') && (
              <button onClick={saveMappings} disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:translate-y-0 disabled:opacity-50">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />} Save Changes
              </button>
            )}
          </div>
          {selectedVendor ? (
            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pb-12">
                {products.filter(p => p.name.toLowerCase().includes(pSearch.toLowerCase())).map(p => (
                  <button key={p.id} onClick={() => toggleProduct(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      mappedIds.has(p.id)
                        ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mappedIds.has(p.id) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {mappedIds.has(p.id) ? <CheckCircle2 size={16} /> : <Package size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-900 truncate block">{p.name}</span>
                      <span className="text-[10px] text-gray-400">₹{p.purchasePrice || p.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-gray-300">
              <Link2 size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-bold text-sm">Select a vendor to manage item mappings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MappingSection;
