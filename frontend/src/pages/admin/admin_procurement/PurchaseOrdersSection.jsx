import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Loader2, ClipboardList, X, ArrowLeft, Edit3, Trash2, CheckCircle2
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
  const [itemSearch, setItemSearch] = useState('');
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
        skuCode: m.product.skuCode || 'NO-SKU',
        category: m.product.category?.name || 'UNCATEGORIZED',
        weight: m.product.unitValue ? `${m.product.unitValue}${m.product.unit?.name || ''}` : '',
        purchasePrice: m.product.purchasePrice || m.product.price || 0,
        quantity: 0,
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

  const handleEdit = async (po) => {
    try {
      const { data: v } = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(v);
      const { data: m } = await procurementAPI.getVendorMappings(po.vendorId);
      setMappedItems(m.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        skuCode: item.product.skuCode || 'NO-SKU',
        category: item.product.category?.name || 'UNCATEGORIZED',
        weight: item.product.unitValue ? `${item.product.unitValue}${item.product.unit?.name || ''}` : '',
        purchasePrice: item.product.purchasePrice || item.product.price || 0
      })));
      setForm({
        id: po.id,
        vendorId: po.vendorId,
        poDate: format(new Date(po.poDate), 'yyyy-MM-dd'),
        expectedDelivery: po.expectedDelivery ? format(new Date(po.expectedDelivery), 'yyyy-MM-dd') : '',
        remarks: po.remarks || '',
        items: po.items.map(i => ({ productId: i.productId, quantity: i.quantity, rate: i.rate }))
      });
      setShowForm(true);
    } catch { toast.error('Failed to load data for editing'); }
  };

  const handleDeletePO = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Purchase Order?')) return;
    try {
      await procurementAPI.deletePurchaseOrder(id);
      toast.success('Purchase Order deleted');
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting PO');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || form.items.length === 0) {
      return toast.error('Select a vendor and at least one item');
    }
    try {
      const payload = {
        vendorId: form.vendorId,
        poDate: form.poDate,
        expectedDelivery: form.expectedDelivery || null,
        remarks: form.remarks,
        items: form.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), rate: parseFloat(i.rate) }))
      };
      
      if (form.id) {
        await procurementAPI.updatePurchaseOrder(form.id, payload);
        toast.success('Purchase Order updated');
      } else {
        await procurementAPI.createPurchaseOrder(payload);
        toast.success('Purchase Order created');
      }
      
      setShowForm(false);
      setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [] });
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving PO');
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
    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
      {!showForm ? (
        <>
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
            {can('PROCUREMENT', 'CREATE', 'PO') && (
              <button onClick={() => { setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [] }); openForm(); }}
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
            <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col min-h-0">
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-emerald-50/50 border-b border-gray-50">
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">PO Number</th>
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest">PO ID</th>
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Vendor</th>
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Date</th>
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Total Amount</th>
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                    <th className="py-3 px-6 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pos.filter(po => 
                    !search || 
                    po.poNumber.toString().includes(search) || 
                    po.vendor?.vendorName.toLowerCase().includes(search.toLowerCase()) ||
                    po.displayId?.toLowerCase().includes(search.toLowerCase())
                  ).map(po => (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="py-3 px-6 whitespace-nowrap">
                        <span className="text-sm font-black text-gray-900">PO #{po.poNumber}</span>
                      </td>
                      <td className="py-3 px-6 whitespace-nowrap">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-widest border border-gray-100">
                          {po.displayId || `PO-${po.id.slice(-6).toUpperCase()}`}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-center whitespace-nowrap">
                        <span className="text-xs font-bold text-gray-700">{po.vendor?.vendorName}</span>
                      </td>
                      <td className="py-3 px-6 text-center whitespace-nowrap">
                        <span className="text-xs font-bold text-gray-600">{format(new Date(po.poDate), 'dd MMM yyyy')}</span>
                      </td>
                      <td className="py-3 px-6 text-center whitespace-nowrap">
                        <span className="text-sm font-black text-gray-900">₹{po.totalAmount.toLocaleString()}</span>
                      </td>
                      <td className="py-3 px-6 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center">
                          <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${statusColors[po.status] || ''}`}>
                            {po.status}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <div className="flex gap-1">
                            {!['CLOSED', 'CANCELLED', 'DELIVERED'].includes(po.status) && can('PROCUREMENT', 'UPDATE', 'PO') && (
                              <button onClick={() => handleEdit(po)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 border border-gray-100 transition-all shadow-sm" title="Edit">
                                <Edit3 size={14} strokeWidth={2.5} />
                              </button>
                            )}
                            {can('PROCUREMENT', 'DELETE', 'PO') && po.status !== 'CLOSED' && (
                              <button onClick={() => handleDeletePO(po.id)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-rose-50 hover:text-rose-600 border border-gray-100 transition-all shadow-sm" title="Delete">
                                <Trash2 size={14} strokeWidth={2.5} />
                              </button>
                            )}
                          </div>
                          
                          {can('PROCUREMENT', 'UPDATE', 'PO') && !['CLOSED', 'CANCELLED'].includes(po.status) && (
                            <div className="flex gap-1 pl-2 border-l border-gray-100">
                              {po.status === 'CREATED' && (
                                <button onClick={() => updateStatus(po.id, 'APPROVED')} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all" title="Approve">
                                  <Loader2 className="animate-spin" size={12} />
                                </button>
                              )}
                              {po.status === 'APPROVED' && (
                                <button onClick={() => updateStatus(po.id, 'ORDERED')} className="p-1.5 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all" title="Mark Ordered">
                                  <ClipboardList size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl shadow-emerald-500/5 overflow-hidden flex flex-col flex-1 min-h-0 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
          {/* Internal Navigation Header */}
          <div className="px-8 py-4 border-b border-gray-50 flex items-center gap-4 bg-white shrink-0">
            <button type="button" onClick={() => setShowForm(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-90 border border-gray-100">
              <ArrowLeft size={16} strokeWidth={3} />
            </button>
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">
              {form.id ? 'Refining Purchase Order' : 'Initiating New Order'}
            </span>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto px-8 py-6 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Target Vendor *</label>
                  <select value={form.vendorId} onChange={e => onVendorSelect(e.target.value)}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" required>
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Creation Date *</label>
                  <input type="date" value={form.poDate} onChange={e => setForm({...form, poDate: e.target.value})}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Expected Delivery *</label>
                  <input type="date" value={form.expectedDelivery} onChange={e => setForm({...form, expectedDelivery: e.target.value})}
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" required />
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="text-emerald-600" size={20} />
                    <h4 className="text-lg font-black text-gray-900 uppercase tracking-tight">Order Components</h4>
                  </div>
                  <div className="relative w-72 group">
                    <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
                    <input 
                      placeholder="FILTER ITEMS BY NAME OR SKU..."
                      value={itemSearch}
                      onChange={e => setItemSearch(e.target.value)}
                      className="w-full bg-gray-50 border border-transparent rounded-2xl pl-10 pr-5 py-3 text-[10px] font-black uppercase focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 outline-none transition-all placeholder:text-gray-300"
                    />
                  </div>
                </div>

                {/* Grouped Items List */}
                <div className="space-y-8">
                  {Object.entries(
                    mappedItems
                      .filter(item => 
                        !itemSearch || 
                        item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                        item.skuCode.toLowerCase().includes(itemSearch.toLowerCase())
                      )
                      .reduce((acc, item) => {
                        if (!acc[item.category]) acc[item.category] = [];
                        acc[item.category].push(item);
                        return acc;
                      }, {})
                  ).map(([category, items]) => {
                    const categoryItems = items.filter(i => 
                      form.items.find(fi => fi.productId === i.productId)
                    );
                    const catQty = categoryItems.reduce((s, i) => s + (parseInt(form.items.find(fi => fi.productId === i.productId)?.quantity || 0)), 0);
                    const catTotal = categoryItems.reduce((s, i) => {
                      const fi = form.items.find(f => f.productId === i.productId);
                      return s + (parseFloat(fi?.quantity || 0) * parseFloat(fi?.rate || 0));
                    }, 0);

                    return (
                      <div key={category} className="bg-white rounded-[2rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-emerald-50/50 px-8 py-4 flex items-center justify-between border-b border-emerald-100/30">
                          <div className="flex items-center gap-4">
                            <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center">
                              <CheckCircle2 size={12} className="text-white" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-900">{category}</span>
                          </div>
                          <div className="flex items-center gap-10">
                            <div className="text-right">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">CATEGORY QTY</p>
                              <p className="text-xs font-black text-gray-700">{catQty} UNITS</p>
                            </div>
                            <div className="text-right border-l border-emerald-100/50 pl-8">
                              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">CATEGORY TOTAL</p>
                              <p className="text-sm font-black text-emerald-600">₹{catTotal.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-50/50 bg-gray-50/30">
                                <th className="px-8 py-4 text-left text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Procurement Item</th>
                                <th className="px-8 py-4 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Purchase Rate</th>
                                <th className="px-8 py-4 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Inventory Qty</th>
                                <th className="px-8 py-4 text-right text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Valuation</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50/50">
                              {items.map(item => {
                                const inForm = form.items.find(i => i.productId === item.productId);
                                return (
                                  <tr key={item.productId} className={`transition-all duration-300 ${inForm ? 'bg-emerald-50/5' : 'bg-transparent hover:bg-gray-50/30'}`}>
                                    <td className="px-8 py-6">
                                      <div className="flex items-center gap-6">
                                        <div className="relative group/cb">
                                          <input 
                                            type="checkbox" 
                                            checked={!!inForm} 
                                            onChange={() => toggleItem(item.productId)}
                                            className="w-5 h-5 rounded-lg border-gray-200 text-emerald-600 focus:ring-emerald-500/20 transition-all cursor-pointer shadow-sm" 
                                          />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-3">
                                            <span className="text-sm font-black text-gray-900 tracking-tight">{item.name}</span>
                                            {item.weight && <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-widest">{item.weight}</span>}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">ID: {item.skuCode}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                      <div className={`inline-flex items-center px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all ${inForm ? 'ring-2 ring-emerald-500/10 border-emerald-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                        <span className="text-[10px] font-black text-gray-400 mr-2">₹</span>
                                        <input 
                                          type="number" 
                                          value={inForm ? inForm.rate : item.purchasePrice} 
                                          onChange={e => updateItemField(item.productId, 'rate', e.target.value)}
                                          disabled={!inForm}
                                          className="bg-transparent border-none p-0 text-sm font-black text-gray-700 w-16 text-center focus:ring-0 focus:outline-none"
                                        />
                                      </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                      <div className={`inline-flex items-center gap-4 px-3 py-1.5 bg-white border border-gray-100 rounded-2xl shadow-sm transition-all ${inForm ? 'ring-2 ring-emerald-500/10 border-emerald-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                        <button 
                                          type="button" 
                                          onClick={() => updateItemField(item.productId, 'quantity', Math.max(1, (parseInt(inForm?.quantity || 1) - 1)))}
                                          disabled={!inForm}
                                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all active:scale-90"
                                        >
                                          <span className="text-xl font-light">-</span>
                                        </button>
                                        <input 
                                          type="number" 
                                          value={inForm ? inForm.quantity : 0} 
                                          onChange={e => updateItemField(item.productId, 'quantity', e.target.value)}
                                          disabled={!inForm}
                                          className="bg-transparent border-none p-0 text-sm font-black text-gray-700 w-10 text-center focus:ring-0 focus:outline-none"
                                        />
                                        <button 
                                          type="button" 
                                          onClick={() => updateItemField(item.productId, 'quantity', (parseInt(inForm?.quantity || 0) + 1))}
                                          disabled={!inForm}
                                          className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-all active:scale-90"
                                        >
                                          <span className="text-xl font-light">+</span>
                                        </button>
                                      </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                      <span className="text-base font-black text-gray-900 tracking-tighter">
                                        ₹{((parseFloat(inForm?.quantity || 0)) * (parseFloat(inForm?.rate || 0))).toLocaleString()}
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Additional Order Remarks
                </label>
                <textarea rows={4} value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                  placeholder="ENTER ANY SPECIAL INSTRUCTIONS OR LOGISTICS REMARKS FOR THIS ORDER..."
                  className="w-full bg-gray-50 rounded-[2rem] px-8 py-6 text-sm font-bold border border-gray-100 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 focus:outline-none transition-all resize-none shadow-inner placeholder:text-gray-300 uppercase" />
              </div>
            </div>

            {/* Floating Action Footer - Permanently Docked */}
            {/* Compact Professional Footer */}
            <div className="bg-white/95 backdrop-blur-xl border-t border-emerald-100/40 px-10 py-4 flex items-center justify-between shadow-[0_-20px_50px_-20px_rgba(0,0,0,0.15)] z-50 shrink-0">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">Order Valuation</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-black text-emerald-600/60">₹</span>
                  <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none">{poTotal.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="h-11 px-8 bg-white text-gray-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 border-2 border-gray-100 transition-all active:scale-95 shadow-sm flex items-center justify-center"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  className="h-11 px-10 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  Authorize Update
                  <ArrowLeft className="rotate-180" size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersSection;
