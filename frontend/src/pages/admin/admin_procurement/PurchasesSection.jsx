import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Loader2, X, Package, Edit3, Trash2
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PurchasesSection = ({ can }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    vendorId: '', poId: '', invoiceNumber: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    transportCharges: '0', otherCharges: '0', items: []
  });
  const [showQuickVendor, setShowQuickVendor] = useState(false);
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [showItemResults, setShowItemResults] = useState(false);
  const [quickVendorForm, setQuickVendorForm] = useState({
    vendorName: '', mobile: '', email: '', address: '',
    gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0'
  });
  const [quickProductForm, setQuickProductForm] = useState({ name: '', price: '', categoryId: 'default', unitId: '' });
  const [categories, setCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getPurchases();
        setPurchases(data);
      } catch { toast.error('Failed to load purchases'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const openForm = async () => {
    try {
      const [v, p, c, u] = await Promise.all([
        procurementAPI.getVendors({ status: 'ACTIVE' }),
        adminAPI.getItems(),
        adminAPI.getCategories(),
        adminAPI.getUnits()
      ]);
      setVendors(v.data);
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setCategories(c.data || []);
      setUnits(u.data || []);
      setShowForm(true);
    } catch { toast.error('Failed to load data'); }
  };

  const handleQuickVendor = async (e) => {
    e.preventDefault();
    try {
      const { data } = await procurementAPI.createVendor(quickVendorForm);
      toast.success('Vendor added');
      const v = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(v.data);
      setForm(prev => ({ ...prev, vendorId: data.id }));
      setShowQuickVendor(false);
      setQuickVendorForm({ vendorName: '', mobile: '', email: '', address: '', gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
    } catch (err) { toast.error(err.response?.data?.message || 'Error adding vendor'); }
  };

  const handleQuickProduct = async (e) => {
    e.preventDefault();
    try {
      await adminAPI.createItem({ ...quickProductForm, status: 'ACTIVE' });
      toast.success('Product added');
      const p = await adminAPI.getItems();
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setShowQuickProduct(false);
    } catch (err) { toast.error(err.response?.data?.message || 'Error adding product'); }
  };

  const addItem = () => {
    setForm(f => ({ ...f, items: [...f.items, { productId: '', quantity: '1', price: '0' }] }));
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === idx ? { ...item, [field]: value } : item)
    }));
  };

  const handleEdit = (p) => {
    setForm({
      id: p.id,
      vendorId: p.vendorId,
      invoiceNumber: p.invoiceNumber,
      invoiceDate: format(new Date(p.invoiceDate), 'yyyy-MM-dd'),
      transportCharges: String(p.transportCharges),
      otherCharges: String(p.otherCharges),
      remarks: p.remarks || '',
      items: p.items.map(i => ({ productId: i.productId, quantity: String(i.quantity), price: String(i.price) }))
    });
    openForm();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase invoice? This will revert stock and vendor balance.')) return;
    try {
      await procurementAPI.deletePurchase(id);
      toast.success('Purchase invoice deleted');
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting purchase');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.invoiceNumber || form.items.length === 0) {
      return toast.error('Fill all required fields');
    }
    if (form.items.some(i => !i.productId || !i.quantity || i.quantity <= 0)) {
      return toast.error('Please select a product and valid quantity for all items');
    }
    try {
      const payload = {
        ...form,
        items: form.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), price: parseFloat(i.price) }))
      };

      if (form.id) {
        await procurementAPI.updatePurchase(form.id, payload);
        toast.success('Purchase invoice updated');
      } else {
        await procurementAPI.createPurchase(payload);
        toast.success('Purchase invoice created');
      }

      setShowForm(false);
      setForm({ vendorId: '', poId: '', invoiceNumber: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'), transportCharges: '0', otherCharges: '0', items: [] });
      // Reload
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving purchase');
    }
  };

  const invoiceStatusColors = {
    DRAFT: 'bg-gray-100 text-gray-500',
    CONFIRMED: 'bg-blue-50 text-blue-600 border-blue-100',
    PAID: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    PARTIAL_PAID: 'bg-orange-50 text-orange-600 border-orange-100'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white/50 p-3 rounded-[2rem] border border-gray-100">
        <div className="relative group flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
          <input 
            placeholder="Search invoice or vendor..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300" 
          />
        </div>
        {can('PROCUREMENT', 'CREATE', 'PURCHASES') && (
          <button onClick={() => { setForm({ vendorId: '', poId: '', invoiceNumber: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'), transportCharges: '0', otherCharges: '0', items: [] }); openForm(); }}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0">
            <Plus size={14} strokeWidth={3} /> New Purchase
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : purchases.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <Receipt size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-black text-gray-300">No Purchases Yet</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {purchases.filter(p => 
            !search || 
            p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
            p.vendor?.vendorName.toLowerCase().includes(search.toLowerCase())
          ).map(p => (
            <div key={p.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 space-y-4 hover:border-emerald-100 transition-all group animate-in fade-in slide-in-from-bottom-2 duration-300 relative">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">#{p.invoiceNumber}</span>
                    {p.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">{p.displayId}</span>}
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${invoiceStatusColors[p.status] || ''}`}>{p.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{p.vendor?.vendorName} • {format(new Date(p.invoiceDate), 'dd MMM yyyy')}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="text-right">
                    <span className="text-base font-black text-gray-900">₹{p.totalAmount.toLocaleString()}</span>
                    {p.paidAmount > 0 && p.paidAmount < p.totalAmount && (
                      <p className="text-[10px] text-emerald-600 font-bold">Paid: ₹{p.paidAmount.toLocaleString()}</p>
                    )}
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {can('PROCUREMENT', 'UPDATE', 'PURCHASES') && (
                      <button onClick={() => handleEdit(p)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100" title="Edit"><Edit3 size={12} /></button>
                    )}
                    {can('PROCUREMENT', 'DELETE', 'PURCHASES') && (
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100" title="Delete"><Trash2 size={12} /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Purchase Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">New Purchase Invoice</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>
                    <button type="button" onClick={() => setShowQuickVendor(true)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-100"><Plus size={10} /> Add New</button>
                  </div>
                  <select value={form.vendorId} onChange={e => setForm({...form, vendorId: e.target.value})} required
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="">Select Vendor</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Invoice # *</label>
                  <input required value={form.invoiceNumber} onChange={e => setForm({...form, invoiceNumber: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Invoice Date</label>
                  <input type="date" value={form.invoiceDate} onChange={e => setForm({...form, invoiceDate: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Transport ₹</label>
                  <input type="number" value={form.transportCharges} onChange={e => setForm({...form, transportCharges: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Other ₹</label>
                  <input type="number" value={form.otherCharges} onChange={e => setForm({...form, otherCharges: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
              {/* Items */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 pl-1">Line Items</label>
                    <div className="relative mt-2 min-w-[280px] group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
                      <input 
                        type="text"
                        placeholder="Search & add product..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
                        value={itemSearch}
                        onChange={e => { setItemSearch(e.target.value); setShowItemResults(true); }}
                        onFocus={() => setShowItemResults(true)}
                      />
                      {showItemResults && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase()) || p.skuCode?.includes(itemSearch)).slice(0, 10).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setForm(prev => ({
                                  ...prev,
                                  items: [...prev.items, { productId: p.id, quantity: 1, price: String(p.purchasePrice || p.price || 0) }]
                                }));
                                setItemSearch('');
                                setShowItemResults(false);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 last:border-0 flex items-center justify-between group transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-900 group-hover:text-emerald-700">{p.name}</span>
                                <span className="text-[10px] text-gray-400">{p.skuCode || 'No SKU'}</span>
                              </div>
                              <div className="flex flex-col items-end">
                                <span className="text-xs font-black text-emerald-600">₹{p.purchasePrice || p.price}</span>
                                <Plus size={12} className="text-emerald-400 mt-1" />
                              </div>
                            </button>
                          ))}
                          {products.filter(p => p.name.toLowerCase().includes(itemSearch.toLowerCase())).length === 0 && (
                            <div className="p-4 text-center text-gray-400 text-[10px] font-bold">No products found</div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 self-end">
                    <button type="button" onClick={() => setShowQuickProduct(true)} className="text-[10px] font-black text-blue-600 flex items-center gap-1.5 bg-blue-50/50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all active:scale-95">
                      <Plus size={12} strokeWidth={3} /> New Product
                    </button>
                    <button type="button" onClick={addItem} className="text-[10px] font-black text-emerald-600 flex items-center gap-1.5 bg-emerald-50/50 px-3 py-2 rounded-xl hover:bg-emerald-100 transition-all active:scale-95">
                      <Plus size={12} strokeWidth={3} /> Add Blank Row
                    </button>
                  </div>
                </div>
              <div className="space-y-3" onClick={() => setShowItemResults(false)}>
                {form.items.length === 0 ? (
                  <div className="py-8 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <Package className="mx-auto text-gray-300 mb-2 opacity-50" size={32} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No items added yet</p>
                  </div>
                ) : (
                  form.items.map((item, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2 bg-gray-50/30 p-3 rounded-2xl border border-gray-100 group relative hover:border-emerald-200 transition-all animate-in slide-in-from-left-2 duration-300">
                    <div className="flex-1 min-w-0">
                      <select value={item.productId} onChange={e => {
                        const prod = products.find(p => p.id === e.target.value);
                        updateItem(idx, 'productId', e.target.value);
                        if (prod) updateItem(idx, 'price', String(prod.purchasePrice || prod.price || 0));
                      }} className="w-full bg-white rounded-xl px-3 py-2 text-xs font-bold border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all appearance-none">
                        <option value="">Select Item</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute -top-4 left-1 text-[8px] font-bold text-gray-400 sm:hidden">QTY</span>
                        <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                          className="w-16 bg-white rounded-xl px-2 py-2 text-xs font-black border border-gray-200 text-center focus:ring-2 focus:ring-emerald-500" />
                      </div>
                      <div className="relative">
                        <span className="absolute -top-4 left-1 text-[8px] font-bold text-gray-400 sm:hidden">PRICE</span>
                        <input type="number" placeholder="Price" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)}
                          className="w-24 bg-white rounded-xl px-2 py-2 text-xs font-black border border-gray-200 text-center focus:ring-2 focus:ring-emerald-500" />
                      </div>
                    <button type="button" onClick={() => removeItem(idx)} 
                      className="p-2 text-red-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                      <X size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              )))}
            </div>
              </div>
              <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                {form.id ? 'Update Purchase Invoice' : 'Create Purchase Invoice'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Vendor Modal */}
      {showQuickVendor && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-xl rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-base font-black text-gray-900">Comprehensive Quick Add Vendor</h3>
              <button onClick={() => setShowQuickVendor(false)} className="text-gray-400"><X size={18} /></button>
            </div>
            <form onSubmit={handleQuickVendor} className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor Name *</label>
                <input required value={quickVendorForm.vendorName} onChange={e => setQuickVendorForm({...quickVendorForm, vendorName: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Mobile *</label>
                <input required value={quickVendorForm.mobile} onChange={e => setQuickVendorForm({...quickVendorForm, mobile: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Email</label>
                <input type="email" value={quickVendorForm.email} onChange={e => setQuickVendorForm({...quickVendorForm, email: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Contact Person</label>
                <input value={quickVendorForm.contactPerson} onChange={e => setQuickVendorForm({...quickVendorForm, contactPerson: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">GST Number</label>
                <input value={quickVendorForm.gstNumber} onChange={e => setQuickVendorForm({...quickVendorForm, gstNumber: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Credit Days</label>
                <input type="number" value={quickVendorForm.creditDays} onChange={e => setQuickVendorForm({...quickVendorForm, creditDays: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Opening Bal (₹)</label>
                <input type="number" value={quickVendorForm.openingBalance} onChange={e => setQuickVendorForm({...quickVendorForm, openingBalance: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none" />
              </div>
              <div className="col-span-2 space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Address</label>
                <textarea rows="2" value={quickVendorForm.address} onChange={e => setQuickVendorForm({...quickVendorForm, address: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2 text-xs font-bold focus:ring-2 focus:ring-emerald-500 border-none outline-none resize-none" />
              </div>
              <div className="col-span-2 flex gap-3 pt-2">
                <button type="button" onClick={() => setShowQuickVendor(false)} className="flex-1 py-3.5 text-xs font-black uppercase text-gray-400 hover:text-gray-600 transition-colors">Cancel</button>
                <button className="flex-[2] bg-emerald-600 text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Save Vendor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Product Modal */}
      {showQuickProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-sm rounded-[2rem] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-base font-black text-gray-900 border-b pb-2">Quick Add Product</h3>
            <form onSubmit={handleQuickProduct} className="space-y-3">
              <input placeholder="Product Name" required value={quickProductForm.name} onChange={e => setQuickProductForm({...quickProductForm, name: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 border-none outline-none" />
              <input type="number" placeholder="Purchase Price" value={quickProductForm.price} onChange={e => setQuickProductForm({...quickProductForm, price: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 border-none outline-none" />
              <select required value={quickProductForm.categoryId} onChange={e => setQuickProductForm({...quickProductForm, categoryId: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 border-none outline-none">
                <option value="default">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select required value={quickProductForm.unitId} onChange={e => setQuickProductForm({...quickProductForm, unitId: e.target.value})} className="w-full bg-gray-50 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 border-none outline-none">
                <option value="">Select Unit</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowQuickProduct(false)} className="flex-1 py-3 text-xs font-black uppercase text-gray-400">Cancel</button>
                <button className="flex-1 bg-blue-600 text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchasesSection;
