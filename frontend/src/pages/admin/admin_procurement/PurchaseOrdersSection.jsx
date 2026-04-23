import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Loader2, ClipboardList, X, ArrowLeft
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PurchaseOrdersSection = ({ can }) => {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [mappedItems, setMappedItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'),
    expectedDelivery: '', remarks: '', items: []
  });

  const loadPOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procurementAPI.getPurchaseOrders({ status: statusFilter || undefined });
      setPOs(data);
    } catch { toast.error('Failed to load POs'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadPOs(); }, [loadPOs]);

  const openForm = async () => {
    try {
      const { data } = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(data);
      setShowForm(true);
    } catch { toast.error('Failed to load vendors'); }
  };

  const onVendorSelect = async (vendorId) => {
    setForm(f => ({ ...f, vendorId, items: [] }));
    if (!vendorId) { setMappedItems([]); return; }
    try {
      const { data } = await procurementAPI.getVendorMappings(vendorId);
      setMappedItems(data.map(m => ({
        productId: m.product.id,
        name: m.product.name,
        purchasePrice: m.product.purchasePrice || m.product.price || 0,
        quantity: '',
        rate: m.product.purchasePrice || m.product.price || 0
      })));
    } catch { toast.error('Failed to load mapped items'); }
  };

  const toggleItem = (productId) => {
    setForm(f => {
      const exists = f.items.find(i => i.productId === productId);
      if (exists) return { ...f, items: f.items.filter(i => i.productId !== productId) };
      const item = mappedItems.find(m => m.productId === productId);
      return { ...f, items: [...f.items, { productId, quantity: 1, rate: item?.purchasePrice || 0 }] };
    });
  };

  const updateItemField = (productId, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map(i => i.productId === productId ? { ...i, [field]: value } : i)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || form.items.length === 0) {
      return toast.error('Select a vendor and at least one item');
    }
    try {
      await procurementAPI.createPurchaseOrder({
        vendorId: form.vendorId,
        poDate: form.poDate,
        expectedDelivery: form.expectedDelivery || null,
        remarks: form.remarks,
        items: form.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), rate: parseFloat(i.rate) }))
      });
      toast.success('Purchase Order created');
      setShowForm(false);
      setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [] });
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating PO');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await procurementAPI.updatePOStatus(id, { status });
      toast.success(`PO status updated to ${status}`);
      loadPOs();
    } catch { toast.error('Failed to update status'); }
  };

  const poTotal = form.items.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.rate || 0)), 0);
  const statusColors = {
    CREATED: 'bg-blue-50 text-blue-600 border-blue-100',
    APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    ORDERED: 'bg-purple-50 text-purple-600 border-purple-100',
    DELIVERED: 'bg-orange-50 text-orange-600 border-orange-100',
    CLOSED: 'bg-gray-100 text-gray-500',
    CANCELLED: 'bg-red-50 text-red-600 border-red-100'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-sm flex-1 md:max-w-xs focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
            <Search size={14} className="text-gray-400" />
            <input 
              placeholder="Search PO # or Vendor..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs font-black text-gray-700 w-full placeholder:text-gray-300" 
            />
          </div>
          <div className="flex gap-1">
            {['', 'CREATED', 'APPROVED', 'ORDERED', 'DELIVERED', 'CLOSED'].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === s ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-200 shadow-sm'
                }`}>{s || 'All'}</button>
            ))}
          </div>
        </div>
        {can('PROCUREMENT', 'CREATE') && (
          <button onClick={openForm}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 hover:-translate-y-0.5 transition-all shadow-xl shadow-emerald-600/20 active:translate-y-0">
            <Plus size={14} strokeWidth={3} /> Create Purchase Order
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : pos.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <ClipboardList size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-black text-gray-300">No Purchase Orders</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {pos.filter(po => 
            !search || 
            po.poNumber.toString().includes(search) || 
            po.vendor?.vendorName.toLowerCase().includes(search.toLowerCase()) ||
            po.displayId?.toLowerCase().includes(search.toLowerCase())
          ).map(po => (
            <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4 hover:border-emerald-100 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">PO #{po.poNumber}</span>
                    {po.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">{po.displayId}</span>}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${statusColors[po.status] || ''}`}>{po.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold mt-0.5">{po.vendor?.vendorName} • {format(new Date(po.poDate), 'dd MMM yyyy')}</p>
                </div>
                <span className="text-base font-black text-gray-900">₹{po.totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {po.items?.slice(0, 3).map(item => (
                  <span key={item.id} className="text-[9px] font-bold bg-gray-50 text-gray-600 px-2 py-1 rounded-lg">
                    {item.product?.name} × {item.quantity}
                  </span>
                ))}
                {po.items?.length > 3 && <span className="text-[9px] font-bold text-gray-400">+{po.items.length - 3} more</span>}
              </div>
              {/* Status Actions */}
              <div className="flex gap-1.5 pt-1">
                {po.status === 'CREATED' && can('PROCUREMENT', 'UPDATE') && (
                  <>
                    <button onClick={() => updateStatus(po.id, 'APPROVED')} className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-emerald-100">Approve</button>
                    <button onClick={() => updateStatus(po.id, 'CANCELLED')} className="text-[9px] font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-red-100">Cancel</button>
                  </>
                )}
                {po.status === 'APPROVED' && can('PROCUREMENT', 'UPDATE') && (
                  <button onClick={() => updateStatus(po.id, 'ORDERED')} className="text-[9px] font-black bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-purple-100">Mark Ordered</button>
                )}
                {po.status === 'DELIVERED' && can('PROCUREMENT', 'UPDATE') && (
                  <button onClick={() => updateStatus(po.id, 'CLOSED')} className="text-[9px] font-black bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-gray-200">Close PO</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PO Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">New Purchase Order</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Vendor Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>
                <select value={form.vendorId} onChange={e => onVendorSelect(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" required>
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">PO Date</label>
                  <input type="date" value={form.poDate} onChange={e => setForm({...form, poDate: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Expected Delivery</label>
                  <input type="date" value={form.expectedDelivery} onChange={e => setForm({...form, expectedDelivery: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
              {/* Mapped Items Selection */}
              {form.vendorId && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Select Items</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {mappedItems.map(m => (
                      <button key={m.productId} type="button" onClick={() => toggleItem(m.productId)}
                        className={`p-2 rounded-xl text-left text-xs font-bold border transition-all ${
                          form.items.find(i => i.productId === m.productId)
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'border-gray-100 text-gray-600 hover:border-gray-200'
                        }`}>
                        {m.name} <span className="text-gray-400">₹{m.purchasePrice}</span>
                      </button>
                    ))}
                    {mappedItems.length === 0 && <p className="col-span-2 text-center text-xs text-gray-400 py-4">No items mapped to this vendor</p>}
                  </div>
                </div>
              )}
              {/* Selected Items Qty/Rate */}
              {form.items.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Quantities & Rates</label>
                  {form.items.map(item => {
                    const mi = mappedItems.find(m => m.productId === item.productId);
                    return (
                      <div key={item.productId} className="flex items-center gap-2 bg-gray-50 p-2 rounded-xl">
                        <span className="text-xs font-bold text-gray-700 flex-1 truncate">{mi?.name}</span>
                        <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItemField(item.productId, 'quantity', e.target.value)}
                          className="w-20 bg-white rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center" />
                        <input type="number" placeholder="Rate" value={item.rate} onChange={e => updateItemField(item.productId, 'rate', e.target.value)}
                          className="w-24 bg-white rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center" />
                        <span className="text-xs font-black text-gray-900 w-20 text-right">₹{((parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0)).toLocaleString()}</span>
                      </div>
                    );
                  })}
                  <div className="text-right text-sm font-black text-emerald-600 pr-2">Total: ₹{poTotal.toLocaleString()}</div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Remarks</label>
                <input value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                Create Purchase Order
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersSection;
