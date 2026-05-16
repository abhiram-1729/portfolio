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

const PurchasesSection = ({ can, setHeaderExtra }) => {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    // Clear header on mount/unmount
    if (setHeaderExtra) setHeaderExtra(null);
    return () => {
      if (setHeaderExtra) setHeaderExtra(null);
    };
  }, [setHeaderExtra]);
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
  const [itemFilter, setItemFilter] = useState('');
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
  const [taxSlabs, setTaxSlabs] = useState([0, 5, 12, 18, 28]);
  const [actionLoading, setActionLoading] = useState({ id: null, type: null });
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [formLoading, setFormLoading] = useState(false);

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
    setFormLoading(true);
    // We always refetch products to ensure latest prices/taxes are used
    try {
      const [v, p, c, u, sc, s, po] = await Promise.all([
        procurementAPI.getVendors({ status: 'ACTIVE' }),
        adminAPI.getItems(),
        adminAPI.getCategories(),
        adminAPI.getUnits(),
        adminAPI.getSubCategories(),
        adminAPI.getSettings(),
        procurementAPI.getPurchaseOrders({ status: 'APPROVED,ORDERED,DELIVERED' })
      ]);
      setVendors(v.data);
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setCategories(c.data || []);
      setUnits(u.data || []);
      setSubCategories(sc.data || []);
      setPurchaseOrders(po.data || []);

      if (s.data?.success && s.data?.data?.taxRates) {
        const rates = s.data.data.taxRates.split(',').map(r => parseFloat(r.trim())).filter(r => !isNaN(r));
        setTaxSlabs(rates);
      }
      setShowForm(true);
    } catch { toast.error('Failed to load data'); }
    finally { setFormLoading(false); }
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

  const addItem = (product = null) => {
    const newItem = {
      productId: product?.id || '',
      name: product?.name || '',
      skuCode: product?.skuCode || 'NO-SKU',
      quantity: '1',
      unitCostBeforeDiscount: String(product?.purchasePrice || product?.price || '0'),
      discountPercent: '0',
      unitCostBeforeTax: String(product?.purchasePrice || product?.price || '0'),
      subtotalBeforeTax: String(product?.purchasePrice || product?.price || '0'),
      taxType: (product?.gst && product.gst > 0) ? 'GST' : 'NONE',
      taxPercent: String(product?.gst || '0'),
      netCost: String(product?.purchasePrice || product?.price || '0'),
      profitMargin: '0',
      unitSellingPrice: String(product?.price || '0'),
      mfgDate: '',
      expDate: '',
      total: String(product?.purchasePrice || product?.price || '0')
    };
    setForm(prev => ({ ...prev, items: [...prev.items, calculateItemValues(newItem)] }));
  };

  const handlePOSelect = (poId) => {
    if (!poId) {
      setForm(prev => ({ ...prev, poId: '' }));
      return;
    }

    const po = purchaseOrders.find(o => o.id === poId);
    if (!po) return;

    // Map PO items to Purchase Invoice items
    const mappedItems = po.items.map(item => {
      const prod = products.find(p => p.id === item.productId);
      const cost = item.rate || prod?.purchasePrice || prod?.price || 0;
      const qty = item.quantity || 1;
      const taxRate = prod?.gst || 0;

      return {
        productId: item.productId,
        name: prod?.name || 'Unknown Product',
        skuCode: prod?.skuCode || 'NO-SKU',
        quantity: String(qty),
        unitCostBeforeDiscount: String(cost),
        discountPercent: '0',
        unitCostBeforeTax: String(cost),
        subtotalBeforeTax: String(qty * cost),
        taxType: taxRate > 0 ? 'GST' : 'NONE',
        taxPercent: String(taxRate),
        netCost: String(cost),
        profitMargin: '0',
        unitSellingPrice: String(prod?.price || cost),
        mfgDate: '',
        expDate: '',
        total: String(qty * cost)
      };
    });

    setForm(prev => ({
      ...prev,
      poId,
      vendorId: po.vendorId,
      items: mappedItems.map(i => calculateItemValues(i))
    }));

    toast.success(`Loaded items from PO #${po.displayId}`);
  };

  const calculateItemValues = (item) => {
    const qty = parseFloat(item.quantity) || 0;
    const unitCostBD = parseFloat(item.unitCostBeforeDiscount) || 0;
    const discPer = parseFloat(item.discountPercent) || 0;
    const taxPer = parseFloat(item.taxPercent) || 0;
    const unitSellPrice = parseFloat(item.unitSellingPrice) || 0;

    // Total amount after discount (treated as Inclusive)
    const lineTotal = (unitCostBD * qty) * (1 - discPer / 100);
    
    // Tax Amount calculated on the Inclusive Total
    const taxAmount = lineTotal * (taxPer / 100);

    // Base total (Before Tax) = Total - Tax
    const subtotalBT = lineTotal - taxAmount;
    const unitCostBT = qty > 0 ? subtotalBT / qty : 0;
    
    const netCost = qty > 0 ? lineTotal / qty : 0;
    const profitMargin = netCost > 0 ? ((unitSellPrice - netCost) / netCost) * 100 : 0;

    return {
      ...item,
      unitCostBeforeTax: unitCostBT.toFixed(2),
      subtotalBeforeTax: subtotalBT.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: lineTotal.toFixed(2),
      netCost: netCost.toFixed(2),
      profitMargin: profitMargin.toFixed(2)
    };
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => {
        if (i === idx) {
          const updatedItem = typeof field === 'object' ? { ...item, ...field } : { ...item, [field]: value };
          return calculateItemValues(updatedItem);
        }
        return item;
      })
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

  const handleEdit = async (purchase) => {
    setActionLoading({ id: purchase.id, type: 'edit' });
    try {
      await openForm();
      const { data } = await procurementAPI.getPurchaseById(purchase.id);
      setForm({
        id: data.id,
        vendorId: data.vendorId || '',
        poId: data.poId || '',
        invoiceNumber: data.invoiceNumber || '',
        invoiceDate: format(new Date(data.invoiceDate), 'yyyy-MM-dd'),
        transportCharges: String(data.transportCharges || 0),
        otherCharges: String(data.otherCharges || 0),
        items: data.items.map(i => ({
          productId: i.productId,
          name: i.product?.name || 'Unknown',
          skuCode: i.product?.skuCode || 'NO-SKU',
          quantity: String(i.quantity),
          unitCostBeforeDiscount: String(i.unitCostBeforeDiscount),
          discountPercent: String(i.discountPercent),
          unitCostBeforeTax: String(i.unitCostBeforeTax),
          subtotalBeforeTax: String(i.subtotalBeforeTax),
          taxType: i.taxType || 'NONE',
          taxPercent: String(i.taxPercent || 0),
          netCost: String(i.netCost),
          profitMargin: String(i.profitMargin),
          unitSellingPrice: String(i.unitSellingPrice),
          mfgDate: i.mfgDate ? format(new Date(i.mfgDate), 'yyyy-MM-dd') : '',
          expDate: i.expDate ? format(new Date(i.expDate), 'yyyy-MM-dd') : '',
          total: String(i.total)
        }))
      });
      setShowForm(true);
    } finally {
      setActionLoading({ id: null, type: null });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase invoice? This will revert stock and vendor balance.')) return;
    setActionLoading({ id, type: 'delete' });
    try {
      await procurementAPI.deletePurchase(id);
      toast.success('Purchase deleted');
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting purchase');
    } finally {
      setActionLoading({ id: null, type: null });
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
        items: form.items.map(i => ({
          productId: i.productId,
          quantity: parseInt(i.quantity),
          price: parseFloat(i.netCost), // Using netCost as the base price for stock/ledger if needed
          unitCostBeforeDiscount: parseFloat(i.unitCostBeforeDiscount),
          discountPercent: parseFloat(i.discountPercent),
          unitCostBeforeTax: parseFloat(i.unitCostBeforeTax),
          subtotalBeforeTax: parseFloat(i.subtotalBeforeTax),
          taxType: i.taxType,
          taxPercent: parseFloat(i.taxPercent),
          netCost: parseFloat(i.netCost),
          total: parseFloat(i.total),
          profitMargin: parseFloat(i.profitMargin),
          unitSellingPrice: parseFloat(i.unitSellingPrice),
          mfgDate: i.mfgDate || null,
          expDate: i.expDate || null
        }))
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
    <div className="space-y-4 h-full overflow-y-auto custom-scrollbar pb-10 pr-2">
      {(!showForm && !showQuickProduct && !showQuickVendor) && (
        <>
          <div className="flex items-center gap-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-[11px] font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="bg-white px-4 py-1.5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-end">
                <span className="text-[8px] font-black uppercase tracking-widest text-gray-400 leading-none">Total Purchases</span>
                <span className="text-xs font-black text-gray-900 mt-0.5">₹{purchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0).toLocaleString()}</span>
              </div>

              {can('PROCUREMENT', 'CREATE', 'PURCHASES') && (
                <button 
                  onClick={() => { setForm({ vendorId: '', poId: '', invoiceNumber: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'), transportCharges: '0', otherCharges: '0', items: [] }); openForm(); }}
                  disabled={formLoading}
                  className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95 disabled:opacity-70">
                  {formLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} strokeWidth={3} />}
                  New Purchase
                </button>
              )}
            </div>
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
              <div className="overflow-x-auto custom-scrollbar w-full">
                <table className="w-max min-w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-100 whitespace-nowrap">
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Invoice</th>
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">PO</th>
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Date</th>
                      <th className="px-6 py-3 text-left text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Vendor</th>
                      <th className="px-6 py-3 text-center text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap">Total</th>
                      <th className="px-6 py-3 text-right text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 sticky right-0 bg-gray-50 z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">Actions</th>
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
                            {p.po && <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter mt-0.5">PO: {p.po.displayId || p.po.displayId}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                            {p.po ? (p.po.displayId || `PO${p.po.poNumber}`) : '—'}
                          </span>
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
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <span className="text-[12px] font-black text-gray-900">₹{(p.totalAmount || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-emerald-50/30 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {can('PROCUREMENT', 'UPDATE', 'PURCHASES') && (
                              <button
                                onClick={() => handleEdit(p)}
                                disabled={actionLoading.id === p.id}
                                className="p-2 bg-white text-gray-400 hover:text-emerald-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                title="Edit"
                              >
                                {actionLoading.id === p.id && actionLoading.type === 'edit' ? (
                                  <Loader2 size={14} className="animate-spin text-emerald-600" />
                                ) : (
                                  <Edit3 size={14} strokeWidth={3} />
                                )}
                              </button>
                            )}
                            {can('PROCUREMENT', 'DELETE', 'PURCHASES') && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={actionLoading.id === p.id}
                                className="p-2 bg-white text-gray-400 hover:text-rose-600 rounded-xl border border-gray-100 shadow-sm transition-all hover:scale-110 active:scale-95 disabled:opacity-50"
                                title="Delete"
                              >
                                {actionLoading.id === p.id && actionLoading.type === 'delete' ? (
                                  <Loader2 size={14} className="animate-spin text-rose-600" />
                                ) : (
                                  <Trash2 size={14} strokeWidth={3} />
                                )}
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
      )}

      {showForm && (
        <div className={`bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 ${showQuickProduct || showQuickVendor ? 'hidden' : 'block'}`}>
          <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
            <button type="button" onClick={() => setShowForm(false)} className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 hover:text-emerald-600 transition-all">
              <ArrowLeft size={18} />
            </button>
            <h3 className="text-xl font-black text-gray-900">{form.id ? 'Edit Purchase Invoice' : 'New Purchase Invoice'}</h3>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>
                  <button type="button" onClick={() => setShowQuickVendor(true)} className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-emerald-100"><Plus size={10} /> Add New</button>
                </div>
                <select value={form.vendorId} onChange={e => setForm({ ...form, vendorId: e.target.value })} required
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Link Purchase Order (Optional)</label>
                <select 
                  value={form.poId} 
                  onChange={e => handlePOSelect(e.target.value)}
                  disabled={!form.vendorId}
                  className="w-full bg-emerald-50/50 rounded-xl px-4 py-3 text-sm font-bold border border-emerald-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                  <option value="">{form.vendorId ? 'No PO Linked' : 'Select Vendor First'}</option>
                  {form.vendorId && purchaseOrders.filter(po => po.vendorId === form.vendorId).map(po => (
                    <option key={po.id} value={po.id}>PO #{po.displayId} ({po.vendor?.vendorName})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Invoice # *</label>
                <input required placeholder="Vendor's Invoice Number" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Invoice Date</label>
                <input type="date" value={form.invoiceDate} onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Transport ₹</label>
                <input type="number" value={form.transportCharges} onChange={e => setForm({ ...form, transportCharges: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Other ₹</label>
                <input type="number" value={form.otherCharges} onChange={e => setForm({ ...form, otherCharges: e.target.value })}
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
                      const newItem = calculateItemValues({
                        productId: selectedProduct.id,
                        quantity: searchQty,
                        unitCostBeforeDiscount: searchPrice,
                        discountPercent: '0',
                        unitCostBeforeTax: searchPrice,
                        subtotalBeforeTax: '0',
                        taxType: 'NONE',
                        taxPercent: '0',
                        netCost: searchPrice,
                        total: '0',
                        profitMargin: '0',
                        unitSellingPrice: String(selectedProduct.price || 0),
                        mfgDate: '',
                        expDate: ''
                      });
                      setForm(prev => ({
                        ...prev,
                        items: [...prev.items, newItem]
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
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Package size={14} className="text-emerald-600" />
                    Line Items ({form.items.length})
                  </h3>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={10} />
                    <input
                      type="text"
                      placeholder="FILTER ADDED ITEMS..."
                      value={itemFilter}
                      onChange={(e) => setItemFilter(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[9px] font-black w-48 focus:ring-2 focus:ring-emerald-500 outline-none transition-all uppercase placeholder:text-gray-300"
                    />
                    {itemFilter && (
                      <button onClick={() => setItemFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        <X size={10} strokeWidth={3} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    id="excel-upload"
                    className="hidden"
                    accept=".xlsx, .xls"
                    onChange={handleExcelUpload}
                  />
                  <label
                    for="excel-upload"
                    className="text-[9px] font-black text-amber-600 flex items-center gap-1.5 bg-amber-50/50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-all cursor-pointer border border-amber-100"
                  >
                    <FileUp size={10} strokeWidth={3} /> Bulk
                  </label>
                  <button type="button" onClick={() => setShowQuickProduct(true)} className="text-[9px] font-black text-blue-600 flex items-center gap-1.5 bg-blue-50/50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all">
                    <Plus size={10} strokeWidth={3} /> New
                  </button>
                </div>
              </div>
              <div className="bg-white rounded-b-3xl border-t border-gray-100 overflow-x-auto custom-scrollbar" onClick={() => setShowItemResults(false)}>
                {form.items.length === 0 ? (
                  <div className="py-12 text-center">
                    <Package className="mx-auto text-gray-200 mb-3" size={48} />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No items added yet</p>
                  </div>
                ) : (
                  <table className="w-full table-auto border-collapse">
                    <thead>
                      <tr className="bg-emerald-600 border-b border-emerald-700">
                        <th className="px-1 py-2 text-left text-[7px] font-black uppercase tracking-tighter text-emerald-50">#</th>
                        <th className="px-2 py-2 text-left text-[7px] font-black uppercase tracking-tighter text-emerald-50 min-w-[100px]">Product Name</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Qty</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Cost (BD)</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Disc %</th>
                        {/* <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Cost (BT)</th> */}
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Sub (BT)</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Tax</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Tax Amt</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Net Cost</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Line Total</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Margin %</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">Selling Price</th>
                        <th className="px-1 py-2 text-center text-[7px] font-black uppercase tracking-tighter text-emerald-50">MFG/EXP Date</th>
                        <th className="px-1 py-2 text-right text-[7px] font-black uppercase tracking-tighter text-emerald-50"><Trash2 size={12} className="ml-auto" /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {form.items
                        .map((item, index) => ({ ...item, originalIndex: index }))
                        .filter(item => {
                          const p = products.find(x => x.id === item.productId);
                          if (!p) return false;
                          const search = itemFilter.toLowerCase();
                          return !search ||
                            p.name.toLowerCase().includes(search) ||
                            (p.barcode && p.barcode.toLowerCase().includes(search)) ||
                            (p.skuCode && p.skuCode.toLowerCase().includes(search));
                        })
                        .map((item, filteredIdx) => {
                          const p = products.find(x => x.id === item.productId);
                          const originalIdx = item.originalIndex;
                          return (
                            <tr key={originalIdx} className="hover:bg-emerald-50/20 transition-colors group">
                              <td className="px-1 py-1.5">
                                <span className="text-[8px] font-black text-gray-300">{originalIdx + 1}</span>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[9px] font-black text-gray-900 truncate uppercase tracking-tighter leading-tight">{p.name}</span>
                                  <span className="text-[7px] font-bold text-gray-400">({p.barcode || p.skuCode || 'NO-SKU'})</span>
                                </div>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    value={item.quantity || ''}
                                    onChange={e => updateItem(originalIdx, 'quantity', e.target.value)}
                                    className="w-10 bg-white border border-gray-200 rounded px-1 py-0.5 text-[8px] font-black text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                                  />
                                  <span className="text-[6px] font-black text-gray-400 uppercase">{p.unit?.type || 'pcs'}</span>
                                </div>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <input
                                  type="number"
                                  value={item.unitCostBeforeDiscount || ''}
                                  onChange={e => updateItem(originalIdx, 'unitCostBeforeDiscount', e.target.value)}
                                  className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-[8px] font-black text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <div className="flex flex-col items-center">
                                  <input
                                    type="number"
                                    value={item.discountPercent || ''}
                                    onChange={e => updateItem(originalIdx, 'discountPercent', e.target.value)}
                                    className="w-10 bg-white border border-gray-200 rounded px-1 py-0.5 text-[8px] font-black text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                                  />
                                  <span className="text-[6px] font-black text-gray-400 uppercase">%</span>
                                </div>
                              </td>
                              {/* <td className="px-1 py-1.5 text-center">
                                <input
                                  type="number"
                                  value={item.unitCostBeforeTax || ''}
                                  onChange={e => updateItem(originalIdx, 'unitCostBeforeTax', e.target.value)}
                                  className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-[8px] font-black text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                              </td> */}
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-[8px] font-black text-gray-700">{parseFloat(item.subtotalBeforeTax).toLocaleString()}</span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <div className="flex items-center gap-0.5 justify-center">
                                  <select
                                    value={item.taxType === 'NONE' ? 'NONE_0' : `GST_${item.taxPercent}`}
                                    onChange={e => {
                                      const [type, percent] = e.target.value.split('_');
                                      updateItem(originalIdx, { taxType: type, taxPercent: percent });
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded px-0.5 py-0.5 text-[7px] font-black focus:ring-1 focus:ring-emerald-500 outline-none"
                                  >
                                    <option value="NONE_0">Nor (0%)</option>
                                    {taxSlabs.filter(s => s > 0).map(slab => (
                                      <option key={slab} value={`GST_${slab}`}>GST {slab}%</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-[8px] font-black text-rose-600">{parseFloat(item.taxAmount || 0).toLocaleString()}</span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-[8px] font-black text-gray-700">{parseFloat(item.netCost).toLocaleString()}</span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className="text-[8px] font-black text-gray-900 font-mono">{parseFloat(item.total).toLocaleString()}</span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <span className={`text-[8px] font-black ${parseFloat(item.profitMargin) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {item.profitMargin}%
                                </span>
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <input
                                  type="number"
                                  value={item.unitSellingPrice || ''}
                                  onChange={e => updateItem(originalIdx, 'unitSellingPrice', e.target.value)}
                                  className="w-14 bg-white border border-gray-200 rounded px-1 py-0.5 text-[8px] font-black text-center focus:ring-1 focus:ring-emerald-500 outline-none"
                                />
                              </td>
                              <td className="px-1 py-1.5 text-center">
                                <div className="flex flex-col gap-0.5">
                                  <input
                                    type="date"
                                    value={item.expDate || ''}
                                    onChange={e => updateItem(originalIdx, 'expDate', e.target.value)}
                                    className="bg-white border border-gray-200 rounded px-0.5 py-0.5 text-[7px] font-black focus:ring-1 focus:ring-emerald-500 outline-none"
                                  />
                                  <input
                                    type="date"
                                    value={item.mfgDate || ''}
                                    onChange={e => updateItem(originalIdx, 'mfgDate', e.target.value)}
                                    className="bg-white border border-gray-200 rounded px-0.5 py-0.5 text-[7px] font-black focus:ring-1 focus:ring-emerald-500 outline-none"
                                  />
                                </div>
                              </td>
                              <td className="px-1 py-1.5 text-right">
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeItem(originalIdx); }}
                                  className="p-1 text-gray-300 hover:text-rose-500 transition-all"
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
      {/* Quick Vendor Form (Inline) */}
      {showQuickVendor && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
            <button type="button" onClick={() => setShowQuickVendor(false)} className="p-3 bg-gray-50 text-gray-400 hover:text-emerald-600 rounded-2xl transition-all active:scale-90">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Add New Vendor</h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Vendor Master Registration</p>
            </div>
          </div>

          <form onSubmit={handleQuickVendor} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor Name *</label>
                <input required value={quickVendorForm.vendorName} onChange={e => setQuickVendorForm({ ...quickVendorForm, vendorName: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Mobile Number *</label>
                <input required value={quickVendorForm.mobile} onChange={e => setQuickVendorForm({ ...quickVendorForm, mobile: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Email Address</label>
                <input type="email" value={quickVendorForm.email} onChange={e => setQuickVendorForm({ ...quickVendorForm, email: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Contact Person</label>
                <input value={quickVendorForm.contactPerson} onChange={e => setQuickVendorForm({ ...quickVendorForm, contactPerson: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">GST Number</label>
                <input value={quickVendorForm.gstNumber} onChange={e => setQuickVendorForm({ ...quickVendorForm, gstNumber: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Credit Days</label>
                <input type="number" value={quickVendorForm.creditDays} onChange={e => setQuickVendorForm({ ...quickVendorForm, creditDays: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Opening Balance (₹)</label>
                <input type="number" value={quickVendorForm.openingBalance} onChange={e => setQuickVendorForm({ ...quickVendorForm, openingBalance: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
              </div>
              <div className="col-span-1 md:col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Business Address</label>
                <textarea rows="3" value={quickVendorForm.address} onChange={e => setQuickVendorForm({ ...quickVendorForm, address: e.target.value })} 
                  className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner resize-none" />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setShowQuickVendor(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">Cancel</button>
              <button className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Register Vendor</button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Product Form (Inline) */}
      {showQuickProduct && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-4 border-b border-gray-100 pb-6">
            <button type="button" onClick={() => setShowQuickProduct(false)} className="p-3 bg-gray-50 text-gray-400 hover:text-emerald-600 rounded-2xl transition-all active:scale-90">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Full Item Creation</h3>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Master Inventory Entry</p>
            </div>
          </div>

          <form onSubmit={handleQuickProduct} className="space-y-10">
            {/* Basic Information */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-emerald-500 pl-3">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Product Name *</label>
                  <input placeholder="Enter product name" required value={quickProductForm.name} onChange={e => setQuickProductForm({ ...quickProductForm, name: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">SKU Code</label>
                  <input placeholder="Internal identifier" value={quickProductForm.skuCode} onChange={e => setQuickProductForm({ ...quickProductForm, skuCode: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Barcode (EAN/UPC)</label>
                  <div className="flex gap-2">
                    <input placeholder="Scan or type barcode" value={quickProductForm.barcode} onChange={e => setQuickProductForm({ ...quickProductForm, barcode: e.target.value })} 
                      className="flex-1 bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                    <button type="button" onClick={() => setShowScanner(true)} className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-emerald-100 transition-all">
                      <ScanBarcode size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Classification */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-blue-500 pl-3">Classification</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Category *</label>
                  <select required value={quickProductForm.categoryId} onChange={e => setQuickProductForm({ ...quickProductForm, categoryId: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                    <option value="default">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Sub-Category</label>
                  <select value={quickProductForm.subCategoryId} onChange={e => setQuickProductForm({ ...quickProductForm, subCategoryId: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                    <option value="default">Select Sub-Category</option>
                    {subCategories.filter(sc => sc.categoryId === quickProductForm.categoryId).map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Pricing & Tax */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-purple-500 pl-3">Pricing & Tax</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">MRP (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={quickProductForm.mrp} onChange={e => setQuickProductForm({ ...quickProductForm, mrp: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Purchase Price (₹)</label>
                  <input type="number" step="0.01" placeholder="0.00" value={quickProductForm.purchasePrice} onChange={e => setQuickProductForm({ ...quickProductForm, purchasePrice: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Selling Price *</label>
                  <input type="number" step="0.01" placeholder="0.00" required value={quickProductForm.price} onChange={e => setQuickProductForm({ ...quickProductForm, price: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">GST (%)</label>
                  <select value={quickProductForm.gst} onChange={e => setQuickProductForm({ ...quickProductForm, gst: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    {taxSlabs.map(s => <option key={s} value={s}>{s}%</option>)}
                  </select>
                </div>
              </div>
            </section>

            {/* Units & Initial Stock */}
            <section className="space-y-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-l-4 border-amber-500 pl-3">Units & Initial Stock</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Unit Type</label>
                  <select value={quickProductForm.unitId} onChange={e => setQuickProductForm({ ...quickProductForm, unitId: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 outline-none transition-all shadow-inner">
                    <option value="">Select Unit</option>
                    {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Unit Value</label>
                  <input placeholder="e.g. 500" value={quickProductForm.unitValue} onChange={e => setQuickProductForm({ ...quickProductForm, unitValue: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Opening Stock (In Store)</label>
                  <input type="number" placeholder="0" value={quickProductForm.stock} onChange={e => setQuickProductForm({ ...quickProductForm, stock: e.target.value })} 
                    className="w-full bg-gray-50 rounded-2xl px-5 py-4 text-sm font-bold border border-transparent focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner" />
                </div>
              </div>
            </section>

            <div className="flex gap-4 pt-6 border-t border-gray-100">
              <button type="button" onClick={() => setShowQuickProduct(false)} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 rounded-2xl transition-all">Cancel</button>
              <button className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all">Create Master Item</button>
            </div>
          </form>
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
