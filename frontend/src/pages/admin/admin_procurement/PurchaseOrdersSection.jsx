import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, Search, Loader2, ClipboardList, X, ArrowLeft, Edit3, Trash2, CheckCircle2,
  Truck, PackageCheck, FileText, Check, Eye, Download, Upload, Paperclip, Users, TrendingUp
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import { productsAPI, API_URL } from '../../../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import jsPDF from 'jspdf';

const PurchaseOrdersSection = ({ can, setHideMainHeader }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showTypeSelection, setShowTypeSelection] = useState(false);
  const [poType, setPoType] = useState(null); // 'REQUISITION' | 'DIRECT'
  const [vendors, setVendors] = useState([]);
  const [mappedItems, setMappedItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [itemSearch, setItemSearch] = useState('');
  const [form, setForm] = useState({
    vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'),
    expectedDelivery: '', remarks: '', items: [],
    taxDiscount: ''
  });
  const [attachments, setAttachments] = useState({
    vendorQuotations: null,
    bills: null,
    supportingDocs: null
  });

  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0'
  });
  const [isNewVendor, setIsNewVendor] = useState(false);
  const [inlineVendor, setInlineVendor] = useState({
    vendorName: '', mobile: '', gstNumber: '', address: ''
  });
  const [preloadedProducts, setPreloadedProducts] = useState([]);

  const [isSubmitDraft, setIsSubmitDraft] = useState(false);

  const handleAttachmentChange = (key, file) => {
    if (!file) return;
    setAttachments(prev => ({ ...prev, [key]: file }));
    toast.success(`${file.name} uploaded successfully!`);
  };

  const handleRemoveAttachment = (key) => {
    setAttachments(prev => ({ ...prev, [key]: null }));
    toast.success('Attachment removed');
  };

  const [selectedPO, setSelectedPO] = useState(null);
  const [viewingPO, setViewingPO] = useState(null);
  const [loadingPO, setLoadingPO] = useState(false);

  const TABS = [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'CREATED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Closed', value: 'CLOSED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ];

  const statusBadgeStyles = {
    CREATED: 'bg-gray-100 text-gray-650 border-gray-250',
    APPROVED: 'bg-emerald-50 text-emerald-705 border-emerald-250',
    ORDERED: 'bg-purple-50 text-purple-705 border-purple-250',
    DELIVERED: 'bg-amber-50 text-amber-705 border-amber-250',
    CLOSED: 'bg-slate-100 text-slate-705 border-slate-250',
    CANCELLED: 'bg-rose-50 text-rose-705 border-rose-250'
  };

  const statusLabel = {
    CREATED: 'Draft',
    APPROVED: 'Approved',
    ORDERED: 'Arrived',
    DELIVERED: 'Delivered',
    CLOSED: 'Closed',
    CANCELLED: 'Cancelled'
  };

  const loadPOs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procurementAPI.getPurchaseOrders({ status: statusFilter || undefined });
      setPOs(data);
    } catch { toast.error('Failed to load POs'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadPOs(); }, [loadPOs]);

  useEffect(() => {
    const preloadData = async () => {
      try {
        const [vendorsRes, productsRes] = await Promise.all([
          procurementAPI.getVendors({ status: 'ACTIVE' }),
          productsAPI.getAll({ showAll: true })
        ]);
        setVendors(vendorsRes.data);
        setPreloadedProducts(productsRes.data);
      } catch (err) {
        console.error('Failed to preload active vendors or products', err);
      }
    };
    preloadData();
  }, []);
  
  useEffect(() => {
    if (setHideMainHeader) {
      setHideMainHeader(showForm || showTypeSelection || !!selectedPO);
    }
    return () => {
      if (setHideMainHeader) setHideMainHeader(false);
    };
  }, [showForm, showTypeSelection, selectedPO, setHideMainHeader]);

  const openForm = (type) => {
    const selectedType = type || poType;
    setIsNewVendor(false);
    setInlineVendor({ vendorName: '', mobile: '', gstNumber: '', address: '' });
    setAttachments({ vendorQuotations: null, bills: null, supportingDocs: null });

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 4);
    const deliveryDateStr = format(deliveryDate, 'yyyy-MM-dd');
    
    setForm({
      vendorId: '',
      poDate: format(new Date(), 'yyyy-MM-dd'),
      expectedDelivery: deliveryDateStr,
      remarks: '',
      items: selectedType === 'DIRECT' 
        ? [{ productId: '', name: '', quantity: 1, unit: 'KG', rate: 0, tax: 0, discount: 0 }]
        : [],
      taxDiscount: ''
    });
    
    setShowForm(true);
    setShowTypeSelection(false);

    // Resolve system vendors and products in the background asynchronously
    const resolveBackgroundData = async () => {
      try {
        if (vendors.length === 0) {
          const { data } = await procurementAPI.getVendors({ status: 'ACTIVE' });
          setVendors(data);
        }

        if (selectedType === 'DIRECT') {
          let prods = preloadedProducts;
          if (prods.length === 0) {
            const { data } = await productsAPI.getAll({ showAll: true });
            setPreloadedProducts(data);
            prods = data;
          }
          setMappedItems(prods.map(p => ({
            productId: p.id,
            name: p.name,
            skuCode: p.skuCode || 'NO-SKU',
            category: p.category?.name || 'UNCATEGORIZED',
            weight: p.unitValue ? `${p.unitValue} ${p.unit?.name || ''}`.trim() : '',
            purchasePrice: p.purchasePrice || p.price || 0,
            quantity: 0,
            rate: p.purchasePrice || p.price || 0
          })));
        } else {
          setMappedItems([]);
        }
      } catch (err) {
        console.error('Failed to resolve background data for PO form', err);
      }
    };
    resolveBackgroundData();
  };

  const onVendorSelect = async (vendorId) => {
    setForm(f => ({ 
      ...f, 
      vendorId, 
      items: poType === 'DIRECT' 
        ? (f.items.length > 0 ? f.items : [{ productId: '', name: '', quantity: 1, unit: 'KG', rate: 0, tax: 0, discount: 0 }])
        : [] 
    }));
    if (!vendorId) { setMappedItems([]); return; }
    try {
      if (poType === 'DIRECT') {
        let prods = preloadedProducts;
        if (prods.length === 0) {
          const { data } = await productsAPI.getAll({ showAll: true });
          setPreloadedProducts(data);
          prods = data;
        }
        setMappedItems(prods.map(p => ({
          productId: p.id,
          name: p.name,
          skuCode: p.skuCode || 'NO-SKU',
          category: p.category?.name || 'UNCATEGORIZED',
          weight: p.unitValue ? `${p.unitValue} ${p.unit?.name || ''}`.trim() : '',
          purchasePrice: p.purchasePrice || p.price || 0,
          quantity: 0,
          rate: p.purchasePrice || p.price || 0
        })));
      } else {
        const { data } = await procurementAPI.getVendorMappings(vendorId);
        setMappedItems(data.map(m => ({
          productId: m.product.id,
          name: m.product.name,
          skuCode: m.product.skuCode || 'NO-SKU',
          category: m.product.category?.name || 'UNCATEGORIZED',
          weight: m.product.unitValue ? `${m.product.unitValue} ${m.product.unit?.name || ''}`.trim() : '',
          purchasePrice: m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (m.product.purchasePrice || m.product.price || 0)),
          quantity: 0,
          rate: m.lastPurchaseRate > 0 ? m.lastPurchaseRate : (m.purchasePrice > 0 ? m.purchasePrice : (m.product.purchasePrice || m.product.price || 0))
        })));
      }
    } catch { toast.error(poType === 'DIRECT' ? 'Failed to load products' : 'Failed to load mapped items'); }
  };

  const toggleItem = (productId) => {
    setForm(f => {
      const exists = f.items.find(i => i.productId === productId);
      if (exists) return { ...f, items: f.items.filter(i => i.productId !== productId) };
      const item = mappedItems.find(m => m.productId === productId);
      return { ...f, items: [...f.items, { productId, quantity: 1, rate: item?.purchasePrice || 0, tax: 0, discount: 0 }] };
    });
  };

  const updateItemField = (productId, field, value) => {
    setForm(f => ({
      ...f,
      items: f.items.map(i => i.productId === productId ? { ...i, [field]: value } : i)
    }));
  };

  const handleAddDirectItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { productId: '', name: '', quantity: 1, unit: 'KG', rate: 0, tax: 0, discount: 0 }]
    }));
  };

  const handleRemoveDirectItem = (index) => {
    setForm(f => ({
      ...f,
      items: f.items.filter((_, i) => i !== index)
    }));
  };

  const handleDirectItemChange = (index, field, value) => {
    setForm(f => {
      const updated = [...f.items];
      updated[index] = { ...updated[index], [field]: value };

      if (field === 'name') {
        const matched = mappedItems.find(p => p.name.toLowerCase() === value.toLowerCase());
        if (matched) {
          updated[index].productId = matched.productId;
          updated[index].rate = matched.purchasePrice || 0;
          updated[index].unit = matched.weight.replace(/[\d\s.]/g, '') || 'KG';
        } else {
          updated[index].productId = '';
        }
      }
      return { ...f, items: updated };
    });
  };

  const handleEdit = async (po) => {
    try {
      const { data: v } = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(v);
      const { data: m } = await procurementAPI.getVendorMappings(po.vendorId);
      const mapped = m.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        skuCode: item.product.skuCode || 'NO-SKU',
        category: item.product.category?.name || 'UNCATEGORIZED',
        weight: item.product.unitValue ? `${item.product.unitValue}${item.product.unit?.name || ''}` : '',
        purchasePrice: item.lastPurchaseRate > 0 ? item.lastPurchaseRate : (item.purchasePrice > 0 ? item.purchasePrice : (item.product.purchasePrice || item.product.price || 0)),
        quantity: 0,
        rate: item.lastPurchaseRate > 0 ? item.lastPurchaseRate : (item.purchasePrice > 0 ? item.purchasePrice : (item.product.purchasePrice || item.product.price || 0))
      }));

      // Append items in po.items that are not in mapped
      po.items.forEach(poItem => {
        if (!mapped.some(x => x.productId === poItem.productId)) {
          mapped.push({
            productId: poItem.productId,
            name: poItem.product?.name || 'Product',
            skuCode: poItem.product?.skuCode || 'NO-SKU',
            category: poItem.product?.category?.name || 'UNCATEGORIZED',
            weight: poItem.product?.unitValue ? `${poItem.product.unitValue}${poItem.product.unit?.name || ''}` : '',
            purchasePrice: poItem.rate || poItem.product?.purchasePrice || 0,
            quantity: poItem.quantity,
            rate: poItem.rate
          });
        }
      });

      setMappedItems(mapped);
      setPoType(po.items.some(poItem => !m.some(x => x.productId === poItem.productId)) ? 'DIRECT' : 'REQUISITION');
      setAttachments({
        vendorQuotations: po.attachments?.vendorQuotations || null,
        bills: po.attachments?.bills || null,
        supportingDocs: po.attachments?.supportingDocs || null
      });
      setForm({
        id: po.id,
        vendorId: po.vendorId,
        poDate: format(new Date(po.poDate), 'yyyy-MM-dd'),
        expectedDelivery: po.expectedDelivery ? format(new Date(po.expectedDelivery), 'yyyy-MM-dd') : '',
        remarks: po.remarks || '',
        items: po.items.map(i => ({ productId: i.productId, quantity: i.quantity, rate: i.rate, tax: i.tax || 0, discount: i.discount || 0 }))
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
    
    if (isNewVendor) {
      if (!inlineVendor.vendorName || !inlineVendor.mobile) {
        return toast.error('Vendor Name and Mobile Number are required for onboarding');
      }
    } else {
      if (!form.vendorId) {
        return toast.error('Select a vendor to continue');
      }
    }

    if (form.items.length === 0) {
      return toast.error('Select or add at least one item');
    }

    try {
      let finalVendorId = form.vendorId;

      if (isNewVendor) {
        // Automatically register vendor inline in the background
        const { data: newV } = await procurementAPI.createVendor({
          vendorName: inlineVendor.vendorName,
          mobile: inlineVendor.mobile,
          contactPerson: '',
          address: inlineVendor.address || 'Direct Market',
          gstNumber: inlineVendor.gstNumber || 'N/A',
          creditDays: 30,
          openingBalance: 0
        });
        finalVendorId = newV.id;
        toast.success(`Vendor '${inlineVendor.vendorName}' successfully onboarded!`);
      }

      // Upload any local File attachments to server storage
      const uploadedUrls = {};
      const uploadKeys = ['vendorQuotations', 'bills', 'supportingDocs'];
      let uploadToastId = null;

      const filesToUpload = uploadKeys.filter(k => attachments[k] instanceof File);
      if (filesToUpload.length > 0) {
        uploadToastId = toast.loading('Uploading attachments...');
      }

      for (const key of uploadKeys) {
        if (attachments[key] instanceof File) {
          const file = attachments[key];
          const formData = new FormData();
          formData.append('image', file);
          formData.append('folder', 'po_attachments');
          try {
            const { data } = await adminAPI.uploadProductImage(formData);
            uploadedUrls[key] = {
              name: file.name,
              url: data.data?.url || data.url
            };
          } catch (uploadErr) {
            console.error(`Failed to upload ${key}`, uploadErr);
            toast.error(`Failed to upload attachment: ${file.name}`);
          }
        } else if (attachments[key] && attachments[key].url) {
          uploadedUrls[key] = attachments[key];
        }
      }

      if (uploadToastId) {
        toast.dismiss(uploadToastId);
      }

      const payload = {
        vendorId: finalVendorId,
        poDate: form.poDate,
        expectedDelivery: form.expectedDelivery || null,
        remarks: form.remarks,
        items: form.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), rate: parseFloat(i.rate), tax: parseFloat(i.tax || 0), discount: parseFloat(i.discount || 0) })),
        poType: poType,
        taxDiscount: form.taxDiscount,
        attachments: uploadedUrls
      };
      
      if (form.id) {
        await procurementAPI.updatePurchaseOrder(form.id, payload);
        toast.success('Purchase Order updated successfully!');
      } else {
        await procurementAPI.createPurchaseOrder(payload);
        if (!isSubmitDraft) {
          toast.success('Purchase Order Created successfully!');
        } else {
          toast.success('Purchase Order Draft Saved successfully!');
        }
      }
      
      setShowForm(false);
      setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [], taxDiscount: '' });
      setAttachments({ vendorQuotations: null, bills: null, supportingDocs: null });
      setIsNewVendor(false);
      setInlineVendor({ vendorName: '', mobile: '', gstNumber: '', address: '' });
      loadPOs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving PO');
    }
  };

  const updateStatus = async (id, status) => {
    try {
      await procurementAPI.updatePOStatus(id, { status });
      toast.success(`PO status updated to ${statusLabel[status] || status}`);
      loadPOs();
    } catch { toast.error('Failed to update status'); }
  };

  const handleViewDetails = async (po) => {
    setLoadingPO(true);
    setSelectedPO(po);
    try {
      const { data } = await procurementAPI.getPurchaseOrderById(po.id);
      setViewingPO(data);
    } catch {
      toast.error('Failed to load purchase order details');
      setSelectedPO(null);
    } finally {
      setLoadingPO(false);
    }
  };

  const downloadPO_PDF = (po) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const now = format(new Date(), 'dd MMM yyyy, hh:mm a');
      const poNum = po.displayId || po.id.slice(-6).toUpperCase();
      
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 35, 210, 1.5, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('VILLAGKART', 15, 18);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text('PREMIUM FRESH PRODUCE & GROCERIES DIRECTLY FROM VILLAGES', 15, 24);
      
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('PURCHASE ORDER', 195, 18, { align: 'right' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(`#${poNum}`, 195, 24, { align: 'right' });
      
      let y = 48;
      doc.setTextColor(30, 41, 59);
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('ORDER TO (VENDOR):', 15, y);
      doc.text('SHIP TO (BRANCH):', 110, y);
      
      y += 5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(po.vendor?.vendorName || 'N/A', 15, y);
      doc.text(po.store?.name || 'VillagKart Hub', 110, y);
      
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      
      doc.text(`Mobile: ${po.vendor?.mobile || 'N/A'}`, 15, y);
      doc.text(`Address: ${po.store?.address || 'Main Storage Hub'}`, 110, y);
      
      y += 4.5;
      doc.text(`GSTIN: ${po.vendor?.gstNumber || 'N/A'}`, 15, y);
      doc.text(`Contact: ${po.store?.contactPhone || 'N/A'}`, 110, y);
      
      y += 4.5;
      doc.text(`Address: ${po.vendor?.address || 'N/A'}`, 15, y);
      
      y += 12;
      doc.setFillColor(248, 250, 252);
      doc.rect(15, y - 5, 180, 14, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(15, y - 5, 180, 14, 'D');
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('PO NUMBER', 20, y);
      doc.text('DATE CREATED', 65, y);
      doc.text('EXPECTED DELIVERY', 115, y);
      doc.text('LIFECYCLE STATUS', 160, y);
      
      y += 5.5;
      doc.setFont('helvetica', 'normal');
      doc.text(`#${poNum}`, 20, y);
      doc.text(format(new Date(po.poDate), 'dd MMM yyyy'), 65, y);
      doc.text(po.expectedDelivery ? format(new Date(po.expectedDelivery), 'dd MMM yyyy') : 'N/A', 115, y);
      doc.text(statusLabel[po.status] || po.status, 160, y);
      
      y += 16;
      
      doc.setFillColor(241, 245, 249);
      doc.rect(15, y - 5, 180, 8, 'F');
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text('S.No.', 18, y);
      doc.text('ITEM DESCRIPTION', 35, y);
      doc.text('RATE (INR)', 110, y, { align: 'right' });
      doc.text('QTY (UNITS)', 145, y, { align: 'right' });
      doc.text('SUBTOTAL', 190, y, { align: 'right' });
      
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      (po.items || []).forEach((item, index) => {
        if (index % 2 === 1) {
          doc.setFillColor(250, 250, 250);
          doc.rect(15, y - 4.5, 180, 6.5, 'F');
        }
        
        doc.setTextColor(51, 65, 85);
        doc.text(String(index + 1), 18, y);
        doc.setFont('helvetica', 'bold');
        let desc = item.product?.name || 'N/A';
        if (item.tax || item.discount) {
          desc += ` (Tax: ${item.tax || 0}%, Disc: ${item.discount || 0}%)`;
        }
        doc.text(desc, 35, y);
        doc.setFont('helvetica', 'normal');
        
        doc.text(`Rs ${item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 110, y, { align: 'right' });
        doc.text(String(item.quantity), 145, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(`Rs ${item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        
        y += 6.5;
        
        if (y > 260) {
          doc.addPage();
          y = 30;
          
          doc.setFillColor(241, 245, 249);
          doc.rect(15, y - 5, 180, 8, 'F');
          
          doc.setTextColor(30, 41, 59);
          doc.setFontSize(8.5);
          doc.setFont('helvetica', 'bold');
          doc.text('S.No.', 18, y);
          doc.text('ITEM DESCRIPTION', 35, y);
          doc.text('RATE (INR)', 110, y, { align: 'right' });
          doc.text('QTY (UNITS)', 145, y, { align: 'right' });
          doc.text('SUBTOTAL', 190, y, { align: 'right' });
          
          y += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
        }
      });
      
      y += 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(15, y, 195, y);
      y += 6;
      
      const totalTax = po.items?.reduce((sum, i) => {
        const base = i.quantity * i.rate;
        const disc = base * ((i.discount || 0) / 100);
        return sum + ((base - disc) * ((i.tax || 0) / 100));
      }, 0) || 0;

      const totalDisc = po.items?.reduce((sum, i) => sum + ((i.quantity * i.rate) * ((i.discount || 0) / 100)), 0) || 0;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);

      doc.text('Total Discount Amount:', 135, y);
      doc.text(`Rs ${totalDisc.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 4.5;
      doc.text('Total GST / Tax Amount:', 135, y);
      doc.text(`Rs ${totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });

      y += 6.5;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('FINAL PO VALUE:', 135, y);
      doc.setTextColor(16, 185, 129);
      doc.text(`Rs ${po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 190, y, { align: 'right' });
      
      y += 12;
      if (po.remarks) {
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('REMARKS / SPECIAL INSTRUCTIONS:', 15, y);
        y += 4.5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        const splitRemarks = doc.splitTextToSize(po.remarks, 180);
        doc.text(splitRemarks, 15, y);
        y += splitRemarks.length * 4.5;
      }
      
      y = Math.max(y + 15, 245);
      doc.setDrawColor(226, 232, 240);
      doc.line(15, y, 65, y);
      doc.line(145, y, 195, y);
      
      y += 4.5;
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Authorized By', 15, y);
      doc.text('Vendor Partner Sign', 145, y);
      
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Page ${i} of ${pages}  |  VillagKart Enterprise Purchase Order  |  Printed: ${now}`, 105, 287, { align: 'center' });
      }
      
      doc.save(`PO_${poNum}_${format(new Date(), 'dd_MMM_yyyy')}.pdf`);
      toast.success('Purchase Order PDF downloaded');
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error('Failed to export PDF');
    }
  };

  const poTotal = form.items.reduce((s, i) => {
    const qty = parseFloat(i.quantity || 0);
    const rate = parseFloat(i.rate || 0);
    const discount = parseFloat(i.discount || 0);
    const tax = parseFloat(i.tax || 0);
    const baseVal = qty * rate;
    const discVal = baseVal * (discount / 100);
    const taxVal = (baseVal - discVal) * (tax / 100);
    return s + (baseVal - discVal + taxVal);
  }, 0);

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-hidden">
      {selectedPO ? (
        <div className="flex-col flex-1 min-h-0 bg-[#f8fafc] p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 relative flex">
          {/* Header Navigation with back button */}
          <div className="flex items-center gap-5 border-b border-slate-200/85 pb-5 mb-2 shrink-0">
            <button 
              onClick={() => { setSelectedPO(null); setViewingPO(null); }}
              className="p-3 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95 shrink-0"
              type="button"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {viewingPO?.status === 'CREATED' ? 'Review Purchase Order' : 'View Purchase Order'}
              </h1>
              <p className="text-sm text-slate-500">
                {viewingPO?.status === 'CREATED' 
                  ? 'Verify procurement details before approving vendor order.' 
                  : 'Review complete purchase order details and procurement summary.'}
              </p>
            </div>
          </div>

          {/* Scrollable details content */}
          <div className="flex-1 space-y-6">
            {loadingPO ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="animate-spin text-emerald-600" size={36} />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Fetching PO details...</p>
              </div>
            ) : viewingPO ? (
              viewingPO.status === 'CREATED' ? (
                <div className="space-y-6 animate-in fade-in duration-300">
                  {/* Basic Details Section */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <FileText size={18} className="text-emerald-600" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Basic Details</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PO Number</span>
                        <p className="text-lg font-black text-slate-900">
                          #{viewingPO.displayId || `PO-VK-2026-${String(viewingPO.poNumber).padStart(5, '0')}`}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tax & Discounts</span>
                        <p className="text-sm font-black text-slate-700">
                          {viewingPO.taxDiscount || 'Enter tax/discount %'}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vendor</span>
                        <p className="text-sm font-black text-slate-800">
                          {viewingPO.vendor?.vendorName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expected Delivery Date</span>
                        <p className="text-sm font-bold text-slate-700">
                          {viewingPO.expectedDelivery ? format(new Date(viewingPO.expectedDelivery), 'dd-MM-yyyy') : 'N/A'}
                        </p>
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Terms & Conditions / Notes</span>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                          {viewingPO.remarks || 'Payment within 30 days. No return policy for perishable goods.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Items Section */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <ClipboardList size={18} className="text-emerald-600" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Items</h2>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-100">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider">Item Name</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">SKU</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Purchase Rate</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-center">Quantity</th>
                            <th className="px-6 py-3.5 text-xs font-black text-slate-600 uppercase tracking-wider text-right">Valuation</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingPO.items?.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/20 transition-all duration-150">
                              <td className="px-6 py-4 text-sm font-black text-slate-800 tracking-tight">{item.product?.name}</td>
                              <td className="px-6 py-4 text-center text-xs font-bold text-slate-400">{item.product?.skuCode || 'N/A'}</td>
                              <td className="px-6 py-4 text-center text-sm font-black text-slate-700">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-4 text-center text-sm font-bold text-slate-800">{item.quantity} {item.product?.unit?.name || 'KG'}</td>
                              <td className="px-6 py-4 text-right text-sm font-black text-slate-900">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                      <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Purchase Value</span>
                      <span className="text-xl font-black text-emerald-600">
                        ₹{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Attachments Section */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Paperclip size={18} className="text-emerald-600" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-slate-900">Attachments</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between min-h-[120px] bg-slate-50/20">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Vendor Quotations</span>
                          {viewingPO.attachments?.vendorQuotations?.url ? (
                            <div className="flex items-center gap-2.5">
                              <FileText size={18} className="text-emerald-600 animate-pulse" />
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{viewingPO.attachments.vendorQuotations.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File Uploaded</span>
                          )}
                        </div>
                        {viewingPO.attachments?.vendorQuotations?.url && (
                          <a 
                            href={viewingPO.attachments.vendorQuotations.url.startsWith('http') ? viewingPO.attachments.vendorQuotations.url : `${API_URL.replace(/\/api\/?$/, '')}${viewingPO.attachments.vendorQuotations.url}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] font-black text-emerald-600 hover:underline mt-4 flex items-center gap-1 w-max"
                          >
                            <Download size={10} /> Download
                          </a>
                        )}
                      </div>

                      <div className="border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between min-h-[120px] bg-slate-50/20">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Bills</span>
                          {viewingPO.attachments?.bills?.url ? (
                            <div className="flex items-center gap-2.5">
                              <FileText size={18} className="text-emerald-600 animate-pulse" />
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{viewingPO.attachments.bills.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File Uploaded</span>
                          )}
                        </div>
                        {viewingPO.attachments?.bills?.url && (
                          <a 
                            href={viewingPO.attachments.bills.url.startsWith('http') ? viewingPO.attachments.bills.url : `${API_URL.replace(/\/api\/?$/, '')}${viewingPO.attachments.bills.url}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] font-black text-emerald-600 hover:underline mt-4 flex items-center gap-1 w-max"
                          >
                            <Download size={10} /> Download
                          </a>
                        )}
                      </div>

                      <div className="border border-slate-200/60 rounded-xl p-5 flex flex-col justify-between min-h-[120px] bg-slate-50/20">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Supporting Documents</span>
                          {viewingPO.attachments?.supportingDocs?.url ? (
                            <div className="flex items-center gap-2.5">
                              <FileText size={18} className="text-emerald-600 animate-pulse" />
                              <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">{viewingPO.attachments.supportingDocs.name}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No File Uploaded</span>
                          )}
                        </div>
                        {viewingPO.attachments?.supportingDocs?.url && (
                          <a 
                            href={viewingPO.attachments.supportingDocs.url.startsWith('http') ? viewingPO.attachments.supportingDocs.url : `${API_URL.replace(/\/api\/?$/, '')}${viewingPO.attachments.supportingDocs.url}`}
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] font-black text-emerald-600 hover:underline mt-4 flex items-center gap-1 w-max"
                          >
                            <Download size={10} /> Download
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* Status & Metadata card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">PO Number</span>
                    <p className="text-xs font-black text-slate-900">
                      {viewingPO.displayId || `PO-VK-2026-${String(viewingPO.poNumber).padStart(5, '0')}`}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">ID</span>
                    <p className="text-xs font-bold text-slate-500 uppercase">
                      {viewingPO.id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vendor</span>
                    <p className="text-xs font-black text-slate-900 truncate">
                      {viewingPO.vendor?.vendorName}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Order Date</span>
                    <p className="text-xs font-black text-slate-700">
                      {format(new Date(viewingPO.poDate), 'dd MMM yyyy')}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Expected Delivery</span>
                    <p className="text-xs font-black text-slate-700">
                      {viewingPO.expectedDelivery ? format(new Date(viewingPO.expectedDelivery), 'dd MMM yyyy') : 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Status</span>
                    <div className="pt-0.5">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusBadgeStyles[viewingPO.status] || ''}`}>
                        {statusLabel[viewingPO.status] || viewingPO.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1 col-span-2 md:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Total Value</span>
                    <p className="text-sm font-black text-emerald-650">
                      ₹{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Vendor & Hub Details cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Vendor Information Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Users size={16} className="text-emerald-650 animate-pulse" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Vendor Information</h3>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-450">Name:</span>
                        <span className="font-bold text-slate-800 text-right">{viewingPO.vendor?.vendorName}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-450">Contact:</span>
                        <span className="font-bold text-slate-800 text-right">{viewingPO.vendor?.mobile || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-450">GST:</span>
                        <span className="font-bold text-slate-800 text-right uppercase">{viewingPO.vendor?.gstNumber || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-xs gap-4">
                        <span className="font-medium text-slate-450 shrink-0">Address:</span>
                        <span className="font-bold text-slate-800 text-right break-words">{viewingPO.vendor?.address || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Conditions Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <FileText size={16} className="text-emerald-650" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Terms & Conditions</h3>
                      </div>
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                        Payment within 15 days. Organic certification required.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Tax & Discounts Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <TrendingUp size={16} className="text-emerald-650" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Tax & Discounts</h3>
                    </div>
                    <div className="space-y-2">
                      {viewingPO.taxDiscount && (
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-slate-450">Terms / Notes:</span>
                          <span className="font-bold text-slate-800">{viewingPO.taxDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-450">Tax Amount (GST):</span>
                        <span className="font-bold text-emerald-650">
                          ₹{(viewingPO.items?.reduce((sum, i) => {
                            const base = i.quantity * i.rate;
                            const disc = base * ((i.discount || 0) / 100);
                            return sum + ((base - disc) * ((i.tax || 0) / 100));
                          }, 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-455">Discount Amount:</span>
                        <span className="font-bold text-rose-650">
                          ₹{(viewingPO.items?.reduce((sum, i) => sum + ((i.quantity * i.rate) * ((i.discount || 0) / 100)), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Notes Card */}
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                      <Paperclip size={16} className="text-emerald-650" />
                      <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Notes</h3>
                    </div>
                    <p className="text-xs font-medium text-slate-650 leading-relaxed italic">
                      "{viewingPO.remarks || 'Verified organic supplier.'}"
                    </p>
                  </div>
                </div>

                {/* Purchase Items Breakdown Table */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-455 pl-1">Purchase Items</h3>
                  <div className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-100 whitespace-nowrap">
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-left">Procurement Item</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">SKU</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Quantity</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Unit</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Purchase Rate</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Tax (%)</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-center">Discount (%)</th>
                            <th className="px-6 py-3 text-[9px] font-black text-slate-455 uppercase tracking-widest text-right">Total Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingPO.items?.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5 text-xs font-black text-slate-900 tracking-tight">{item.product?.name}</td>
                              <td className="px-6 py-3.5 text-center text-xs font-medium text-slate-400">{item.product?.skuCode || 'N/A'}</td>
                              <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-800">{item.quantity}</td>
                              <td className="px-6 py-3.5 text-center text-xs font-semibold text-slate-500 uppercase">{item.product?.unit?.name || 'KG'}</td>
                              <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-700">₹{item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-600">{item.tax !== undefined ? item.tax : 0}%</td>
                              <td className="px-6 py-3.5 text-center text-xs font-bold text-slate-600">{item.discount !== undefined ? item.discount : 0}%</td>
                              <td className="px-6 py-3.5 text-right text-xs font-black text-slate-900">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Items Totals Breakdown Summary Sheet */}
                    <div className="bg-slate-50 border-t border-slate-200/60 p-6 grid grid-cols-2 md:grid-cols-5 gap-y-4 gap-x-6 text-xs font-semibold text-slate-655">
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Items</span>
                        <span className="text-sm font-black text-slate-900">
                          {viewingPO.items?.length || 0}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Total Quantity</span>
                        <span className="text-sm font-black text-slate-900">
                          {viewingPO.items?.reduce((sum, i) => sum + i.quantity, 0) || 0}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Tax Amount</span>
                        <span className="text-sm font-black text-slate-900">
                          ₹{(viewingPO.items?.reduce((sum, i) => {
                            const base = i.quantity * i.rate;
                            const disc = base * ((i.discount || 0) / 100);
                            return sum + ((base - disc) * ((i.tax || 0) / 100));
                          }, 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Discount Amount</span>
                        <span className="text-sm font-black text-slate-900">
                          ₹{(viewingPO.items?.reduce((sum, i) => sum + ((i.quantity * i.rate) * ((i.discount || 0) / 100)), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="space-y-1 col-span-2 md:col-span-1 border-t md:border-t-0 md:border-l border-slate-200/80 pt-3 md:pt-0 md:pl-6 text-right md:text-left">
                        <span className="text-[9px] font-bold text-emerald-650 uppercase tracking-widest block">Final Purchase Value</span>
                        <span className="text-sm font-black text-emerald-650 tracking-tighter">
                          ₹{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-455 pl-1">Attachments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {viewingPO.attachments && Object.values(viewingPO.attachments).some(att => att && att.url) ? (
                      Object.entries(viewingPO.attachments).map(([key, attachment]) => {
                        if (!attachment || !attachment.url) return null;
                        const labelMap = {
                          vendorQuotations: viewingPO.poType === 'DIRECT' ? 'Market Bills' : 'Vendor Quotations',
                          bills: viewingPO.poType === 'DIRECT' ? 'Vendor Quotations' : 'Bills',
                          supportingDocs: 'Supporting Documents'
                        };
                        return (
                          <div key={key} className="bg-white rounded-2xl border border-slate-200/60 p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500 hover:shadow-md transition-all group">
                            <div className="space-y-2">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                                {labelMap[key] || key}
                              </span>
                              <div className="flex items-center gap-2.5">
                                <FileText size={20} className="text-slate-400 group-hover:text-emerald-650 transition-colors" />
                                <span className="text-xs font-black text-slate-700 truncate max-w-[180px]">
                                  {attachment.name}
                                </span>
                              </div>
                            </div>
                            <a 
                              href={attachment.url.startsWith('http') ? attachment.url : `${API_URL.replace(/\/api\/?$/, '')}${attachment.url}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-[10px] font-black text-emerald-650 hover:underline mt-4 flex items-center gap-1 w-max"
                            >
                              <Download size={10} /> Download
                            </a>
                          </div>
                        );
                      })
                    ) : (
                      <div className="col-span-full bg-slate-50 rounded-2xl border border-slate-200/40 p-6 text-center space-y-1.5 shadow-sm">
                        <FileText size={24} className="text-slate-400 mx-auto" />
                        <p className="text-xs font-bold text-slate-500">No Attachments Uploaded</p>
                        <p className="text-[10px] text-slate-400 font-medium">This Purchase Order does not have any attached bills, quotations, or supporting documents.</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )) : null}
          </div>

          {/* Footer - Permanently Docked */}
          {viewingPO && (
            <div className="bg-white border-t border-slate-200 px-8 py-5 flex items-center justify-between shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.05)] shrink-0 rounded-b-3xl">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Total Valuation</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-black text-emerald-650">₹</span>
                  <span className="text-lg font-black text-slate-900 tracking-tighter">{viewingPO.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {viewingPO.status === 'CREATED' ? (
                  <>
                    <button 
                      onClick={() => { updateStatus(viewingPO.id, 'CANCELLED'); setSelectedPO(null); setViewingPO(null); }}
                      className="h-10 px-5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <X size={14} strokeWidth={3} /> Reject
                    </button>
                    <button 
                      onClick={() => { setSelectedPO(null); setViewingPO(null); }}
                      className="h-10 px-5 bg-white text-slate-700 rounded-xl border border-slate-200 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm active:scale-95"
                    >
                      Save Draft
                    </button>
                    {can('PROCUREMENT', 'UPDATE', 'PO') && (
                      <button 
                        onClick={() => { updateStatus(viewingPO.id, 'APPROVED'); setSelectedPO(null); setViewingPO(null); }}
                        className="h-10 px-6 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Check size={14} strokeWidth={3} /> Approve PO
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => downloadPO_PDF(viewingPO)}
                      className="h-10 px-4 bg-slate-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Download size={14} /> Download PDF
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      ) : showTypeSelection ? (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50 rounded-3xl p-8 overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-10 shrink-0">
            <button 
              onClick={() => setShowTypeSelection(false)}
              className="p-3 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-emerald-950">Create Purchase Order</h1>
              <p className="text-sm font-semibold text-slate-400 mt-1">Choose the type of Purchase Order to create.</p>
            </div>
          </div>

          {/* Cards Grid */}
          <div className="flex-1 flex items-center justify-center min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full px-4 py-8">
              {/* Card 1: PO Against Requisition */}
              <div 
                onClick={() => {
                  setPoType('REQUISITION');
                  openForm('REQUISITION');
                }}
                className="group cursor-pointer bg-white border-2 border-slate-100 hover:border-emerald-600 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-600/5 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all group-hover:bg-emerald-600 group-hover:text-white shadow-inner">
                  <ClipboardList size={36} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">
                    PO Against Requisition
                  </h3>
                  <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-xs">
                    Create PO using existing vendor item mappings.
                  </p>
                </div>
              </div>

              {/* Card 2: Direct PO */}
              <div 
                onClick={() => {
                  setPoType('DIRECT');
                  openForm('DIRECT');
                }}
                className="group cursor-pointer bg-white border-2 border-slate-100 hover:border-emerald-600 rounded-3xl p-8 shadow-sm hover:shadow-xl hover:shadow-emerald-600/5 transition-all duration-300 transform hover:-translate-y-1 active:scale-[0.98] flex flex-col items-center text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center transition-all group-hover:bg-emerald-600 group-hover:text-white shadow-inner">
                  <Plus size={36} strokeWidth={2.5} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 group-hover:text-emerald-950 transition-colors">
                    Direct PO
                  </h3>
                  <p className="text-sm font-medium text-slate-400 leading-relaxed max-w-xs">
                    Create PO for direct market procurement.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !showForm ? (
        <>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between shrink-0">
            <div className="flex flex-wrap items-center gap-3 flex-1 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-100 shadow-sm flex-1 md:max-w-md focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500 transition-all">
                <Search size={16} className="text-gray-400" />
                <input 
                  placeholder="Search PO # or Vendor" 
                  value={search} 
                  onChange={e => setSearch(e.target.value)}
                  className="bg-transparent border-none focus:outline-none text-xs font-bold text-gray-700 w-full placeholder:text-gray-400" 
                />
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {TABS.map(tab => (
                  <button key={tab.label} onClick={() => setStatusFilter(tab.value)}
                    className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${
                      statusFilter === tab.value ? 'bg-slate-900 text-white border border-slate-900 shadow-lg shadow-slate-900/10' : 'bg-white text-slate-500 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 shadow-sm'
                    }`}>{tab.label}</button>
                ))}
              </div>
            </div>
            {can('PROCUREMENT', 'CREATE', 'PO') && (
              <button onClick={() => { setForm({ vendorId: '', poDate: format(new Date(), 'yyyy-MM-dd'), expectedDelivery: '', remarks: '', items: [], taxDiscount: '' }); setAttachments({ vendorQuotations: null, bills: null, supportingDocs: null }); setPoType(null); setShowTypeSelection(true); }}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-emerald-600/20 shrink-0">
                <Plus size={16} strokeWidth={3} /> New Purchase Order
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
              <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 w-full">
              <table className="w-max min-w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 whitespace-nowrap">
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">PO Number</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Vendor</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Order Date</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Total Value</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider whitespace-nowrap">Status</th>
                    <th className="py-4 px-6 text-xs font-black text-gray-400 uppercase tracking-wider text-right sticky right-0 bg-[#f8fafc] z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pos.filter(po => {
                    const searchLower = search.toLowerCase();
                    const poNumStr = po.displayId?.toString() || '';
                    const vendorStr = po.vendor?.vendorName || '';
                    const poIdStr = po.id?.toString() || '';
                    
                    return !search || 
                      poNumStr.toLowerCase().includes(searchLower) || 
                      vendorStr.toLowerCase().includes(searchLower) ||
                      poIdStr.toLowerCase().includes(searchLower);
                  }).map(po => (
                    <tr key={po.id} className="hover:bg-gray-50/50 transition-all group border-b border-gray-50 last:border-0">
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-955 uppercase tracking-tight">#{po.displayId}</span>
                          <span className="text-[10px] font-bold text-gray-400 mt-0.5 uppercase">ID: {po.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm font-black text-gray-900">{po.vendor?.vendorName}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-600">{format(new Date(po.poDate), 'dd MMM yyyy')}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className="text-sm font-black text-gray-955">₹{po.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${statusBadgeStyles[po.status] || 'bg-gray-50 text-gray-500'}`}>
                          {statusLabel[po.status] || po.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-gray-50/50 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.03)]">
                        <div className="flex items-center justify-end gap-3">
                          {po.status === 'CREATED' ? (
                            <>
                              {can('PROCUREMENT', 'UPDATE', 'PO') && (
                                <button 
                                  onClick={() => handleViewDetails(po)} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-200 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-50/50 hover:bg-emerald-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                  title="Approve PO"
                                >
                                  <Check size={12} strokeWidth={3} /> Approve
                                </button>
                              )}
                              {can('PROCUREMENT', 'UPDATE', 'PO') && (
                                <button 
                                  onClick={() => handleViewDetails(po)} 
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-wider bg-rose-50/50 hover:bg-rose-600 hover:text-white transition-all active:scale-95 shadow-sm"
                                  title="Cancel PO"
                                >
                                  <X size={12} strokeWidth={3} /> Cancel
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button 
                                onClick={() => handleViewDetails(po)} 
                                className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white transition-all shadow-sm active:scale-95"
                                title="View Details"
                              >
                                <Eye size={12} /> View
                              </button>
                              <button 
                                onClick={() => downloadPO_PDF(po)} 
                                className="flex items-center gap-1 px-2.5 py-1.5 border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-200 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white transition-all shadow-sm active:scale-95"
                                title="Download PDF"
                              >
                                <Download size={12} /> Download
                              </button>
                            </>
                          )}
                          
                          {can('PROCUREMENT', 'UPDATE', 'PO') && !['CLOSED', 'CANCELLED'].includes(po.status) && (
                            <div className="flex gap-1 pl-1.5 border-l border-gray-100">
                              {po.status === 'CREATED' && (
                                <button onClick={() => updateStatus(po.id, 'APPROVED')} className="p-1 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all" title="Approve">
                                  <CheckCircle2 size={12} />
                                </button>
                              )}
                              {po.status === 'APPROVED' && (
                                <button onClick={() => updateStatus(po.id, 'ORDERED')} className="p-1 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-all" title="Mark Arrived">
                                  <Truck size={12} />
                                </button>
                              )}
                              {po.status === 'ORDERED' && (
                                <button onClick={() => updateStatus(po.id, 'DELIVERED')} className="p-1 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all" title="Mark Delivered">
                                  <PackageCheck size={12} />
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
        <div className="flex flex-col flex-1 min-h-0 bg-[#f8fafc] p-6 md:p-8 space-y-6 overflow-y-auto custom-scrollbar animate-in fade-in duration-300 relative">
          {/* Internal Navigation Header */}
          <div className="flex items-center gap-4 shrink-0">
            <button 
              onClick={() => {
                if (form.id) {
                  setShowForm(false);
                  setShowTypeSelection(false);
                } else {
                  setShowForm(false);
                  setShowTypeSelection(true);
                }
              }}
              className="p-3 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl border border-slate-200 transition-all shadow-sm active:scale-95 shrink-0"
              type="button"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {form.id 
                  ? 'Refine Purchase Order' 
                  : poType === 'DIRECT' 
                    ? 'Create Direct Purchase Order' 
                    : 'Create PO Against Requisition'}
              </h1>
              <p className="text-sm text-slate-500">
                {form.id 
                  ? 'Modify this draft purchase order details.' 
                  : poType === 'DIRECT' 
                    ? 'Create purchase orders for direct market procurement.' 
                    : 'Create purchase orders using existing vendor-item mappings.'}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-6">
            {/* Scrollable Content Area */}
            <div className="space-y-6">
              
              {/* Basic Details Section */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h2 className="text-base font-bold text-slate-900">Basic Details</h2>
                  {poType === 'DIRECT' && can('PROCUREMENT', 'CREATE', 'VENDORS') && (
                    <button
                      type="button"
                      onClick={() => setIsNewVendor(!isNewVendor)}
                      className="text-xs font-black text-emerald-650 hover:text-emerald-700 hover:underline flex items-center gap-1 transition-all active:scale-95"
                    >
                      {isNewVendor ? (
                        <>Select Existing Vendor</>
                      ) : (
                        <><Plus size={14} strokeWidth={3} /> Add New Vendor</>
                      )}
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                  {isNewVendor ? (
                    <>
                      {/* Vendor Name */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Vendor Name *</label>
                        <input 
                          type="text" 
                          required
                          value={inlineVendor.vendorName} 
                          onChange={e => setInlineVendor({...inlineVendor, vendorName: e.target.value})}
                          placeholder="Enter vendor name"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" 
                        />
                      </div>

                      {/* Mobile Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Mobile Number *</label>
                        <input 
                          type="text" 
                          required
                          value={inlineVendor.mobile} 
                          onChange={e => setInlineVendor({...inlineVendor, mobile: e.target.value})}
                          placeholder="Enter mobile number"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" 
                        />
                      </div>

                      {/* GST Number */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">GST Number</label>
                        <input 
                          type="text" 
                          value={inlineVendor.gstNumber} 
                          onChange={e => setInlineVendor({...inlineVendor, gstNumber: e.target.value})}
                          placeholder="Enter GST number"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" 
                        />
                      </div>

                      {/* Address */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Address</label>
                        <input 
                          type="text" 
                          value={inlineVendor.address} 
                          onChange={e => setInlineVendor({...inlineVendor, address: e.target.value})}
                          placeholder="Enter address"
                          className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" 
                        />
                      </div>
                    </>
                  ) : (
                    /* Select Existing Vendor Dropdown */
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700">Vendor *</label>
                      <select value={form.vendorId} onChange={e => onVendorSelect(e.target.value)}
                        className="w-full bg-white hover:bg-slate-50/50 rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" required>
                        <option value="">Select vendor</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName}</option>)}
                      </select>
                    </div>
                  )}
                  
                  {/* Tax & Discounts */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Tax & Discounts</label>
                    <input 
                      type="text" 
                      value={form.taxDiscount || ''} 
                      onChange={e => setForm({...form, taxDiscount: e.target.value})}
                      placeholder="Enter tax/discount %"
                      className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" 
                    />
                  </div>

                  {/* Expected Delivery Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Expected Delivery Date</label>
                    <input type="date" value={form.expectedDelivery} onChange={e => setForm({...form, expectedDelivery: e.target.value})}
                      className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm" required />
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-700">Notes</label>
                    <textarea 
                      rows={3} 
                      value={form.remarks} 
                      onChange={e => setForm({...form, remarks: e.target.value})}
                      placeholder={poType === 'DIRECT' ? "Add direct procurement notes..." : "Add procurement notes..."}
                      className="w-full bg-white rounded-lg px-4 py-2.5 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none shadow-sm placeholder:text-slate-400" 
                    />
                  </div>
                </div>
              </div>

              {/* Attachments Section */}
              <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                <h2 className="text-base font-bold text-slate-900">Attachments</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* First Box: Market Bills / Vendor Quotations */}
                  <div className="relative">
                    <input 
                      type="file" 
                      id="vendorQuotations" 
                      onChange={e => handleAttachmentChange('vendorQuotations', e.target.files[0])} 
                      className="hidden" 
                    />
                    {attachments.vendorQuotations ? (
                      <div className="border border-emerald-200 bg-emerald-50/10 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-3 relative group transition-all min-h-[120px]">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAttachment('vendorQuotations')}
                          className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <FileText className="text-emerald-600" size={24} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{attachments.vendorQuotations.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {poType === 'DIRECT' ? 'Market Bills' : 'Vendor Quotations'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label 
                        htmlFor="vendorQuotations"
                        className="cursor-pointer border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 min-h-[120px] bg-slate-50/30"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">
                          {poType === 'DIRECT' ? 'Market Bills' : 'Vendor Quotations'}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Second Box: Vendor Quotations / Bills */}
                  <div className="relative">
                    <input 
                      type="file" 
                      id="bills" 
                      onChange={e => handleAttachmentChange('bills', e.target.files[0])} 
                      className="hidden" 
                    />
                    {attachments.bills ? (
                      <div className="border border-emerald-200 bg-emerald-50/10 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-3 relative group transition-all min-h-[120px]">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAttachment('bills')}
                          className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <FileText className="text-emerald-600" size={24} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{attachments.bills.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {poType === 'DIRECT' ? 'Vendor Quotations' : 'Bills'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <label 
                        htmlFor="bills"
                        className="cursor-pointer border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 min-h-[120px] bg-slate-50/30"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">
                          {poType === 'DIRECT' ? 'Vendor Quotations' : 'Bills'}
                        </span>
                      </label>
                    )}
                  </div>

                  {/* Third Box: Supporting Documents */}
                  <div className="relative">
                    <input 
                      type="file" 
                      id="supportingDocs" 
                      onChange={e => handleAttachmentChange('supportingDocs', e.target.files[0])} 
                      className="hidden" 
                    />
                    {attachments.supportingDocs ? (
                      <div className="border border-emerald-200 bg-emerald-50/10 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-3 relative group transition-all min-h-[120px]">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveAttachment('supportingDocs')}
                          className="absolute top-2 right-2 p-1 bg-slate-100 text-slate-500 rounded-full hover:bg-rose-500 hover:text-white transition-colors shadow-sm"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                        <FileText className="text-emerald-600" size={24} />
                        <div className="space-y-0.5">
                          <p className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">{attachments.supportingDocs.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium">Supporting Documents</p>
                        </div>
                      </div>
                    ) : (
                      <label 
                        htmlFor="supportingDocs"
                        className="cursor-pointer border border-dashed border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/5 rounded-lg p-5 flex flex-col items-center justify-center text-center space-y-2 transition-all duration-200 min-h-[120px] bg-slate-50/30"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-xs font-semibold text-slate-600">Supporting Documents</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Items / Order Components Section */}
              {poType === 'DIRECT' ? (
                /* Direct PO Items spreadsheet Card */
                <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-base font-bold text-slate-900">Items</h2>
                    <button 
                      type="button"
                      onClick={handleAddDirectItem}
                      className="flex items-center gap-1.5 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-95 border border-emerald-100"
                    >
                      <Plus size={14} strokeWidth={2.5} /> Add Item
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-150 bg-slate-50/50">
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider">Item Name</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center w-24">Quantity</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center w-24">Unit</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center w-32">Purchase Rate</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center w-24">Tax (%)</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-center w-24">Discount (%)</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-right w-32">Total Value</th>
                          <th className="px-4 py-3 text-xs font-black text-slate-600 uppercase tracking-wider text-right w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {form.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/20 transition-all duration-150">
                            {/* Item Name */}
                            <td className="px-4 py-3.5">
                              <div className="relative">
                                <input 
                                  type="text" 
                                  list={`products-datalist-${idx}`}
                                  value={item.name || ''} 
                                  onChange={e => handleDirectItemChange(idx, 'name', e.target.value)}
                                  placeholder="Enter or select item"
                                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all shadow-sm"
                                  required
                                />
                                <datalist id={`products-datalist-${idx}`}>
                                  {mappedItems.map(p => (
                                    <option key={p.productId} value={p.name}>
                                      {p.skuCode} - {p.name} ({p.weight || 'N/A'})
                                    </option>
                                  ))}
                                </datalist>
                              </div>
                            </td>

                            {/* Quantity */}
                            <td className="px-4 py-3.5 text-center">
                              <input 
                                type="number" 
                                min="1" 
                                value={item.quantity || 1} 
                                onChange={e => handleDirectItemChange(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 text-center outline-none transition-all"
                                required
                              />
                            </td>

                            {/* Unit */}
                            <td className="px-4 py-3.5 text-center">
                              <select 
                                value={item.unit || 'KG'} 
                                onChange={e => handleDirectItemChange(idx, 'unit', e.target.value)}
                                className="w-full bg-white rounded-lg px-2 py-2 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                              >
                                <option value="KG">KG</option>
                                <option value="PCS">PCS</option>
                                <option value="PACK">PACK</option>
                                <option value="BOX">BOX</option>
                                <option value="LTR">LTR</option>
                                <option value="GRAMS">GRAMS</option>
                              </select>
                            </td>

                            {/* Purchase Rate */}
                            <td className="px-4 py-3.5 text-center">
                              <div className="relative flex items-center">
                                <span className="absolute left-3 text-slate-400 text-sm font-semibold">₹</span>
                                <input 
                                  type="number" 
                                  min="0" 
                                  step="any" 
                                  value={item.rate || ''} 
                                  placeholder="0"
                                  onChange={e => handleDirectItemChange(idx, 'rate', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-white rounded-lg pl-6 pr-3 py-2 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                                  required
                                />
                              </div>
                            </td>

                            {/* Tax (%) */}
                            <td className="px-4 py-3.5 text-center">
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={item.tax || 0} 
                                onChange={e => handleDirectItemChange(idx, 'tax', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 text-center outline-none transition-all"
                              />
                            </td>

                            {/* Discount (%) */}
                            <td className="px-4 py-3.5 text-center">
                              <input 
                                type="number" 
                                min="0" 
                                max="100" 
                                value={item.discount || 0} 
                                onChange={e => handleDirectItemChange(idx, 'discount', parseFloat(e.target.value) || 0)}
                                className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-850 border border-slate-200 focus:border-emerald-500 text-center outline-none transition-all"
                              />
                            </td>

                            {/* Total Value */}
                            <td className="px-4 py-3.5 text-right font-bold text-slate-900 text-sm">
                              ₹{(() => {
                                const base = (item.quantity || 0) * (item.rate || 0);
                                const disc = base * ((item.discount || 0) / 100);
                                const tax = (base - disc) * ((item.tax || 0) / 100);
                                return base - disc + tax;
                              })().toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>

                            {/* Remove Row */}
                            <td className="px-4 py-3.5 text-right">
                              {form.items.length > 1 && (
                                <button 
                                  type="button" 
                                  onClick={() => handleRemoveDirectItem(idx)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                >
                                  <Trash2 size={15} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Grand total purchase value row */}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-6">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Purchase Value</span>
                    <span className="text-xl font-black text-emerald-600">
                      ₹{poTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ) : (
                /* Order Components Section (Requisition PO) */
                <div className="bg-white rounded-xl border border-slate-200/60 p-6 md:p-8 space-y-6 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <h2 className="text-base font-bold text-slate-900">Order Components</h2>
                    <div className="relative w-72">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                        placeholder="Filter items by name or SKU..."
                        value={itemSearch}
                        onChange={e => setItemSearch(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-400 text-slate-850"
                      />
                    </div>
                  </div>

                  {/* Grouped Items List */}
                  <div className="space-y-4">
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
                        const qty = parseFloat(fi?.quantity || 0);
                        const rate = parseFloat(fi?.rate || 0);
                        const discount = parseFloat(fi?.discount || 0);
                        const tax = parseFloat(fi?.tax || 0);
                        const baseVal = qty * rate;
                        const discVal = baseVal * (discount / 100);
                        const taxVal = (baseVal - discVal) * (tax / 100);
                        return s + (baseVal - discVal + taxVal);
                      }, 0);

                      return (
                        <div key={category} className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                          <div className="bg-emerald-50/50 px-8 py-2 flex items-center justify-between border-b border-emerald-100/30">
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
                                <p className="text-sm font-black text-emerald-600">₹{catTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                              </div>
                            </div>
                          </div>

                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-gray-50/50 bg-gray-50/30">
                                  <th className="px-8 py-2 text-left text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Procurement Item</th>
                                  <th className="px-8 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Purchase Rate</th>
                                  <th className="px-8 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Inventory Qty</th>
                                  <th className="px-8 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Tax (%)</th>
                                  <th className="px-8 py-2 text-center text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Discount (%)</th>
                                  <th className="px-8 py-2 text-right text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Valuation</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50/50">
                                {items.map(item => {
                                  const inForm = form.items.find(i => i.productId === item.productId);
                                  return (
                                    <tr key={item.productId} className={`transition-all duration-300 ${inForm ? 'bg-emerald-50/5' : 'bg-transparent hover:bg-gray-50/30'}`}>
                                      <td className="px-8 py-1.5">
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
                                      <td className="px-8 py-1.5 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 bg-white border border-gray-100 rounded-xl shadow-sm transition-all ${inForm ? 'ring-2 ring-emerald-500/10 border-emerald-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                          <span className="text-[10px] font-black text-gray-400 mr-1.5">₹</span>
                                          <input 
                                            type="number" 
                                            value={inForm ? inForm.rate : item.purchasePrice} 
                                            onChange={e => updateItemField(item.productId, 'rate', e.target.value)}
                                            disabled={!inForm}
                                            className="bg-transparent border-none p-0 text-sm font-black text-gray-700 w-16 text-center focus:ring-0 focus:outline-none"
                                          />
                                        </div>
                                      </td>
                                      <td className="px-8 py-1.5 text-center">
                                        <div className={`inline-flex items-center gap-3 px-2 py-1 bg-white border border-gray-100 rounded-xl shadow-sm transition-all ${inForm ? 'ring-2 ring-emerald-500/10 border-emerald-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                          <button 
                                            type="button" 
                                            onClick={() => updateItemField(item.productId, 'quantity', Math.max(1, (parseInt(inForm?.quantity || 1) - 1)))}
                                            disabled={!inForm}
                                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                                          >
                                            <span className="text-lg font-light">-</span>
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
                                            className="w-6 h-6 flex items-center justify-center rounded-lg bg-gray-50 border border-gray-100 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                                          >
                                            <span className="text-lg font-light">+</span>
                                          </button>
                                        </div>
                                      </td>
                                      <td className="px-8 py-1.5 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 bg-white border border-gray-100 rounded-xl shadow-sm transition-all ${inForm ? 'ring-2 ring-emerald-500/10 border-emerald-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                          <input 
                                            type="number" 
                                            value={inForm ? (inForm.tax !== undefined ? inForm.tax : 0) : 0} 
                                            onChange={e => updateItemField(item.productId, 'tax', e.target.value)}
                                            disabled={!inForm}
                                            placeholder="0"
                                            className="bg-transparent border-none p-0 text-sm font-black text-gray-700 w-12 text-center focus:ring-0 focus:outline-none"
                                          />
                                          <span className="text-[10px] font-black text-gray-400 ml-1">%</span>
                                        </div>
                                      </td>
                                      <td className="px-8 py-1.5 text-center">
                                        <div className={`inline-flex items-center px-3 py-1 bg-white border border-gray-100 rounded-xl shadow-sm transition-all ${inForm ? 'ring-2 ring-emerald-500/10 border-emerald-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                                          <input 
                                            type="number" 
                                            value={inForm ? (inForm.discount !== undefined ? inForm.discount : 0) : 0} 
                                            onChange={e => updateItemField(item.productId, 'discount', e.target.value)}
                                            disabled={!inForm}
                                            placeholder="0"
                                            className="bg-transparent border-none p-0 text-sm font-black text-gray-700 w-12 text-center focus:ring-0 focus:outline-none"
                                          />
                                          <span className="text-[10px] font-black text-gray-400 ml-1">%</span>
                                        </div>
                                      </td>
                                      <td className="px-8 py-1.5 text-right">
                                        <span className="text-base font-black text-gray-900 tracking-tighter">
                                          ₹{(() => {
                                            const qty = parseFloat(inForm?.quantity || 0);
                                            const rate = parseFloat(inForm?.rate || 0);
                                            const discount = parseFloat(inForm?.discount || 0);
                                            const tax = parseFloat(inForm?.tax || 0);
                                            const baseVal = qty * rate;
                                            const discVal = baseVal * (discount / 100);
                                            const taxVal = (baseVal - discVal) * (tax / 100);
                                            const totalVal = baseVal - discVal + taxVal;
                                            return totalVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                          })()}
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
              )}

            </div>

            {/* Floating Action Footer - Permanently Docked */}
            <div className="bg-white border-t border-slate-200/80 px-10 py-4 flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="h-10 px-4 bg-white text-slate-700 rounded-lg border border-slate-200 font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              {form.id ? (
                <button 
                  type="submit" 
                  className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-95"
                >
                  Save Changes
                </button>
              ) : (
                <>
                  <button 
                    type="submit" 
                    onClick={() => setIsSubmitDraft(true)}
                    className="h-10 px-4 bg-white border border-slate-200 text-slate-700 rounded-lg font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all active:scale-95"
                  >
                    Save Draft
                  </button>
                  <button 
                    type="submit" 
                    onClick={() => setIsSubmitDraft(false)}
                    className="h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-md transition-all active:scale-95"
                  >
                    Create PO
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Inline Add New Vendor Modal */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl p-6 md:p-8 border border-slate-200 shadow-2xl space-y-5 flex flex-col relative transform hover:scale-[1.01] transition-transform">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="text-emerald-600" size={20} />
                <h3 className="text-base font-bold text-slate-900">Onboard New Vendor</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowAddVendorModal(false);
                  setNewVendorForm({ vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
                }}
                className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { data } = await procurementAPI.createVendor(newVendorForm);
                  toast.success('Vendor onboarding complete!');
                  
                  // Reload active vendors
                  const vendorsRes = await procurementAPI.getVendors({ status: 'ACTIVE' });
                  setVendors(vendorsRes.data);
                  
                  // Auto-select the newly created vendor
                  setForm(f => ({ ...f, vendorId: data.id }));
                  
                  // Close and clean up
                  setShowAddVendorModal(false);
                  setNewVendorForm({ vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
                } catch (err) {
                  toast.error(err.response?.data?.message || 'Error registering vendor');
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Business Name *</label>
                <input 
                  type="text"
                  required
                  value={newVendorForm.vendorName}
                  onChange={e => setNewVendorForm({ ...newVendorForm, vendorName: e.target.value })}
                  placeholder="e.g. Fresh Farms Agro"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Primary Contact No. *</label>
                <input 
                  type="text"
                  required
                  value={newVendorForm.mobile}
                  onChange={e => setNewVendorForm({ ...newVendorForm, mobile: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Contact Person Name</label>
                <input 
                  type="text"
                  value={newVendorForm.contactPerson}
                  onChange={e => setNewVendorForm({ ...newVendorForm, contactPerson: e.target.value })}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Credit Days</label>
                  <input 
                    type="number"
                    value={newVendorForm.creditDays}
                    onChange={e => setNewVendorForm({ ...newVendorForm, creditDays: e.target.value })}
                    placeholder="30"
                    className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Opening Balance</label>
                  <input 
                    type="number"
                    value={newVendorForm.openingBalance}
                    onChange={e => setNewVendorForm({ ...newVendorForm, openingBalance: e.target.value })}
                    placeholder="0.00"
                    className="w-full bg-white rounded-lg px-3 py-2 text-sm text-slate-800 border border-slate-200 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  onClick={() => {
                    setShowAddVendorModal(false);
                    setNewVendorForm({ vendorName: '', mobile: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
                  }}
                  className="h-9 px-4 bg-white text-slate-700 rounded-lg border border-slate-200 font-semibold text-sm hover:bg-slate-50 shadow-sm transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="h-9 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-95"
                >
                  Register Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PurchaseOrdersSection;
