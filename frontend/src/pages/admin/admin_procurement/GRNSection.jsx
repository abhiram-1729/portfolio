import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, X, ChevronRight, Loader2, Trash2, History, PackageCheck, Edit3, FileText, Upload, 
  Paperclip, File, Trash, CheckCircle2, ShoppingCart, MapPin, ShieldCheck, Package, 
  AlertTriangle, MinusCircle, Timer, MessageSquare, FileX, Printer, Download, ShieldCheck as ShieldCheckIcon,
  Users, Plus, Phone, Mail, User, Clock, DollarSign, Building2, Tag, ToggleLeft, ToggleRight,
  ShieldAlert, CreditCard, Hash, ChevronLeft
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import { productsAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

// Strip [PO_METADATA]:... suffix from PO remarks before display
const cleanRemarks = (remarks) => {
  if (!remarks) return '';
  return remarks.replace(/\n?\[PO_METADATA\][:\s][\s\S]*$/g, '').trim();
};

const GRNSection = ({ can, storeId, setHideMainHeader }) => {
  const [searchParams] = useSearchParams();
  const [view, setView] = useState('receive'); // 'receive', 'history', 'report', 'create-selection', 'create-direct', 'create-po'
  const [pos, setPOs] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [grnItems, setGRNItems] = useState([]);
  const [directGRNData, setDirectGRNData] = useState({
    vendorId: '',
    purchaseDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    receivedBy: '',
    notes: '',
  });
  const [directItems, setDirectItems] = useState([
    { id: Date.now(), productId: '', qty: '', unit: 'KG', price: '', total: 0, damaged: '', expiry: '' }
  ]);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [newVendor, setNewVendor] = useState({
    vendorName: '', mobile: '', email: '', address: '',
    gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
    paymentTerms: 'Net 30', creditLimit: '0',
    bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
    vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
  });
  const [activeVendorTab, setActiveVendorTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editGRN, setEditGRN] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [poData, grnData, vendorData, userData, productData] = await Promise.all([
        procurementAPI.getPurchaseOrders({ storeId }),
        procurementAPI.getGRNs({ storeId }),
        procurementAPI.getVendors({ storeId }),
        adminAPI.getUsers({ storeId }),
        productsAPI.getAll({ storeId })
      ]);
      setPOs((poData.data || poData).filter(po => po.status === 'APPROVED' || po.status === 'ORDERED' || po.status === 'PARTIAL'));
      setGRNs(grnData.data || grnData);
      setVendors(vendorData.data || vendorData);
      setUsers(userData.data || userData);
      setProducts(productData.data || productData);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    const searchTerm = searchParams.get('search');
    if (searchTerm && view !== 'report') {
      setView('history');
    }
  }, [searchParams, view]);

  const handleViewReport = (grn) => {
    if (!grn) return;
    setSelectedReport(grn);
    setView('report');
    if (setHideMainHeader) setHideMainHeader(true);
  };

  const handlePrintReport = (grn) => {
    setSelectedReport(grn);
    setView('report');
    setHideMainHeader?.(true);
    setTimeout(() => window.print(), 200);
  };

  const selectPO = async (poId) => {
    try {
      const { data } = await procurementAPI.getPurchaseOrderById(poId);
      setSelectedPO(poId);
      setPODetail(data);
      setGRNItems(data.items.map(item => ({
        productId: item.productId,
        name: item.product?.name,
        sku: item.product?.skuCode,
        weight: item.product?.unitValue ? `${item.product.unitValue} ${item.product.unit?.name || 'kg'}` : '1 kg',
        orderedQty: item.quantity,
        alreadyReceived: item.receivedQty || 0,
        balance: item.quantity - (item.receivedQty || 0),
        receivedQty: item.quantity - (item.receivedQty || 0),
        damagedQty: 0,
        expiryStatus: 'SAFE'
      })));
      setView('create-po');
    } catch { toast.error('Failed to load PO details'); }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('folder', 'grn_attachments');

    try {
      setUploading(true);
      const { data } = await adminAPI.uploadProductImage(formData);
      setAttachments(prev => [...prev, { name: file.name, url: data.url }]);
      toast.success('File uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmitGRN = async () => {
    const items = grnItems.filter(i => parseInt(i.receivedQty) > 0);
    if (items.length === 0) return toast.error('Enter received quantities');
    setSubmitting(true);
    try {
      if (editGRN) {
        await procurementAPI.updateGRN(editGRN.id, {
          challanId: poDetail.challanId,
          remarks: poDetail.remarks,
          items: items.map(i => ({
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: parseInt(i.receivedQty),
            damagedQty: parseInt(i.damagedQty) || 0,
            missingQty: Math.max(0, i.balance - (parseInt(i.receivedQty) || 0) - (parseInt(i.damagedQty) || 0)),
            expiryStatus: i.expiryStatus
          })),
          attachments: attachments.map(a => a.url)
        });
        toast.success('Goods receipt updated');
      } else {
        await procurementAPI.createGRN({
          poId: selectedPO,
          challanId: poDetail.challanId,
          remarks: poDetail.remarks,
          items: items.map(i => ({
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: parseInt(i.receivedQty),
            damagedQty: parseInt(i.damagedQty) || 0,
            missingQty: Math.max(0, i.balance - (parseInt(i.receivedQty) || 0) - (parseInt(i.damagedQty) || 0)),
            expiryStatus: i.expiryStatus
          })),
          attachments: attachments.map(a => a.url)
        });
        toast.success('Goods received successfully');
      }
      setSelectedPO(null);
      setPODetail(null);
      setEditGRN(null);
      setAttachments([]);
      loadData();
      setView('history');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing GRN');
    }
    finally { setSubmitting(false); }
  };

  const handleEditGRN = (grn) => {
    setEditGRN(grn);
    setSelectedPO(grn.poId);
    setPODetail(grn.po);
    setGRNItems(grn.items.map(item => ({
      productId: item.productId,
      name: item.product?.name,
      orderedQty: item.orderedQty,
      alreadyReceived: 0,
      balance: item.orderedQty,
      receivedQty: String(item.receivedQty),
      damagedQty: item.damagedQty || 0,
      expiryStatus: item.expiryStatus || 'SAFE'
    })));
    setAttachments((grn.attachments || []).map(url => ({ name: url.split('/').pop(), url })));
    setView('create-po');
  };

  const handleDeleteGRN = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Goods Receipt? This will revert stock increases.')) return;
    try {
      await procurementAPI.deleteGRN(id);
      toast.success('Goods receipt deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting GRN');
    }
  };

  const handleApproveQC = async (grn) => {
    if (!window.confirm(`Are you sure you want to approve all items for GRN-${grn.displayId} (Bypassing QC)?`)) return;
    try {
      const pendingItems = (grn.items || []).filter(item => item.qcStatus === 'PENDING');
      if (pendingItems.length === 0) {
        toast.error('No pending items to approve on this GRN.');
        return;
      }
      
      // Approve each pending item
      for (const item of pendingItems) {
        await procurementAPI.updateQCStatus(item.id, { status: 'APPROVED', remarks: 'Bulk Approved (QC Bypassed)' });
      }
      
      toast.success(`Successfully approved QC for all items in GRN-${grn.displayId}`);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error approving QC');
    }
  };

  const handleCreateDirectGRN = async () => {
    if (!directGRNData.vendorId) return toast.error('Select a vendor');
    const items = directItems.filter(i => i.productId && parseInt(i.qty) > 0);
    if (items.length === 0) return toast.error('Add at least one item with valid quantity');
    
    setSubmitting(true);
    try {
      // 1. Auto-create a Purchase Order for this direct receipt
      const poRes = await procurementAPI.createPurchaseOrder({
        vendorId: directGRNData.vendorId,
        poDate: directGRNData.purchaseDate,
        expectedDelivery: directGRNData.purchaseDate,
        remarks: `Direct GRN: ${directGRNData.notes}`,
        isDirectGRN: true,
        items: items.map(i => ({
          productId: i.productId,
          quantity: parseInt(i.qty),
          rate: parseFloat(i.price) || 0
        }))
      });

      const newPOId = poRes.data.po.id;

      // 2. Create the GRN against the auto-created PO
      await procurementAPI.createGRN({
        poId: newPOId,
        remarks: directGRNData.notes,
        items: items.map(i => ({
          productId: i.productId,
          orderedQty: parseInt(i.qty),
          receivedQty: parseInt(i.qty),
          damagedQty: 0,
          missingQty: 0,
          expiryStatus: 'SAFE'
        }))
      });

      toast.success('Direct GRN recorded successfully (Pending QC)');
      setDirectGRNData({
        vendorId: '',
        purchaseDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        receivedBy: '',
        notes: '',
      });
      setDirectItems([{ id: Date.now(), productId: '', qty: '', unit: 'KG', price: '', total: 0, damaged: '', expiry: '' }]);
      setView('history');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create Direct GRN');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenVendorModal = () => {
    setActiveVendorTab('general');
    setNewVendor({
      vendorName: '', mobile: '', email: '', address: '',
      gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
      paymentTerms: 'Net 30', creditLimit: '0',
      bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
      vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
    });
    setShowVendorModal(true);
  };

  const nextVendorTab = () => {
    const sequence = ['general', 'commercial', 'regulation', 'settlement'];
    const idx = sequence.indexOf(activeVendorTab);
    if (idx < sequence.length - 1) {
      setActiveVendorTab(sequence[idx + 1]);
    }
  };

  const prevVendorTab = () => {
    const sequence = ['general', 'commercial', 'regulation', 'settlement'];
    const idx = sequence.indexOf(activeVendorTab);
    if (idx > 0) {
      setActiveVendorTab(sequence[idx - 1]);
    }
  };

  const isVendorTabIncomplete = (tabId) => {
    if (tabId === 'regulation') {
      return newVendor.isTaxable && (!newVendor.gstNumber || newVendor.gstNumber.trim().length !== 15);
    }
    return false;
  };

  const handleAddVendor = async (e) => {
    if (e) e.preventDefault();

    if (!newVendor.vendorName || !newVendor.mobile) {
      setActiveVendorTab('general');
      return toast.error('Vendor name and mobile are required');
    }

    if (newVendor.isTaxable && (!newVendor.gstNumber || !newVendor.gstNumber.trim())) {
      setActiveVendorTab('regulation');
      toast.error('GST Identification Number is mandatory for taxable vendors.');
      return;
    }

    if (newVendor.gstNumber && newVendor.gstNumber.trim() && newVendor.gstNumber.trim().length !== 15) {
      setActiveVendorTab('regulation');
      toast.error('GST Identification Number must be exactly 15 characters.');
      return;
    }

    try {
      const { data } = await procurementAPI.createVendor({ ...newVendor, storeId });
      setVendors(prev => [data, ...prev]);
      setDirectGRNData(prev => ({ ...prev, vendorId: data.id }));
      setShowVendorModal(false);
      toast.success('Vendor onboarded successfully');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to onboard vendor');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
      {/* View Toggle */}
      {view !== 'report' && !view.startsWith('create-') && (
        <div className="flex items-center justify-between w-full">
          <div className="flex gap-4 p-1 rounded-2xl w-fit">
            <button 
              onClick={() => { setView('receive'); setSelectedPO(null); }} 
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === 'receive' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'text-gray-400 hover:text-gray-600 bg-gray-50'
              }`}
            >
              Receive Goods
            </button>
            <button 
              onClick={() => setView('history')} 
              className={`flex items-center gap-2 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                view === 'history' 
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
                  : 'text-gray-400 hover:text-gray-600 bg-gray-50'
              }`}
            >
              GRN History
            </button>
          </div>
          <button
            onClick={() => setView('create-selection')}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
          >
            Create GRN
          </button>
        </div>
      )}

      {view === 'create-selection' && (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center mb-12 space-y-3">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">Create Goods Receipt Note</h1>
            <p className="text-sm font-bold text-gray-400">Choose the type of GRN to create.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-8 w-full max-w-4xl px-8">
            <button
              onClick={() => setView('create-po')}
              className="flex-1 flex flex-col items-center p-12 bg-white border border-gray-200 rounded-[2.5rem] hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-600/10 transition-all group w-full"
            >
              <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <FileText size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tighter uppercase">PO-Based GRN</h3>
              <p className="text-sm font-bold text-gray-400 text-center">Create GRN against approved Purchase Orders.</p>
            </button>
            <button
              onClick={() => setView('create-direct')}
              className="flex-1 flex flex-col items-center p-12 bg-white border border-gray-200 rounded-[2.5rem] hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-600/10 transition-all group w-full"
            >
              <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <ShoppingCart size={40} strokeWidth={1.5} />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-3 tracking-tighter uppercase">Direct GRN</h3>
              <p className="text-sm font-bold text-gray-400 text-center">Create GRN for direct market purchases.</p>
            </button>
          </div>
        </div>
      )}

      {view === 'create-direct' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col gap-6">
            <button
              onClick={() => setView('create-selection')}
              className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-emerald-600 uppercase tracking-widest hover:translate-x-[-4px] transition-all w-fit"
            >
              <ChevronRight size={14} className="rotate-180" strokeWidth={3} />
              Back to Type Selection
            </button>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">CREATE DIRECT GRN</h2>
              <p className="text-sm font-bold text-gray-400">Record stock purchased directly from vendors or local markets.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Basic Details Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Basic Details</h3>
                <button 
                  onClick={handleOpenVendorModal}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                >
                  + Add New Vendor
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Vendor <span className="text-rose-500">*</span></label>
                    <select 
                      value={directGRNData.vendorId}
                      onChange={e => setDirectGRNData(prev => ({ ...prev, vendorId: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Select a vendor</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.vendorName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Received By <span className="text-rose-500">*</span></label>
                    <select 
                      value={directGRNData.receivedBy}
                      onChange={e => setDirectGRNData(prev => ({ ...prev, receivedBy: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Select a user</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Purchase Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={directGRNData.purchaseDate}
                      onChange={e => setDirectGRNData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Verification Notes</label>
                    <textarea 
                      placeholder="Add purchase or verification remarks..."
                      value={directGRNData.notes}
                      onChange={e => setDirectGRNData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full h-24 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder:text-gray-400"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Items</h3>
                <button 
                  onClick={() => setDirectItems(prev => [...prev, { id: Date.now(), name: '', qty: '', unit: 'KG', price: '', total: 0, damaged: '', expiry: '' }])}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all"
                >
                  + Add Item
                </button>
              </div>
              <div className="overflow-x-auto custom-scrollbar w-full">
                <table className="w-full text-left min-w-[800px]">
                  <thead>
                    <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 whitespace-nowrap">
                      <th className="px-2 py-3 w-[25%]">Item Name</th>
                      <th className="px-2 py-3 w-[10%]">Quantity</th>
                      <th className="px-2 py-3 w-[10%]">Unit</th>
                      <th className="px-2 py-3 w-[15%]">Unit Price (₹)</th>
                      <th className="px-2 py-3 w-[15%]">Total Price (₹)</th>
                      <th className="px-2 py-3 w-[10%]">Damaged Qty</th>
                      <th className="px-2 py-3 w-[10%]">Expiry Date</th>
                      <th className="px-2 py-3 w-[5%] text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {directItems.map((item, idx) => (
                      <tr key={item.id}>
                        <td className="px-2 py-3">
                          <select 
                            value={item.productId}
                            onChange={e => {
                              const updated = [...directItems];
                              const prod = products.find(p => p.id === e.target.value);
                              updated[idx].productId = e.target.value;
                              updated[idx].name = prod ? prod.name : '';
                              updated[idx].unit = prod && prod.unit ? prod.unit.name : 'KG';
                              setDirectItems(updated);
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          >
                            <option value="">Select a product</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} {p.skuCode ? `(${p.skuCode})` : ''}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-2 py-3">
                          <input 
                            type="number" 
                            value={item.qty}
                            onChange={e => {
                              const updated = [...directItems];
                              updated[idx].qty = e.target.value;
                              updated[idx].total = (parseFloat(e.target.value) || 0) * (parseFloat(updated[idx].price) || 0);
                              setDirectItems(updated);
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <select 
                            value={item.unit}
                            onChange={e => {
                              const updated = [...directItems];
                              updated[idx].unit = e.target.value;
                              setDirectItems(updated);
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          >
                            <option value="KG">KG</option>
                            <option value="LTR">LTR</option>
                            <option value="PCS">PCS</option>
                            <option value="BOX">BOX</option>
                          </select>
                        </td>
                        <td className="px-2 py-3">
                          <input 
                            type="number" 
                            value={item.price}
                            onChange={e => {
                              const updated = [...directItems];
                              updated[idx].price = e.target.value;
                              updated[idx].total = (parseFloat(e.target.value) || 0) * (parseFloat(updated[idx].qty) || 0);
                              setDirectItems(updated);
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <div className="w-full bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs font-black text-gray-900 text-center">
                            {item.total?.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <input 
                            type="number" 
                            value={item.damaged}
                            onChange={e => {
                              const updated = [...directItems];
                              updated[idx].damaged = e.target.value;
                              setDirectItems(updated);
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3">
                          <input 
                            type="date" 
                            value={item.expiry}
                            onChange={e => {
                              const updated = [...directItems];
                              updated[idx].expiry = e.target.value;
                              setDirectItems(updated);
                            }}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none"
                          />
                        </td>
                        <td className="px-2 py-3 text-center">
                          <button 
                            onClick={() => setDirectItems(prev => prev.filter((_, i) => i !== idx))}
                            className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Attachments Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Attachments</h3>
              <div className="flex flex-wrap gap-3">
                {['Market Bills', 'Invoice', 'Delivery Images'].map(label => (
                  <button
                    key={label}
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-6 py-3 bg-white border border-dashed border-gray-200 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm disabled:opacity-50"
                  >
                    <Upload size={14} className="opacity-50" />
                    {label}
                  </button>
                ))}
              </div>
              {attachments.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl group">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="p-2 bg-white rounded-lg text-emerald-600">
                          <File size={14} />
                        </div>
                        <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{file.name}</span>
                      </div>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="p-2 text-gray-300 hover:text-rose-500 transition-all"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <button 
                onClick={() => setView('create-selection')}
                className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm"
              >
                Cancel
              </button>
              <button className="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                Save Draft
              </button>
              <button 
                onClick={handleCreateDirectGRN}
                disabled={submitting}
                className="px-10 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create GRN'}
              </button>
            </div>
          </div>
        </div>
      )}

      {view === 'receive' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-6">
          {pos.length === 0 ? (
                <div className="p-20 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                  <Truck size={64} className="mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
                  <h3 className="text-xl font-black text-gray-300 uppercase tracking-tighter">No Open Purchase Orders</h3>
                  <p className="text-sm font-bold text-gray-400 mt-2">All orders have been received or closed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-left table-auto">
                    <thead>
                      <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 whitespace-nowrap">
                        <th className="px-4 py-4">PO Details</th>
                        <th className="px-4 py-4">Vendor</th>
                        <th className="px-4 py-4">ETA / Delivery Date</th>
                        <th className="px-4 py-4 text-center">Items</th>
                        <th className="px-4 py-4 text-center">Delivery Status</th>
                        <th className="px-4 py-4 text-center">Verification Status</th>
                        <th className="px-4 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pos.map(po => (
                        <tr
                          key={po.id}
                          className="group hover:bg-emerald-50/30 transition-all cursor-pointer border-b border-gray-50 last:border-0"
                        >
                          <td className="px-4 py-4" onClick={() => selectPO(po.id)}>
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight truncate max-w-[120px]">
                                PO-{po.displayId}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400">₹{po.totalAmount?.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900 tracking-tight truncate max-w-[150px]">{po.vendor?.vendorName}</span>
                              <span className="text-[9px] font-bold text-gray-400">{po.vendor?.phone || '+91 XXXXX XXXXX'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-xs font-black text-gray-900 tracking-tight">
                                {format(new Date(po.poDate), 'yyyy-MM-dd')}
                              </span>
                              <span className="text-[9px] font-bold text-gray-400 uppercase">
                                {format(new Date(po.poDate), 'hh:mm a')}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="inline-flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                              <PackageCheck size={12} className="text-gray-400" />
                              <span className="text-[10px] font-black text-gray-900">{po.items?.length || 0}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className={`text-[9px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${po.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : po.status === 'ORDERED'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                              {po.status === 'ORDERED' ? 'Arrived' : po.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="text-[9px] font-black px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full uppercase tracking-widest">
                              Pending
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => selectPO(po.id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
                            >
                              Receive
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
        </div>
      )}

      {view === 'create-po' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex flex-col gap-6">
            <button
              onClick={() => { setSelectedPO(null); setPODetail(null); setEditGRN(null); setView('create-selection'); }}
              className="flex items-center gap-2 text-[10px] font-black text-gray-400 hover:text-emerald-600 uppercase tracking-widest hover:translate-x-[-4px] transition-all w-fit"
            >
              <ChevronRight size={14} className="rotate-180" strokeWidth={3} />
              Back to Type Selection
            </button>
            <div className="space-y-1">
              <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">CREATE PO-BASED GRN</h2>
              <p className="text-sm font-bold text-gray-400">Record received stock against approved purchase orders.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Basic Details Card */}
            <div className="bg-white border border-gray-100 rounded-3xl p-6">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6">Basic Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Linked PO <span className="text-rose-500">*</span></label>
                    <select 
                      value={selectedPO || ''}
                      onChange={e => e.target.value ? selectPO(e.target.value) : setSelectedPO(null)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Select a purchase order</option>
                      {pos.map(po => (
                        <option key={po.id} value={po.id}>PO-{po.displayId} ({po.vendor?.vendorName})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Vendor</label>
                    <input 
                      type="text" 
                      readOnly
                      value={poDetail?.vendor?.vendorName || 'Auto-filled from PO'}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 outline-none text-gray-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Received By <span className="text-rose-500">*</span></label>
                    <select 
                      value={directGRNData.receivedBy}
                      onChange={e => setDirectGRNData(prev => ({ ...prev, receivedBy: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="">Select a user</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Delivery Date & Time</label>
                    <input 
                      type="datetime-local" 
                      value={directGRNData.purchaseDate}
                      onChange={e => setDirectGRNData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Challan / Invoice No</label>
                      <input 
                        type="text"
                        placeholder="CH-2024-XXXX"
                        value={poDetail?.challanId || ''}
                        onChange={(e) => setPODetail({ ...poDetail, challanId: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 outline-none placeholder:text-gray-400"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Verification Status</label>
                    <div className="px-4 py-3 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-xs font-bold uppercase tracking-widest text-center">
                      Pending Verification
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedPO && (
              <div className="bg-white border border-gray-100 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Items Verification</h3>
                </div>
                {/* Items Table */}
              <div className="overflow-x-auto custom-scrollbar w-full">
                <table className="w-max min-w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 whitespace-nowrap">
                      <th className="px-3 py-4">Item</th>
                      <th className="px-3 py-4 text-center">Ordered</th>
                      <th className="px-3 py-4 text-center">Already RCVD</th>
                      <th className="px-3 py-4 text-center">Balance</th>
                      <th className="px-3 py-4 text-center">Receive Now</th>
                      <th className="px-3 py-4 text-center">Damaged</th>
                      <th className="px-3 py-4 text-center">Expiry Check</th>
                      <th className="px-3 py-4 text-center text-rose-500">Missing</th>
                      <th className="px-3 py-4 text-right whitespace-nowrap sticky right-0 bg-white z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {grnItems.map((item, idx) => {
                      const missing = Math.max(0, item.balance - (parseInt(item.receivedQty) || 0) - (parseInt(item.damagedQty) || 0));
                      return (
                        <tr key={item.productId} className="group">
                          <td className="px-3 py-6">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 tracking-tight">{item.name}</span>
                              <span className="text-[10px] font-bold text-gray-400">SKU: {item.sku || 'N/A'}</span>
                              <span className="text-[10px] font-bold text-gray-400">{item.weight || '1 kg'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-6 text-center text-sm font-black text-gray-900">{item.orderedQty}</td>
                          <td className="px-3 py-6 text-center text-sm font-black text-gray-400">{item.alreadyReceived}</td>
                          <td className="px-3 py-6 text-center text-sm font-black text-gray-900">{item.balance}</td>
                          <td className="px-3 py-6">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  const updated = [...grnItems];
                                  updated[idx].receivedQty = Math.max(0, (parseInt(updated[idx].receivedQty) || 0) - 1);
                                  setGRNItems(updated);
                                }}
                                className="w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              >-</button>
                              <input
                                type="number"
                                value={item.receivedQty}
                                onChange={e => {
                                  const updated = [...grnItems];
                                  updated[idx].receivedQty = e.target.value;
                                  setGRNItems(updated);
                                }}
                                className="w-16 bg-white border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-black text-center focus:ring-1 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => {
                                  const updated = [...grnItems];
                                  updated[idx].receivedQty = Math.min(item.balance, (parseInt(updated[idx].receivedQty) || 0) + 1);
                                  setGRNItems(updated);
                                }}
                                className="w-8 h-8 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                              >+</button>
                            </div>
                          </td>
                          <td className="px-3 py-6">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                value={item.damagedQty || 0}
                                onChange={e => {
                                  const updated = [...grnItems];
                                  updated[idx].damagedQty = e.target.value;
                                  setGRNItems(updated);
                                }}
                                className="w-16 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1.5 text-xs font-black text-center focus:ring-1 focus:ring-emerald-500"
                              />
                            </div>
                          </td>
                          <td className="px-3 py-6">
                            <div className="flex items-center justify-center gap-1">
                              {['Safe', 'Near', 'Expired'].map(status => (
                                <button
                                  key={status}
                                  onClick={() => {
                                    const updated = [...grnItems];
                                    updated[idx].expiryStatus = status.toUpperCase();
                                    setGRNItems(updated);
                                  }}
                                  className={`px-2 py-1 rounded-md text-[8px] font-black uppercase transition-all ${item.expiryStatus === status.toUpperCase()
                                      ? status === 'Safe' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                        : status === 'Near' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                                          : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                                      : 'bg-gray-50 text-gray-400 hover:bg-gray-100'
                                    }`}
                                >
                                  {status}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-6 text-center">
                            <span className={`text-sm font-black ${missing > 0 ? 'text-rose-500' : 'text-gray-300'}`}>{missing}</span>
                          </td>
                          <td className="px-3 py-6 text-right sticky right-0 bg-white group-hover:bg-gray-50 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">
                            <span className="text-[10px] font-black px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full uppercase tracking-widest">
                              Accepted
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Notes & Attachments */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-gray-50">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Notes</label>
                  <textarea
                    placeholder="Add any remarks about the delivery..."
                    value={cleanRemarks(poDetail?.remarks)}
                    onChange={(e) => setPODetail({ ...poDetail, remarks: e.target.value })}
                    className="w-full h-32 bg-gray-50 border border-gray-100 rounded-[1.5rem] p-4 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-emerald-500 outline-none placeholder:text-gray-300 resize-none"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Attachments</label>
                    {uploading && <Loader2 className="animate-spin text-emerald-600" size={14} />}
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                    accept="image/*,.pdf,.doc,.docx"
                  />

                  <div className="flex flex-wrap gap-3">
                    {['Invoice', 'Challan', 'Photos'].map(label => (
                      <button
                        key={label}
                        onClick={() => fileInputRef.current.click()}
                        disabled={uploading}
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm disabled:opacity-50"
                      >
                        <Upload size={14} className="opacity-40" />
                        {label}
                      </button>
                    ))}
                  </div>

                  {attachments.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 mt-4">
                      {attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl group">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-white rounded-lg text-emerald-600">
                              <File size={14} />
                            </div>
                            <span className="text-[10px] font-black text-gray-900 truncate uppercase tracking-tight">{file.name}</span>
                          </div>
                          <button
                            onClick={() => removeAttachment(idx)}
                            className="p-2 text-gray-300 hover:text-rose-500 transition-all"
                          >
                            <Trash size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Totals & Actions */}
              <div className="bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex flex-wrap items-center gap-12">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Received</span>
                      <span className="text-2xl font-black text-emerald-600">{grnItems.reduce((acc, curr) => acc + (parseInt(curr.receivedQty) || 0), 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Damaged</span>
                      <span className="text-2xl font-black text-rose-500">{grnItems.reduce((acc, curr) => acc + (parseInt(curr.damagedQty) || 0), 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Missing</span>
                      <span className="text-2xl font-black text-amber-500">{grnItems.reduce((acc, curr) => acc + Math.max(0, curr.balance - (parseInt(curr.receivedQty) || 0) - (parseInt(curr.damagedQty) || 0)), 0)}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accepted Items</span>
                      <span className="text-2xl font-black text-gray-900">{grnItems.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none px-8 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                      Save Draft
                    </button>
                    <button
                      onClick={handleSubmitGRN}
                      disabled={submitting}
                      className="flex-1 md:flex-none px-12 py-4 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
                    >
                      {submitting ? 'Processing...' : 'Complete GRN'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-6">
          {grns.length === 0 ? (
            <div className="p-20 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
              <History size={64} className="mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-black text-gray-300 uppercase tracking-tighter">No Receipt History</h3>
              <p className="text-sm font-bold text-gray-400 mt-2">Historical records of received goods will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left table-auto">
                <thead>
                  <tr className="text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 whitespace-nowrap">
                    <th className="px-4 py-4">GRN ID</th>
                    <th className="px-4 py-4">Related PO</th>
                    <th className="px-4 py-4">Vendor</th>
                    <th className="px-4 py-4">Date & Time</th>
                    <th className="px-4 py-4">Verification</th>
                    <th className="px-4 py-4 text-center">Alerts</th>
                    <th className="px-4 py-4 text-center">Accepted Qty</th>
                    <th className="px-4 py-4 text-center">Status</th>
                    <th className="px-4 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grns.filter(grn => {
                    const searchTerm = searchParams.get('search')?.toLowerCase();
                    if (!searchTerm) return true;
                    
                    const grnId = `GRN-${grn.displayId}`.toLowerCase();
                    const poId = `PO-${grn.po?.displayId}`.toLowerCase();
                    const vendor = grn.po?.vendor?.vendorName?.toLowerCase() || '';
                    
                    return (
                      grnId.includes(searchTerm) ||
                      poId.includes(searchTerm) ||
                      vendor.includes(searchTerm) ||
                      grn.displayId?.toString().toLowerCase().includes(searchTerm) ||
                      grn.po?.displayId?.toString().toLowerCase().includes(searchTerm)
                    );
                  }).map(grn => {
                    const items = grn.items || [];
                    const totalDamaged = items.reduce((acc, i) => acc + (i.damagedQty || 0), 0);
                    const totalMissing = items.reduce((acc, i) => acc + (i.missingQty || 0), 0);
                    const totalDiscrepancies = totalDamaged + totalMissing;
                    const totalAccepted = items.reduce((acc, i) => acc + (i.receivedQty || 0) - (i.damagedQty || 0), 0);
                    const isFullyAccepted = totalDiscrepancies === 0;

                    return (
                      <tr key={grn.id} className="group hover:bg-gray-50/50 transition-all border-b border-gray-50 last:border-0">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-xs font-black text-gray-900 uppercase tracking-tight">GRN-{grn.displayId}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-bold text-gray-500 uppercase">PO-{grn.po?.displayId}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs font-black text-gray-900 tracking-tight truncate max-w-[150px] block">{grn.po?.vendor?.vendorName}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="text-[10px] font-black text-gray-900 tracking-tight">{format(new Date(grn.createdAt), 'dd MMM yy, hh:mm a')}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-[9px] font-black uppercase tracking-tight px-2 py-0.5 rounded ${isFullyAccepted ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                            {isFullyAccepted ? 'Fully Accepted' : 'Partial'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center whitespace-nowrap">
                          {totalDiscrepancies > 0 ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded text-[8px] font-black border border-rose-100 uppercase">
                              {totalDiscrepancies} Issue
                            </span>
                          ) : (
                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">None</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs font-black text-gray-900">{totalAccepted}</span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border tracking-widest ${grn.status === 'COMPLETE'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {grn.status === 'COMPLETE' ? 'Completed' : 'Partial'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1.5 items-center">
                            {grn.items?.some(item => item.qcStatus === 'PENDING') && (
                              <button
                                onClick={() => handleApproveQC(grn)}
                                className="px-2.5 py-1.5 bg-emerald-600 border border-emerald-600 rounded text-[8px] font-black text-white uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-sm active:scale-95 flex items-center gap-1"
                                title="Approve Quality Control for all items"
                              >
                                Approve QC
                              </button>
                            )}
                            <button
                              onClick={() => handleViewReport(grn)}
                              className="px-2.5 py-1.5 bg-white border border-gray-100 rounded text-[8px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handlePrintReport(grn)}
                              className="px-2.5 py-1.5 bg-white border border-gray-100 rounded text-[8px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                            >
                              PDF
                            </button>
                            {can('PROCUREMENT', 'DELETE', 'GRN') && (
                              <button
                                onClick={() => handleDeleteGRN(grn.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-600 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === 'report' && selectedReport && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-10 space-y-10 animate-in fade-in duration-500">
          
          {/* Top Navigation */}
          <button 
            onClick={() => { setView('history'); setSelectedReport(null); setHideMainHeader?.(false); }}
            className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-all group"
          >
            <ChevronRight size={18} className="rotate-180 group-hover:-translate-x-1 transition-transform" />
            Back to GRN History
          </button>

          {/* Title Section */}
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-gray-900">GRN Report</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
              <span>Procurement</span>
              <span>→</span>
              <span>Goods Receipt</span>
              <span>→</span>
              <span className="text-gray-500">Report</span>
            </div>
          </div>

          {/* Main Info Card */}
          <div className="bg-gray-50/30 rounded-3xl border border-gray-100 p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10 gap-x-12">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">GRN ID</span>
                <p className="text-base font-bold text-gray-900 uppercase">GRN-{selectedReport.displayId || 'N/A'}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Related PO</span>
                <p className="text-base font-bold text-gray-900 uppercase">PO-{selectedReport.po?.displayId || 'N/A'}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vendor</span>
                <p className="text-base font-bold text-gray-900 uppercase">{selectedReport.po?.vendor?.vendorName || 'N/A'}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Branch</span>
                <p className="text-base font-bold text-gray-900 uppercase">{selectedReport.store?.name || 'Main Store'}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Delivery Date & Time</span>
                <p className="text-base font-bold text-gray-900 uppercase">{format(new Date(selectedReport.createdAt), 'yyyy-MM-dd hh:mm a')}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Approval Status</span>
                <div>
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-xs font-bold uppercase tracking-wider">
                    <CheckCircle2 size={14} /> Approved
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Total Items', value: selectedReport.items?.length || 0, bg: 'bg-gray-50', text: 'text-gray-900' },
              { label: 'Accepted', value: selectedReport.items?.reduce((acc, i) => acc + (i.receivedQty || 0) - (i.damagedQty || 0), 0), bg: 'bg-emerald-50', text: 'text-emerald-600' },
              { label: 'Damaged', value: selectedReport.items?.reduce((acc, i) => acc + (i.damagedQty || 0), 0), bg: 'bg-rose-50', text: 'text-rose-500' },
              { label: 'Missing', value: selectedReport.items?.reduce((acc, i) => acc + (i.missingQty || 0), 0), bg: 'bg-orange-50', text: 'text-orange-500' },
              { label: 'Near Expiry', value: selectedReport.items?.filter(i => i.expiryStatus === 'NEAR').length, bg: 'bg-amber-50', text: 'text-amber-500' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} p-8 rounded-2xl flex flex-col items-center justify-center gap-2 transition-transform hover:scale-[1.02] cursor-default shadow-sm border border-black/5`}>
                <span className={`text-4xl font-bold ${stat.text}`}>{stat.value}</span>
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Verification Details */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-900">Verification Details</h3>
            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/80">
                    <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-8 py-5">Item</th>
                      <th className="px-4 py-5 text-center">Ordered</th>
                      <th className="px-4 py-5 text-center">Received</th>
                      <th className="px-4 py-5 text-center">Accepted</th>
                      <th className="px-4 py-5 text-center">Damaged</th>
                      <th className="px-4 py-5 text-center">Expiry</th>
                      <th className="px-4 py-5 text-center">Missing</th>
                      <th className="px-8 py-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedReport.items?.map(item => (
                      <tr key={item.id} className="text-sm">
                        <td className="px-8 py-8">
                          <div className="space-y-1">
                            <p className="font-bold text-gray-900">{item.product?.name}</p>
                            <p className="text-xs text-gray-400 font-medium uppercase tracking-tighter">SKU: {item.product?.skuCode || 'N/A'}</p>
                            <p className="text-[11px] text-gray-400 font-medium">{item.product?.unitValue || '1'} kg</p>
                          </div>
                        </td>
                        <td className="px-4 py-8 text-center font-bold text-gray-900">{item.orderedQty}</td>
                        <td className="px-4 py-8 text-center font-bold text-gray-900">{item.receivedQty}</td>
                        <td className="px-4 py-8 text-center font-bold text-emerald-600">{item.receivedQty - (item.damagedQty || 0)}</td>
                        <td className="px-4 py-8 text-center font-bold text-rose-500">{item.damagedQty || 0}</td>
                        <td className="px-4 py-8 text-center">
                          <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                            item.expiryStatus === 'SAFE' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                            {item.expiryStatus || 'Safe'}
                          </span>
                        </td>
                        <td className="px-4 py-8 text-center font-bold text-orange-500">{item.missingQty || 0}</td>
                        <td className="px-8 py-8 text-right">
                          <span className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">
                            Accepted
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Verification Notes */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Verification Notes</h3>
            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm text-sm font-medium text-gray-500 leading-relaxed">
              {selectedReport.remarks || 'All items received in good condition. Quality verified and approved for stock entry.'}
            </div>
          </div>

          {/* Approval Information */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Approval Information</h3>
            <div className="p-10 bg-white border border-gray-100 rounded-3xl shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Verified By</span>
                  <p className="text-base font-bold text-gray-900">Rajesh Kumar</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Approved By</span>
                  <p className="text-base font-bold text-gray-900">Priya Sharma</p>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Verification Timestamp</span>
                  <p className="text-base font-bold text-gray-900">{format(new Date(selectedReport.createdAt), 'yyyy-MM-dd hh:mm a')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-900">Attachments</h3>
            <div className="p-8 bg-white border border-gray-100 rounded-3xl shadow-sm flex flex-wrap gap-4">
              {selectedReport.attachments && selectedReport.attachments.length > 0 ? (
                selectedReport.attachments.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-white hover:shadow-md transition-all group"
                  >
                    <FileText size={18} className="text-gray-400 group-hover:text-emerald-600" />
                    <span className="text-xs font-bold text-gray-600 truncate max-w-[200px]">
                      {url.split('/').pop() || `Record_${idx + 1}`}
                    </span>
                  </a>
                ))
              ) : (
                <div className="text-sm font-bold text-gray-300 uppercase tracking-widest italic py-4 px-2">
                  No attachments available
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-50">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-8 py-3.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all active:scale-95 shadow-sm"
            >
              <Printer size={18} />
              Print Report
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-10 py-3.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
            >
              <Download size={18} />
              Download PDF
            </button>
          </div>
        </div>
      )}

      {/* Vendor Modal */}
      {showVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
              <div className="flex items-center gap-4">
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tight uppercase">Onboard New Vendor</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Registering a new supply chain partner</p>
                </div>
              </div>
              <button onClick={() => setShowVendorModal(false)} className="p-2 bg-white text-gray-400 hover:text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm">
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>

            {/* Tab Navigation Menu */}
            <div className="px-6 pt-4 border-b border-gray-100/80 bg-slate-50/40 flex gap-2 overflow-x-auto scrollbar-none">
              {[
                { id: 'general', label: '1. General Details', icon: User },
                { id: 'commercial', label: '2. Commercials', icon: DollarSign },
                { id: 'regulation', label: '3. Regulation & Tax', icon: ShieldCheck },
                { id: 'settlement', label: '4. Bank Details', icon: Building2 }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeVendorTab === tab.id;
                const isIncomplete = isVendorTabIncomplete(tab.id);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveVendorTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-t-xl text-[10px] font-black uppercase tracking-wider transition-all border-b-2 outline-none whitespace-nowrap ${
                      isActive 
                        ? 'border-emerald-600 text-emerald-600 bg-white shadow-sm shadow-emerald-50/30' 
                        : 'border-transparent text-gray-400 hover:text-slate-600 bg-transparent'
                    }`}
                  >
                    <Icon size={12} className={isActive ? 'text-emerald-600' : 'text-gray-300'} />
                    <span>{tab.label}</span>
                    {isIncomplete && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Form Body - Scrollable */}
            <form onSubmit={handleAddVendor} className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col justify-between">
              <div className="space-y-6 max-w-5xl mx-auto w-full">
                {/* SECTION 1: General Info */}
                {activeVendorTab === 'general' && (
                  <div className="bg-slate-50/40 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <User size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">General & Contact Details</h4>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Business Name *</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Users size={16} />
                          </div>
                          <input 
                            required 
                            value={newVendor.vendorName} 
                            onChange={e => setNewVendor({ ...newVendor, vendorName: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="Enter business entity name..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Primary Contact No. *</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Phone size={16} />
                          </div>
                          <input 
                            required 
                            value={newVendor.mobile} 
                            onChange={e => setNewVendor({ ...newVendor, mobile: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="Enter 10-digit mobile number..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">POC Name</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <User size={16} />
                          </div>
                          <input 
                            value={newVendor.contactPerson} 
                            onChange={e => setNewVendor({ ...newVendor, contactPerson: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="Enter point of contact name..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Official Email ID</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Mail size={16} />
                          </div>
                          <input 
                            type="email"
                            value={newVendor.email} 
                            onChange={e => setNewVendor({ ...newVendor, email: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="name@business.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Vendor Category *</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Tag size={16} />
                          </div>
                          <select 
                            required
                            value={newVendor.vendorCategory} 
                            onChange={e => setNewVendor({ ...newVendor, vendorCategory: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none cursor-pointer"
                          >
                            <option value="RAW_MATERIAL">Raw Materials</option>
                            <option value="PACKAGING">Packaging Materials</option>
                            <option value="FINISHED_GOODS">Finished Goods</option>
                            <option value="LOGISTICS">Logistics & Freight</option>
                            <option value="SERVICES">Consulting / Services</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Business Address</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <MapPin size={16} />
                          </div>
                          <input 
                            value={newVendor.address} 
                            onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="Enter official street address..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 2: Commercial Terms */}
                {activeVendorTab === 'commercial' && (
                  <div className="bg-slate-50/40 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <DollarSign size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Commercial & Credit Terms</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Credit Cycle Days</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Clock size={16} />
                          </div>
                          <input 
                            type="number" 
                            value={newVendor.creditDays} 
                            onChange={e => setNewVendor({ ...newVendor, creditDays: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="30"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Credit Limit (₹)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <DollarSign size={16} />
                          </div>
                          <input 
                            type="number" 
                            value={newVendor.creditLimit} 
                            onChange={e => setNewVendor({ ...newVendor, creditLimit: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="50000"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Payment terms *</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <FileText size={16} />
                          </div>
                          <select 
                            required
                            value={newVendor.paymentTerms} 
                            onChange={e => setNewVendor({ ...newVendor, paymentTerms: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-10 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none appearance-none cursor-pointer"
                          >
                            <option value="Net 30">Net 30 Days</option>
                            <option value="Net 15">Net 15 Days</option>
                            <option value="COD">Cash on Delivery (COD)</option>
                            <option value="Advance">100% Advance Payment</option>
                            <option value="Due on Receipt">Due on Receipt</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Min. Order Qty (MOQ)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Tag size={16} />
                          </div>
                          <input 
                            type="number" 
                            value={newVendor.minOrderQty} 
                            onChange={e => setNewVendor({ ...newVendor, minOrderQty: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="1"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group md:col-span-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Opening Account Balance (₹)</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <DollarSign size={16} />
                          </div>
                          <input 
                            type="number" 
                            value={newVendor.openingBalance} 
                            onChange={e => setNewVendor({ ...newVendor, openingBalance: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 3: Regulation & Tax */}
                {activeVendorTab === 'regulation' && (
                  <div className="bg-slate-50/40 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Regulation & Taxation Compliance</h4>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm min-w-[200px]">
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700">Taxable Supplier</span>
                        <button
                          type="button"
                          onClick={() => setNewVendor({ ...newVendor, isTaxable: !newVendor.isTaxable })}
                          className="focus:outline-none"
                        >
                          {newVendor.isTaxable ? (
                            <ToggleRight size={32} className="text-emerald-600" />
                          ) : (
                            <ToggleLeft size={32} className="text-gray-300" />
                          )}
                        </button>
                      </div>

                      <div className="flex-1 space-y-2 group w-full">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">
                          GST Identification Number {newVendor.isTaxable && <span className="text-rose-500 font-black">* (Mandatory)</span>}
                        </label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <ShieldAlert size={16} />
                          </div>
                          <input 
                            value={newVendor.gstNumber} 
                            onChange={e => setNewVendor({ ...newVendor, gstNumber: e.target.value.toUpperCase() })}
                            maxLength={15}
                            className={`w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border transition-all outline-none ${
                              newVendor.isTaxable && !newVendor.gstNumber
                                ? 'border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/5'
                                : 'border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5'
                            }`}
                            placeholder="Enter 15-character GSTIN (e.g. 29GGGGG1314R1Z5)..."
                          />
                        </div>
                        {newVendor.isTaxable && !newVendor.gstNumber && (
                          <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider pl-1 flex items-center gap-1">
                            <ShieldAlert size={10} /> Valid GST Identification Number is strictly required for taxable suppliers.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* SECTION 4: Bank Details */}
                {activeVendorTab === 'settlement' && (
                  <div className="bg-slate-50/40 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Building2 size={16} className="text-emerald-600" />
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Settlement & Bank Accounts</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Bank Name</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Building2 size={16} />
                          </div>
                          <input 
                            value={newVendor.bankName} 
                            onChange={e => setNewVendor({ ...newVendor, bankName: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="e.g. State Bank of India..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Account Number</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <CreditCard size={16} />
                          </div>
                          <input 
                            value={newVendor.accountNumber} 
                            onChange={e => setNewVendor({ ...newVendor, accountNumber: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="Enter bank account number..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">IFSC Code</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <Hash size={16} />
                          </div>
                          <input 
                            value={newVendor.ifscCode} 
                            onChange={e => setNewVendor({ ...newVendor, ifscCode: e.target.value.toUpperCase() })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="e.g. SBIN0001234..."
                          />
                        </div>
                      </div>

                      <div className="space-y-2 group">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Bank Branch</label>
                        <div className="relative">
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                            <MapPin size={16} />
                          </div>
                          <input 
                            value={newVendor.bankBranch} 
                            onChange={e => setNewVendor({ ...newVendor, bankBranch: e.target.value })}
                            className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                            placeholder="e.g. Bangalore MG Road..."
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Wizard Form Controls */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3 w-full">
                {/* Left Action - Previous / Cancel */}
                <div className="flex gap-2">
                  <button 
                    type="button" 
                    onClick={() => setShowVendorModal(false)}
                    className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-100 bg-white shadow-sm"
                  >
                    Cancel
                  </button>
                  {activeVendorTab !== 'general' && (
                    <button
                      type="button"
                      onClick={prevVendorTab}
                      className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      <ChevronLeft size={12} strokeWidth={3} /> Back
                    </button>
                  )}
                </div>

                {/* Right Action - Next / Submit */}
                <div>
                  {activeVendorTab !== 'settlement' ? (
                    <button
                      type="button"
                      onClick={nextVendorTab}
                      className="flex items-center gap-1.5 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                    >
                      Next Section <ChevronRight size={12} strokeWidth={3} />
                    </button>
                  ) : (
                    <button 
                      type="submit"
                      className="flex items-center gap-1.5 px-12 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                    >
                      Confirm & Register
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default GRNSection;
