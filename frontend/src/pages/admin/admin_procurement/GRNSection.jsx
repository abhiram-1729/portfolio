import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, X, ChevronRight, Loader2, Trash2, History, PackageCheck, Edit3, FileText, Upload, 
  Paperclip, File, Trash, CheckCircle2, ShoppingCart, MapPin, ShieldCheck, Package, 
  AlertTriangle, MinusCircle, Timer, MessageSquare, FileX, Printer, Download, ShieldCheck as ShieldCheckIcon
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { adminAPI } from '../../../services/adminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const GRNSection = ({ can, storeId, setHideMainHeader }) => {
  const [view, setView] = useState('receive'); // 'receive' or 'history' or 'report'
  const [pos, setPOs] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [grnItems, setGRNItems] = useState([]);
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
      const [poData, grnData] = await Promise.all([
        procurementAPI.getPurchaseOrders({ storeId }),
        procurementAPI.getGRNs({ storeId })
      ]);
      setPOs((poData.data || poData).filter(po => po.status === 'APPROVED' || po.status === 'ORDERED' || po.status === 'PARTIAL'));
      setGRNs(grnData.data || grnData);
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleViewReport = (grn) => {
    setSelectedReport(grn);
    setView('report');
    setHideMainHeader?.(true);
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
    setView('receive');
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

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-2 custom-scrollbar space-y-4">
      {/* View Toggle */}
      {view !== 'report' && (
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
      )}

      {view === 'receive' && (
        <>
          {!selectedPO ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-6">
              {pos.length === 0 ? (
                <div className="p-20 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
                  <Truck size={64} className="mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
                  <h3 className="text-xl font-black text-gray-300 uppercase tracking-tighter">No Open Purchase Orders</h3>
                  <p className="text-sm font-bold text-gray-400 mt-2">All orders have been received or closed.</p>
                </div>
              ) : (
                <div className="overflow-x-auto custom-scrollbar w-full">
                  <table className="w-max min-w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 whitespace-nowrap">
                        <th className="px-6 py-4 whitespace-nowrap">PO Details</th>
                        <th className="px-6 py-4 whitespace-nowrap">Vendor</th>
                        <th className="px-6 py-4 whitespace-nowrap">ETA / Delivery Date</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Items</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Delivery Status</th>
                        <th className="px-6 py-4 text-center whitespace-nowrap">Verification Status</th>
                        <th className="px-6 py-4 text-right whitespace-nowrap sticky right-0 bg-gray-50 z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {pos.map(po => (
                        <tr
                          key={po.id}
                          className="group hover:bg-emerald-50/30 transition-all cursor-pointer"
                        >
                          <td className="px-6 py-6" onClick={() => selectPO(po.id)}>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">
                                PO-{po.displayId}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400">₹{po.totalAmount?.toLocaleString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 tracking-tight">{po.vendor?.vendorName}</span>
                              <span className="text-[10px] font-bold text-gray-400">{po.vendor?.phone || '+91 XXXXX XXXXX'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 tracking-tight">
                                {format(new Date(po.poDate), 'yyyy-MM-dd')}
                              </span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase">
                                {format(new Date(po.poDate), 'hh:mm a')}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <div className="inline-flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                              <PackageCheck size={14} className="text-gray-400" />
                              <span className="text-xs font-black text-gray-900">{po.items?.length || 0}</span>
                            </div>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-full border uppercase tracking-widest ${po.status === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                : po.status === 'ORDERED'
                                  ? 'bg-blue-50 text-blue-600 border-blue-100'
                                  : 'bg-amber-50 text-amber-600 border-amber-100'
                              }`}>
                              {po.status === 'ORDERED' ? 'Arrived' : po.status}
                            </span>
                          </td>
                          <td className="px-6 py-6 text-center">
                            <span className="text-[10px] font-black px-4 py-1.5 bg-amber-50 text-amber-600 border border-amber-100 rounded-full uppercase tracking-widest">
                              Pending
                            </span>
                          </td>
                          <td className="px-6 py-6 text-right sticky right-0 bg-white group-hover:bg-emerald-50/50 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">
                            <button
                              onClick={() => selectPO(po.id)}
                              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95 shadow-sm"
                            >
                              <PackageCheck size={14} strokeWidth={3} />
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
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
              {/* Header / Back */}
              <div className="flex flex-col gap-6">
                <button
                  onClick={() => { setSelectedPO(null); setPODetail(null); setEditGRN(null); }}
                  className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:translate-x-[-4px] transition-all w-fit"
                >
                  <ChevronRight size={14} className="rotate-180" strokeWidth={3} />
                  Back to Receive Goods
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase">
                      GRN for PO #{poDetail?.displayId}
                    </h2>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <span>Vendor: <span className="text-gray-900">{poDetail?.vendor?.vendorName}</span></span>
                      <span>Delivery Date: <span className="text-gray-900">{poDetail?.poDate ? format(new Date(poDetail.poDate), 'yyyy-MM-dd, hh:mm a') : 'N/A'}</span></span>
                      <div className="flex items-center gap-2">
                        <span>Challan:</span>
                        <input
                          type="text"
                          placeholder="CH-2024-XXXX"
                          className="bg-gray-50 border-none rounded-lg px-3 py-1 text-[10px] font-black text-gray-900 focus:ring-1 focus:ring-emerald-500 w-32 placeholder:text-gray-300"
                          value={poDetail?.challanId || ''}
                          onChange={(e) => setPODetail({ ...poDetail, challanId: e.target.value })}
                        />
                      </div>
                      <span className="px-3 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-full">Pending Verification</span>
                    </div>
                  </div>
                </div>
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
                    value={poDetail?.remarks || ''}
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
          )}</>)}

      {view === 'history' && (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden p-6">
          {grns.length === 0 ? (
            <div className="p-20 border-2 border-dashed border-gray-100 rounded-[2rem] text-center">
              <History size={64} className="mx-auto text-gray-200 mb-4" strokeWidth={1.5} />
              <h3 className="text-xl font-black text-gray-300 uppercase tracking-tighter">No Receipt History</h3>
              <p className="text-sm font-bold text-gray-400 mt-2">Historical records of received goods will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar w-full">
              <table className="w-max min-w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 whitespace-nowrap">
                    <th className="px-6 py-5 whitespace-nowrap">GRN ID</th>
                    <th className="px-6 py-5 whitespace-nowrap">Related PO</th>
                    <th className="px-6 py-5 whitespace-nowrap">Vendor</th>
                    <th className="px-6 py-5 whitespace-nowrap">Date & Time</th>
                    <th className="px-6 py-5 whitespace-nowrap">Verification</th>
                    <th className="px-6 py-5 text-center whitespace-nowrap">Alerts</th>
                    <th className="px-6 py-5 text-center whitespace-nowrap">Accepted Qty</th>
                    <th className="px-6 py-5 text-center whitespace-nowrap">Status</th>
                    <th className="px-6 py-5 text-right whitespace-nowrap sticky right-0 bg-gray-50 z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grns.map(grn => {
                    const totalDamaged = grn.items?.reduce((acc, i) => acc + (i.damagedQty || 0), 0) || 0;
                    const totalMissing = grn.items?.reduce((acc, i) => acc + (i.missingQty || 0), 0) || 0;
                    const totalDiscrepancies = totalDamaged + totalMissing;
                    const totalAccepted = grn.items?.reduce((acc, i) => acc + (i.receivedQty || 0) - (i.damagedQty || 0), 0) || 0;
                    const isFullyAccepted = totalDiscrepancies === 0;

                    return (
                      <tr key={grn.id} className="group hover:bg-gray-50/50 transition-all whitespace-nowrap">
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className="text-sm font-black text-gray-900 uppercase tracking-tight">GRN-{grn.displayId}</span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className="text-[11px] font-bold text-gray-500 uppercase">PO-{grn.po?.displayId}</span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className="text-sm font-black text-gray-900 tracking-tight">{grn.po?.vendor?.vendorName}</span>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[11px] font-black text-gray-900 tracking-tight">{format(new Date(grn.createdAt), 'dd MMM yy, hh:mm a')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 whitespace-nowrap">
                          <span className={`text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded ${isFullyAccepted ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'}`}>
                            {isFullyAccepted ? 'Fully Accepted' : 'Partial'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-center whitespace-nowrap">
                          {totalDiscrepancies > 0 ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black border border-rose-100 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                              {totalDiscrepancies} Issue
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">None</span>
                          )}
                        </td>
                        <td className="px-4 py-5 text-center whitespace-nowrap">
                          <span className="text-xs font-black text-gray-900">{totalAccepted}</span>
                        </td>
                        <td className="px-6 py-6 text-center">
                          <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-lg border tracking-widest ${grn.status === 'COMPLETE'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                            {grn.status === 'COMPLETE' ? 'Completed' : 'Partial'}
                          </span>
                        </td>
                        <td className="px-6 py-6 text-right sticky right-0 bg-white group-hover:bg-gray-50/50 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleViewReport(grn)}
                              className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-all shadow-sm active:scale-95"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handlePrintReport(grn)}
                              className="px-3 py-1.5 bg-white border border-gray-100 rounded-lg text-[9px] font-black text-gray-400 uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm active:scale-95"
                            >
                              PDF
                            </button>
                            {can('PROCUREMENT', 'DELETE', 'GRN') && (
                              <button
                                onClick={() => handleDeleteGRN(grn.id)}
                                className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 size={12} />
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
                <p className="text-base font-bold text-gray-900 uppercase">GRN-{selectedReport.displayId}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Related PO</span>
                <p className="text-base font-bold text-gray-900 uppercase">PO-{selectedReport.po?.displayId}</p>
              </div>
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Vendor</span>
                <p className="text-base font-bold text-gray-900 uppercase">{selectedReport.po?.vendor?.vendorName}</p>
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
    </div>
  );
};

export default GRNSection;
