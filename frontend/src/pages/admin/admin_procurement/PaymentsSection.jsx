import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Search, Loader2, X, Trash2, Eye, Download
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PaymentsSection = ({ can }) => {
  const [payments, setPayments] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [form, setForm] = useState({
    vendorId: '', amount: '', mode: 'CASH', referenceNo: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'), invoiceId: '', remarks: ''
  });
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'PAID', 'PARTIAL', 'UNPAID', 'OVERDUE'

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [pmtsRes, purchRes] = await Promise.all([
          procurementAPI.getPayments(),
          procurementAPI.getPurchases()
        ]);
        setPayments(pmtsRes.data || []);
        setPurchases(purchRes.data || []);
      } catch { 
        toast.error('Failed to load payment tracking data'); 
      } finally { 
        setLoading(false); 
      }
    };
    load();
  }, []);

  const openForm = async () => {
    try {
      const { data } = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(data);
      setForm({ 
        vendorId: '', amount: '', mode: 'CASH', referenceNo: '', 
        paymentDate: format(new Date(), 'yyyy-MM-dd'), invoiceId: '', remarks: '' 
      });
      setOutstanding([]);
      setShowForm(true);
    } catch { toast.error('Failed to load vendors'); }
  };

  const onVendorSelect = async (vendorId) => {
    console.log("onVendorSelect triggered for vendorId:", vendorId);
    setForm(f => ({ ...f, vendorId, invoiceId: '', amount: '' }));
    if (!vendorId) {
      console.log("Empty vendorId selected, clearing outstanding list.");
      setOutstanding([]);
      return;
    }
    try {
      console.log("Calling getOutstandingInvoices for:", vendorId);
      const { data } = await procurementAPI.getOutstandingInvoices(vendorId);
      console.log("getOutstandingInvoices returned:", data);
      setOutstanding(data);
    } catch (err) {
      console.error("Error loading outstanding invoices in frontend:", err.response || err);
      toast.error(`Error loading invoices: ${err.response?.data?.message || err.message}`);
      setOutstanding([]);
    }
  };

  const onInvoiceSelect = (invoiceId) => {
    const selected = outstanding.find(inv => inv.id === invoiceId);
    setForm(f => ({
      ...f,
      invoiceId,
      amount: selected ? String(selected.outstanding) : ''
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.amount) return toast.error('Fill required fields');
    try {
      await procurementAPI.createPayment({
        ...form,
        amount: parseFloat(form.amount)
      });
      toast.success('Payment recorded');
      setShowForm(false);
      setForm({ 
        vendorId: '', amount: '', mode: 'CASH', referenceNo: '', 
        paymentDate: format(new Date(), 'yyyy-MM-dd'), invoiceId: '', remarks: '' 
      });
      setOutstanding([]);
      
      // Reload lists
      const [pmtsRes, purchRes] = await Promise.all([
        procurementAPI.getPayments(),
        procurementAPI.getPurchases()
      ]);
      setPayments(pmtsRes.data || []);
      setPurchases(purchRes.data || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Payment error'); }
  };

  const handleDeletePayment = async (id) => {
    if (!window.confirm('Are you sure you want to delete this payment? This will revert vendor balance and invoice allocations.')) return;
    try {
      await procurementAPI.deletePayment(id);
      toast.success('Payment deleted');
      
      // Reload lists
      const [pmtsRes, purchRes] = await Promise.all([
        procurementAPI.getPayments(),
        procurementAPI.getPurchases()
      ]);
      setPayments(pmtsRes.data || []);
      setPurchases(purchRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting payment');
    }
  };

  // Compile Unified Payment Tracking Records
  const trackingItems = [];

  // 1. Add recorded payment events
  payments.forEach(p => {
    const firstAllocation = p.allocations?.[0];
    const invoice = p.invoice || firstAllocation?.invoice;
    
    let outstandingVal = 0;
    let dueDateVal = null;
    let invoiceNumberVal = 'Advance';
    let statusText = 'Paid';

    if (!p.isAdvance && invoice) {
      outstandingVal = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      invoiceNumberVal = invoice.invoiceNumber;
      dueDateVal = invoice.dueDate || invoice.invoiceDate;
      statusText = outstandingVal === 0 ? 'Paid' : 'Partial';
    }

    trackingItems.push({
      id: `pay-${p.id}`,
      dbId: p.id,
      displayId: p.displayId || `PAY-${p.id.slice(-5).toUpperCase()}`,
      invoiceNumber: invoiceNumberVal,
      vendorName: p.vendor?.vendorName || 'Unknown Vendor',
      mobile: p.vendor?.mobile || '',
      paymentType: p.mode,
      amount: p.amount,
      outstanding: outstandingVal,
      paymentDate: p.paymentDate,
      dueDate: dueDateVal,
      status: statusText,
      type: 'PAYMENT',
      raw: p
    });
  });

  // 2. Add outstanding/unpaid invoice records
  purchases.forEach(inv => {
    if (inv.status === 'DRAFT') return;
    if (inv.status === 'PAID') return;

    const creditDays = inv.vendor?.creditDays || 30;
    const computedDueDate = inv.dueDate ? new Date(inv.dueDate) : new Date(new Date(inv.invoiceDate).getTime() + creditDays * 86400000);
    const isOverdue = computedDueDate < new Date() && (inv.totalAmount - inv.paidAmount) > 0;

    let statusText = 'Unpaid';
    if (isOverdue) {
      statusText = 'Overdue';
    } else if (inv.status === 'PARTIAL_PAID' || inv.paidAmount > 0) {
      statusText = 'Partial';
    }

    trackingItems.push({
      id: `inv-${inv.id}`,
      dbId: inv.id,
      displayId: inv.displayId || `PINV-${inv.id.slice(-5).toUpperCase()}`,
      invoiceNumber: inv.invoiceNumber,
      vendorName: inv.vendor?.vendorName || 'Unknown Vendor',
      mobile: inv.vendor?.mobile || '',
      paymentType: null,
      amount: null,
      outstanding: inv.totalAmount - inv.paidAmount,
      paymentDate: null,
      dueDate: computedDueDate,
      status: statusText,
      type: 'INVOICE',
      raw: inv
    });
  });

  // Sort by date desc
  trackingItems.sort((a, b) => {
    const dateA = a.paymentDate ? new Date(a.paymentDate) : (a.dueDate ? new Date(a.dueDate) : new Date(0));
    const dateB = b.paymentDate ? new Date(b.paymentDate) : (b.dueDate ? new Date(b.dueDate) : new Date(0));
    return dateB - dateA;
  });

  // Filter list
  const filteredTrackingItems = trackingItems.filter(item => {
    const matchesSearch = !search || 
      item.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      item.displayId.toLowerCase().includes(search.toLowerCase()) ||
      item.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      (item.paymentType && item.paymentType.toLowerCase().includes(search.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'PAID') {
      matchesStatus = item.status === 'Paid';
    } else if (statusFilter === 'PARTIAL') {
      matchesStatus = item.status === 'Partial';
    } else if (statusFilter === 'UNPAID') {
      matchesStatus = item.status === 'Unpaid';
    } else if (statusFilter === 'OVERDUE') {
      matchesStatus = item.status === 'Overdue';
    }

    return matchesSearch && matchesStatus;
  });

  const handleExportPayments = () => {
    if (filteredTrackingItems.length === 0) return;
    const headers = ['Payment ID', 'Invoice Reference', 'Vendor', 'Mobile', 'Payment Type', 'Amount', 'Outstanding', 'Payment Date', 'Due Date', 'Status'];
    const rows = filteredTrackingItems.map(item => [
      item.displayId,
      item.invoiceNumber,
      item.vendorName,
      item.mobile || '—',
      item.paymentType || '—',
      item.amount !== null ? `Rs. ${item.amount}` : '—',
      `Rs. ${item.outstanding}`,
      item.paymentDate ? format(new Date(item.paymentDate), 'dd MMM yyyy') : '—',
      item.dueDate ? format(new Date(item.dueDate), 'dd MMM yyyy') : '—',
      item.status
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `payment_tracking_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentTypeBadge = (mode) => {
    if (!mode) return <span className="text-gray-400">—</span>;
    const name = mode === 'BANK' ? 'Bank Transfer' : mode === 'UPI' ? 'UPI' : mode === 'CASH' ? 'Cash' : mode === 'CHEQUE' ? 'Cheque' : mode;
    return (
      <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-semibold">
        {name}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    if (status === 'Paid') {
      return (
        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-semibold">
          Paid
        </span>
      );
    }
    if (status === 'Partial') {
      return (
        <span className="px-3 py-1 bg-orange-50 text-orange-500 rounded-lg text-xs font-semibold">
          Partial
        </span>
      );
    }
    if (status === 'Overdue') {
      return (
        <span className="px-3 py-1 bg-red-50 text-red-500 rounded-lg text-xs font-semibold">
          Overdue
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-gray-50 text-slate-400 rounded-lg text-xs font-semibold">
        Unpaid
      </span>
    );
  };

  const selectedInvoice = outstanding.find(inv => inv.id === form.invoiceId);
  const outstandingDisplay = selectedInvoice 
    ? `₹ ${selectedInvoice.outstanding.toLocaleString()}` 
    : '—';
  const dueDateDisplay = selectedInvoice 
    ? format(new Date(selectedInvoice.dueDate), 'yyyy-MM-dd') 
    : '—';

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h2 className="text-3xl font-black text-gray-950 tracking-tight">Payment Tracking</h2>
        <p className="text-sm font-bold text-gray-400 mt-1">Track vendor payments, outstanding balances, and payment activity.</p>
      </div>

      {/* Controls Dashboard */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left side: Search & Filter Tabs */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 flex-1">
          <div className="relative group min-w-[280px] max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input 
              placeholder="Search vendor or payment reference..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-gray-100 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400 shadow-inner" 
            />
          </div>

          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl self-start md:self-auto">
            {[
              { id: 'ALL', label: 'All Payments' },
              { id: 'PAID', label: 'Paid' },
              { id: 'PARTIAL', label: 'Partial' },
              { id: 'UNPAID', label: 'Unpaid' },
              { id: 'OVERDUE', label: 'Overdue' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                  statusFilter === f.id ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <button 
            onClick={handleExportPayments}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 active:scale-95 transition-all shadow-sm whitespace-nowrap"
          >
            <Download size={14} />
            Export Payments
          </button>
          {can('PROCUREMENT', 'CREATE', 'PAYMENTS') && (
            <button 
              onClick={openForm}
              className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10 active:scale-95 whitespace-nowrap"
            >
              <Plus size={16} strokeWidth={2.5} /> 
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : filteredTrackingItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <CreditCard size={48} className="mx-auto text-gray-200 mb-3 opacity-65" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching payments found</h3>
          <p className="text-[10px] text-gray-300 mt-1">Try adjusting your search query or filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100 whitespace-nowrap">
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Payment ID</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Vendor</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Payment Type</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Outstanding</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Payment Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Due Date</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-gray-500 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredTrackingItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50/20 transition-colors whitespace-nowrap align-middle">
                    {/* Payment ID */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-950">{item.displayId}</span>
                        <span className="text-[10px] text-gray-400 font-bold mt-0.5">{item.invoiceNumber}</span>
                      </div>
                    </td>
                    {/* Vendor */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-950">{item.vendorName}</span>
                        <span className="text-[10px] text-gray-400 font-bold mt-0.5">{item.mobile || '—'}</span>
                      </div>
                    </td>
                    {/* Payment Type */}
                    <td className="px-6 py-4">
                      {getPaymentTypeBadge(item.paymentType)}
                    </td>
                    {/* Amount */}
                    <td className="px-6 py-4 text-sm font-black text-gray-900">
                      {item.amount !== null ? `₹${item.amount.toLocaleString()}` : '—'}
                    </td>
                    {/* Outstanding */}
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${
                        item.outstanding > 0 ? 'text-orange-500' : 'text-gray-400'
                      }`}>
                        ₹{item.outstanding.toLocaleString()}
                      </span>
                    </td>
                    {/* Payment Date */}
                    <td className="px-6 py-4 text-xs font-bold text-gray-600">
                      {item.paymentDate ? format(new Date(item.paymentDate), 'dd MMM yyyy') : '—'}
                    </td>
                    {/* Due Date */}
                    <td className="px-6 py-4 text-xs font-bold">
                      {item.dueDate ? (
                        <span className={item.status === 'Overdue' ? 'text-red-500 font-black' : 'text-gray-600'}>
                          {format(new Date(item.dueDate), 'dd MMM yyyy')}
                        </span>
                      ) : '—'}
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      {getStatusBadge(item.status)}
                    </td>
                    {/* Actions */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {item.type === 'PAYMENT' && can('PROCUREMENT', 'DELETE', 'PAYMENTS') && (
                          <button 
                            onClick={() => handleDeletePayment(item.dbId)} 
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all active:scale-95" 
                            title="Delete Payment"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                        <button 
                          onClick={() => toast.success(`Details for ${item.displayId}`)}
                          className="inline-flex items-center justify-center p-2 rounded-xl border border-gray-200 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all active:scale-90"
                        >
                          <Eye size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl p-8 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowForm(false)} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={20} />
            </button>
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-900">Record Payment</h3>
              <p className="text-xs text-gray-400 mt-1 font-semibold">Record vendor payment transaction.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Left Column */}
                <div className="space-y-4">
                  {/* Vendor Select */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Vendor <span className="text-red-500">*</span></label>
                    <select 
                      value={form.vendorId} 
                      onChange={e => onVendorSelect(e.target.value)} 
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                    >
                      <option value="">Select vendor</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.vendorName} (Bal: ₹{Math.abs(v.currentBalance).toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Amount <span className="text-red-500">*</span></label>
                    <div className="relative group">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">₹</span>
                      <input 
                        type="number" 
                        step="any"
                        required 
                        placeholder="0.00"
                        value={form.amount} 
                        onChange={e => setForm({...form, amount: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all" 
                      />
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Payment Mode <span className="text-red-500">*</span></label>
                    <select 
                      value={form.mode} 
                      onChange={e => setForm({...form, mode: e.target.value})}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                    >
                      <option value="">Select payment mode</option>
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank</option>
                      <option value="UPI">UPI</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  {/* Payment Date */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Payment Date <span className="text-red-500">*</span></label>
                    <input 
                      type="date" 
                      required 
                      value={form.paymentDate} 
                      onChange={e => setForm({...form, paymentDate: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all" 
                    />
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  {/* Linked Invoice */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Linked Invoice / Purchase Entry</label>
                    <select 
                      value={form.invoiceId} 
                      onChange={e => onInvoiceSelect(e.target.value)}
                      disabled={!form.vendorId}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <option value="">Select invoice</option>
                      {outstanding.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          #{inv.invoiceNumber} (O/S: ₹{inv.outstanding.toLocaleString()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Outstanding Amount (Read-only) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Outstanding Amount</label>
                    <div className="w-full bg-slate-100/70 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-500 select-none">
                      {outstandingDisplay}
                    </div>
                  </div>

                  {/* Due Date (Read-only) */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Due Date</label>
                    <div className="w-full bg-slate-100/70 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-500 select-none">
                      {dueDateDisplay}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 pl-1">Remarks</label>
                    <textarea 
                      placeholder="Add payment notes or transaction remarks..." 
                      value={form.remarks} 
                      onChange={e => setForm({...form, remarks: e.target.value})}
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all resize-none placeholder:text-gray-400" 
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
                <button 
                  type="button" 
                  onClick={() => setShowForm(false)} 
                  className="px-6 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-slate-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/10 active:scale-95"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsSection;
