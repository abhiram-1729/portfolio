import React, { useState, useEffect } from 'react';
import { 
  Receipt, Plus, Search, Loader2, X, Package, Edit3, Trash2, ArrowLeft, Check, FileUp,
  Barcode, ScanBarcode
} from 'lucide-react';
import BarcodeScannerOverlay from '../../../components/BarcodeScannerOverlay';
import * as XLSX from 'xlsx';
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
  const [searchQty, setSearchQty] = useState('1');
  const [searchPrice, setSearchPrice] = useState('0');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quickVendorForm, setQuickVendorForm] = useState({
    vendorName: '', mobile: '', email: '', address: '',
    gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0'
  });
  const [quickProductForm, setQuickProductForm] = useState({
    name: '', description: '', mrp: '', price: '', landingPrice: '',
    purchasePrice: '', discount: '0', discountType: 'RUPEE', categoryId: 'default',
    subCategoryId: 'default', brandId: 'default', unitId: '', unitValue: '',
    gst: '0', isFree: false, minShopAmount: '0', status: 'ACTIVE',
    barcode: '', skuCode: '', stock: '0'
  });
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [units, setUnits] = useState([]);
  const [search, setSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

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
      const [v, p, c, u, sc] = await Promise.all([
        procurementAPI.getVendors({ status: 'ACTIVE' }),
        adminAPI.getItems(),
        adminAPI.getCategories(),
        adminAPI.getUnits(),
        adminAPI.getSubCategories()
      ]);
      setVendors(v.data);
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setCategories(c.data || []);
      setUnits(u.data || []);
      setSubCategories(sc.data || []);
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
      const formData = new FormData();
      Object.keys(quickProductForm).forEach(key => {
        if (quickProductForm[key] !== undefined && quickProductForm[key] !== null) {
          formData.append(key, quickProductForm[key]);
        }
      });
      
      await adminAPI.createItem(formData);
      toast.success('Product added');
      const p = await adminAPI.getItems();
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setShowQuickProduct(false);
      setQuickProductForm({
        name: '', description: '', mrp: '', price: '', landingPrice: '',
        purchasePrice: '', discount: '0', discountType: 'RUPEE', categoryId: 'default',
        subCategoryId: 'default', brandId: 'default', unitId: '', unitValue: '',
        gst: '0', isFree: false, minShopAmount: '0', status: 'ACTIVE',
        barcode: '', skuCode: '', stock: '0'
      });
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

  const handleBarcodeScan = (code) => {
    const product = products.find(p => p.barcode === code || p.skuCode === code);
    if (product) {
      setSelectedProduct(product);
      setSearchPrice(String(product.purchasePrice || product.price || 0));
      setItemSearch(product.name);
      setSearchQty('1');
      toast.success(`Found: ${product.name}`);
    } else {
      toast.error('Product not found for this barcode');
    }
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
      toast.success('Purchase deleted');
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting purchase');
    }
  };

  const handleExcelUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws);

        if (rawData.length === 0) {
          toast.error('Excel sheet is empty');
          return;
        }

        const cleanNum = (val) => {
          if (val === undefined || val === null || val === '') return 0;
          if (typeof val === 'number') return val;
          const cleaned = String(val).replace(/[^0-9.-]/g, '');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        const itemsToAdd = [];
        const missingProductsToCreate = [];
        const rowData = [];

        rawData.forEach(row => {
          const norm = {};
          Object.keys(row).forEach(key => {
            const k = key.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            norm[k] = row[key];
          });

          // Expanded Aliases
          const name = String(norm.name || norm.productname || norm.itemname || norm.product || norm.item || norm.description || '').trim();
          const identifier = String(norm.barcode || norm.sku || norm.skucode || norm.itemcode || norm.code || '').trim();
          
          const qty = cleanNum(norm.quantity || norm.qty || norm.qnty || norm.units || norm.pieces || norm.count || norm.total || 1);
          const price = cleanNum(norm.price || norm.purchaseprice || norm.buyingprice || norm.cost || norm.rate || norm.mrp || 0);

          if (name || identifier) {
            const product = products.find(p => 
              (identifier && (String(p.barcode).trim() === identifier || String(p.skuCode).trim() === identifier)) ||
              (name && p.name.toLowerCase().trim() === name.toLowerCase())
            );

            if (product) {
              itemsToAdd.push({
                productId: product.id,
                quantity: String(qty || 1),
                price: String(price || product.purchasePrice || product.price || 0)
              });
            } else {
              missingProductsToCreate.push({
                name: name || `Product ${identifier}`,
                barcode: identifier || undefined,
                skuCode: identifier || undefined,
                purchasePrice: price,
                price: price * 1.2, // Default selling price markup
                categoryName: 'Uncategorized',
                unitType: norm.unit || norm.uom || 'pcs'
              });
              rowData.push({ qty: String(qty || 1), price: String(price) });
            }
          }
        });

        let finalItemsToAdd = [...itemsToAdd];

        if (missingProductsToCreate.length > 0) {
          const loadingToast = toast.loading(`Creating ${missingProductsToCreate.length} new products...`);
          try {
            const { data: createdItems } = await adminAPI.bulkCreateItems(missingProductsToCreate);
            
            createdItems.forEach((p, idx) => {
              finalItemsToAdd.push({
                productId: p.id,
                quantity: rowData[idx].qty,
                price: rowData[idx].price || String(p.purchasePrice || p.price || 0)
              });
            });

            const { data: updatedProducts } = await adminAPI.getItems();
            setProducts(updatedProducts);
            toast.success(`Added ${createdItems.length} new products`, { id: loadingToast });
          } catch (err) {
            toast.error('Failed to create some products', { id: loadingToast });
          }
        }

        if (finalItemsToAdd.length > 0) {
          setForm(prev => ({
            ...prev,
            items: [...prev.items, ...finalItemsToAdd]
          }));
          toast.success(`Total ${finalItemsToAdd.length} items added to invoice`);
        } else {
          toast.error('No valid products found in Excel');
        }
      } catch (err) {
        console.error('Excel Parse Error:', err);
        toast.error('Failed to parse Excel file');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = null;
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
      setIsSubmitting(true);
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
    } finally {
      setIsSubmitting(false);
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
      {!showForm ? (
        <>
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
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full table-fixed border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="w-[12%] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Invoice</th>
                  <th className="w-[10%] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Date</th>
                  <th className="w-[18%] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Vendor</th>
                  <th className="w-[15%] px-4 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Charges</th>
                  <th className="w-[20%] px-4 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Financial Summary</th>
                  <th className="w-[12%] px-4 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Status</th>
                  <th className="w-[13%] px-4 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {purchases.filter(p => 
                  !search || 
                  p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) || 
                  p.vendor?.vendorName.toLowerCase().includes(search.toLowerCase())
                ).map(p => (
                  <tr key={p.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[11px] font-black text-gray-900 leading-none">#{p.invoiceNumber}</span>
                        {p.displayId && <span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter leading-none">{p.displayId}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-black text-gray-500 uppercase">{format(new Date(p.invoiceDate), 'dd MMM yyyy')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-700 truncate">{p.vendor?.vendorName}</span>
                        <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">{p.vendor?.mobile || 'No Contact'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {parseFloat(p.transportCharges) > 0 && (
                          <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">TR: ₹{p.transportCharges}</span>
                        )}
                        {parseFloat(p.otherCharges) > 0 && (
                          <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">OT: ₹{p.otherCharges}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Total</span>
                          <span className="text-[11px] font-black text-gray-900">₹{p.totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Paid</span>
                          <span className="text-[9px] font-black text-emerald-600">₹{p.paidAmount.toLocaleString()}</span>
                        </div>
                        {p.totalAmount - p.paidAmount > 0 && (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-[8px] font-black text-rose-500 uppercase tracking-tighter">Bal</span>
                            <span className="text-[9px] font-black text-rose-600 font-mono tracking-tighter">₹{(p.totalAmount - p.paidAmount).toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border shadow-sm inline-block ${invoiceStatusColors[p.status] || ''}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {can('PROCUREMENT', 'UPDATE', 'PURCHASES') && (
                          <button onClick={() => handleEdit(p)} className="p-2 bg-white text-gray-400 hover:text-emerald-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95" title="Edit">
                            <Edit3 size={14} strokeWidth={3} />
                          </button>
                        )}
                        {can('PROCUREMENT', 'DELETE', 'PURCHASES') && (
                          <button onClick={() => handleDelete(p.id)} className="p-2 bg-white text-gray-400 hover:text-rose-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95" title="Delete">
                            <Trash2 size={14} strokeWidth={3} />
                          </button>
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
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
            <button type="button" onClick={() => setShowForm(false)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-emerald-600 transition-all">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-xl font-black text-gray-900">{form.id ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h3>
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
                        onChange={e => { 
                          setItemSearch(e.target.value); 
                          setShowItemResults(true); 
                          if (!e.target.value) {
                            setSelectedProduct(null);
                            setSearchPrice('0');
                          }
                        }}
                        onFocus={() => setShowItemResults(true)}
                      />
                      <button
                        type="button"
                        onClick={() => setShowScanner(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-emerald-600 transition-colors"
                        title="Scan Barcode"
                      >
                        <ScanBarcode size={16} />
                      </button>
                      {showItemResults && itemSearch && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2">
                          {products.filter(p => 
                            p.name.toLowerCase().includes(itemSearch.toLowerCase()) || 
                            p.skuCode?.toLowerCase().includes(itemSearch.toLowerCase()) ||
                            p.barcode?.toLowerCase().includes(itemSearch.toLowerCase())
                          ).slice(0, 10).map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProduct(p);
                                setSearchPrice(String(p.purchasePrice || p.price || 0));
                                setItemSearch(p.name);
                                setShowItemResults(false);
                                setSearchQty('1');
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 last:border-0 flex items-center justify-between group transition-colors"
                            >
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-gray-900 group-hover:text-emerald-700">{p.name}</span>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[8px] font-black bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded border border-emerald-100">Store: {p.warehouseStock || 0}</span>
                                  <span className="text-[8px] font-black bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">Veh: {p.vehicleStock || 0}</span>
                                  <span className="text-[8px] font-black bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">Total: {p.totalStock || 0}</span>
                                </div>
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

                  <div className="flex items-end gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase text-gray-400 pl-1">Qty</label>
                      <input 
                        type="number"
                        placeholder="Qty"
                        className="w-16 bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                        value={searchQty}
                        onChange={e => setSearchQty(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[8px] font-bold uppercase text-gray-400 pl-1">Price</label>
                      <input 
                        type="number"
                        placeholder="Price"
                        className="w-24 bg-gray-50 border border-gray-100 rounded-xl px-2 py-2 text-xs font-black focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-inner"
                        value={searchPrice}
                        onChange={e => setSearchPrice(e.target.value)}
                      />
                    </div>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (!selectedProduct) return toast.error('Please select a product first');
                        setForm(prev => ({
                          ...prev,
                          items: [...prev.items, { productId: selectedProduct.id, quantity: searchQty, price: searchPrice }]
                        }));
                        setSelectedProduct(null);
                        setItemSearch('');
                        setSearchQty('1');
                        setSearchPrice('0');
                      }}
                      className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-200"
                      title="Add to List"
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                  <div className="flex gap-2 self-end">
                    <input
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      id="excel-upload"
                      className="hidden"
                      onChange={handleExcelUpload}
                    />
                    <label
                      htmlFor="excel-upload"
                      className="text-[10px] font-black text-amber-600 flex items-center gap-1.5 bg-amber-50/50 px-3 py-2 rounded-xl hover:bg-amber-100 transition-all cursor-pointer active:scale-95 border border-amber-100"
                    >
                      <FileUp size={12} strokeWidth={3} /> Bulk Upload
                    </label>
                    <button type="button" onClick={() => setShowQuickProduct(true)} className="text-[10px] font-black text-blue-600 flex items-center gap-1.5 bg-blue-50/50 px-3 py-2 rounded-xl hover:bg-blue-100 transition-all active:scale-95">
                      <Plus size={12} strokeWidth={3} /> New Product
                    </button>
                  </div>
                </div>
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" onClick={() => setShowItemResults(false)}>
                {form.items.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="mx-auto text-gray-200 mb-3" size={48} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No items added yet</p>
                  </div>
                ) : (
                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100">
                        <th className="w-[5%] px-3 py-2 text-left text-[8px] font-black uppercase tracking-widest text-gray-400">#</th>
                        <th className="w-[30%] px-3 py-2 text-left text-[8px] font-black uppercase tracking-widest text-gray-400">Product Details</th>
                        <th className="w-[20%] px-3 py-2 text-center text-[8px] font-black uppercase tracking-widest text-gray-400">Stock Status</th>
                        <th className="w-[10%] px-3 py-2 text-center text-[8px] font-black uppercase tracking-widest text-gray-400">Unit</th>
                        <th className="w-[10%] px-3 py-2 text-center text-[8px] font-black uppercase tracking-widest text-gray-400">Qty</th>
                        <th className="w-[12%] px-3 py-2 text-center text-[8px] font-black uppercase tracking-widest text-gray-400">Price</th>
                        <th className="w-[13%] px-3 py-2 text-right text-[8px] font-black uppercase tracking-widest text-gray-400">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.items.map((item, idx) => {
                        const p = products.find(x => x.id === item.productId);
                        if (!p) return null;
                        return (
                          <tr key={idx} className="hover:bg-emerald-50/20 transition-colors group">
                            <td className="px-3 py-2.5">
                              <span className="text-[10px] font-black text-gray-300">{idx + 1}</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex flex-col min-w-0">
                                <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{p.name}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[7px] font-black text-gray-400 uppercase tracking-tighter">{p.category?.name || 'No Cat'}</span>
                                  <span className="text-[7px] text-gray-200">•</span>
                                  <span className="text-[7px] font-black text-blue-400 uppercase tracking-tighter">{p.skuCode || 'NO-SKU'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-black text-emerald-600 leading-none">{p.warehouseStock || 0}</span>
                                  <span className="text-[6px] font-black text-gray-300 uppercase tracking-tighter">Store</span>
                                </div>
                                <div className="w-px h-3 bg-gray-100" />
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-black text-amber-600 leading-none">{p.vehicleStock || 0}</span>
                                  <span className="text-[6px] font-black text-gray-300 uppercase tracking-tighter">Fleet</span>
                                </div>
                                <div className="w-px h-3 bg-gray-100" />
                                <div className="flex flex-col items-center">
                                  <span className="text-[9px] font-black text-blue-600 leading-none">{p.totalStock || 0}</span>
                                  <span className="text-[6px] font-black text-gray-300 uppercase tracking-tighter">System</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {p.unit && (
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-tighter bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100">
                                  {p.unitValue} {p.unit.type}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-center">
                                <input 
                                  type="number" 
                                  min="1" 
                                  value={item.quantity || ''} 
                                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                                  className="w-14 bg-gray-50 border border-gray-100 rounded-lg px-1.5 py-1 text-[10px] font-black text-center focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-center">
                                <input 
                                  type="number" 
                                  value={item.price || ''} 
                                  onChange={e => updateItem(idx, 'price', e.target.value)}
                                  className="w-20 bg-gray-50 border border-gray-100 rounded-lg px-1.5 py-1 text-[10px] font-black text-center focus:ring-2 focus:ring-emerald-500 outline-none transition-all" 
                                />
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right relative">
                              <div className="flex flex-col items-end pr-6">
                                <span className="text-[10px] font-black text-gray-900 leading-none">₹{(parseFloat(item.quantity || 0) * parseFloat(item.price || 0)).toLocaleString()}</span>
                                <span className="text-[6px] font-black text-gray-300 uppercase tracking-tighter">Subtotal</span>
                              </div>
                              <button 
                                onClick={(e) => { e.stopPropagation(); removeItem(idx); }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-gray-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                              >
                                <X size={12} strokeWidth={3} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
              </div>
              <button 
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <><Loader2 className="animate-spin" size={16} /> Saving...</>
                ) : (
                  form.id ? 'Update Purchase Invoice' : 'Create Purchase Invoice'
                )}
              </button>
            </form>
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

      {showQuickProduct && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowQuickProduct(false)}
          />
          <div className="relative w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Full Item Creation</h3>
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Master Inventory Entry</p>
              </div>
              <button onClick={() => setShowQuickProduct(false)} className="p-3 hover:bg-gray-100 rounded-2xl text-gray-400 transition-all active:scale-90">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 pb-32">
              <form id="drawer-product-form" onSubmit={handleQuickProduct} className="space-y-8">
                {/* Basic Info */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">Basic Information</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Product Name *</label>
                      <input placeholder="Enter product name" required value={quickProductForm.name} onChange={e => setQuickProductForm({...quickProductForm, name: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">SKU Code</label>
                      <input placeholder="Internal identifier" value={quickProductForm.skuCode} onChange={e => setQuickProductForm({...quickProductForm, skuCode: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                </section>

                {/* Classification */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Classification</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Category *</label>
                      <select required value={quickProductForm.categoryId} onChange={e => setQuickProductForm({...quickProductForm, categoryId: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                        <option value="default">Select Category</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Sub-Category</label>
                      <select value={quickProductForm.subCategoryId} onChange={e => setQuickProductForm({...quickProductForm, subCategoryId: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                        <option value="default">Select Sub-Category</option>
                        {subCategories.filter(sc => sc.categoryId === quickProductForm.categoryId).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Barcode (EAN/UPC)</label>
                    <div className="relative">
                      <Barcode className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input placeholder="Scan or type barcode" value={quickProductForm.barcode} onChange={e => setQuickProductForm({...quickProductForm, barcode: e.target.value})} className="w-full bg-gray-50 rounded-2xl pl-12 pr-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                </section>

                {/* Pricing */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-3">Pricing & Tax</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">MRP (₹)</label>
                      <input type="number" placeholder="0.00" value={quickProductForm.mrp} onChange={e => setQuickProductForm({...quickProductForm, mrp: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-black border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Purchase Price (₹)</label>
                      <input type="number" placeholder="0.00" value={quickProductForm.purchasePrice} onChange={e => setQuickProductForm({...quickProductForm, purchasePrice: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-black border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selling Price * (₹)</label>
                      <input type="number" placeholder="0.00" required value={quickProductForm.price} onChange={e => setQuickProductForm({...quickProductForm, price: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-black border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">GST (%)</label>
                      <input type="number" placeholder="0" value={quickProductForm.gst} onChange={e => setQuickProductForm({...quickProductForm, gst: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-black border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                </section>

                {/* Stock Details */}
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-indigo-500 pl-3">Units & Initial Stock</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Unit Type</label>
                      <select value={quickProductForm.unitId} onChange={e => setQuickProductForm({...quickProductForm, unitId: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                        <option value="">Select Unit</option>
                        {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Unit Value</label>
                      <input type="number" placeholder="e.g. 500" value={quickProductForm.unitValue} onChange={e => setQuickProductForm({...quickProductForm, unitValue: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Opening Stock (In Store)</label>
                    <input type="number" placeholder="0" value={quickProductForm.stock} onChange={e => setQuickProductForm({...quickProductForm, stock: e.target.value})} className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-black border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner" />
                  </div>
                </section>
              </form>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/80 backdrop-blur-md absolute bottom-0 left-0 right-0">
              <button 
                form="drawer-product-form"
                className="w-full bg-gray-900 text-white py-5 rounded-[2rem] text-sm font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
              >
                Create Master Item
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
          </div>
        </div>
      )}
      {showScanner && (
        <BarcodeScannerOverlay
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
};

export default PurchasesSection;
