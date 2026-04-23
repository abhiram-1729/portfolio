import React, { useState, useEffect } from 'react';
import { 
  CreditCard, Plus, Search, Loader2, X
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const PaymentsSection = ({ can }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [form, setForm] = useState({
    vendorId: '', amount: '', mode: 'CASH', referenceNo: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'), invoiceIds: [], remarks: ''
  });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getPayments();
        setPayments(data);
      } catch { toast.error('Failed to load payments'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const openForm = async () => {
    try {
      const { data } = await procurementAPI.getVendors({ status: 'ACTIVE' });
      setVendors(data);
      setShowForm(true);
    } catch { toast.error('Failed to load vendors'); }
  };

  const onVendorSelect = async (vendorId) => {
    setForm(f => ({ ...f, vendorId, invoiceIds: [] }));
    if (!vendorId) { setOutstanding([]); return; }
    try {
      const { data } = await procurementAPI.getOutstandingInvoices(vendorId);
      setOutstanding(data);
    } catch { setOutstanding([]); }
  };

  const toggleInvoice = (invId) => {
    setForm(f => ({
      ...f,
      invoiceIds: f.invoiceIds.includes(invId)
        ? f.invoiceIds.filter(id => id !== invId)
        : [...f.invoiceIds, invId]
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
      setForm({ vendorId: '', amount: '', mode: 'CASH', referenceNo: '', paymentDate: format(new Date(), 'yyyy-MM-dd'), invoiceIds: [], remarks: '' });
      const { data } = await procurementAPI.getPayments();
      setPayments(data);
    } catch (err) { toast.error(err.response?.data?.message || 'Payment error'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/50 p-3 rounded-3xl border border-gray-100">
        <div className="relative group flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
          <input 
            placeholder="Search vendor or reference..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-xs font-black text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-300 shadow-sm" 
          />
        </div>
        {can('PROCUREMENT', 'UPDATE') && (
          <button onClick={openForm}
            className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 hover:-translate-y-0.5 active:translate-y-0">
            <Plus size={14} strokeWidth={3} /> Record Payment
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <CreditCard size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-black text-gray-300">No Payments Recorded</h3>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.filter(p => 
            !search || 
            p.vendor?.vendorName.toLowerCase().includes(search.toLowerCase()) ||
            p.referenceNo?.toLowerCase().includes(search.toLowerCase()) ||
            p.displayId?.toLowerCase().includes(search.toLowerCase())
          ).map(p => (
            <div key={p.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-5 flex items-center justify-between hover:border-emerald-100 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 overflow-hidden relative group">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-gray-900">₹{p.amount.toLocaleString()}</span>
                  {p.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">{p.displayId}</span>}
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${
                    p.mode === 'CASH' ? 'bg-emerald-50 text-emerald-600' : p.mode === 'UPI' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>{p.mode}</span>
                  {p.isAdvance && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-orange-50 text-orange-600">Advance</span>}
                </div>
                <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                  {p.vendor?.vendorName} • {format(new Date(p.paymentDate), 'dd MMM yyyy')}
                  {p.referenceNo && ` • Ref: ${p.referenceNo}`}
                </p>
              </div>
              {p.allocations?.length > 0 && (
                <div className="text-right">
                  <p className="text-[9px] font-bold text-gray-400">{p.allocations.length} invoice(s)</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Payment Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Record Payment</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>
                <select value={form.vendorId} onChange={e => onVendorSelect(e.target.value)} required
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                  <option value="">Select Vendor</option>
                  {vendors.map(v => <option key={v.id} value={v.id}>{v.vendorName} (Bal: ₹{Math.abs(v.currentBalance).toLocaleString()})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Amount *</label>
                  <input type="number" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Mode *</label>
                  <select value={form.mode} onChange={e => setForm({...form, mode: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Date</label>
                  <input type="date" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Ref No</label>
                  <input value={form.referenceNo} onChange={e => setForm({...form, referenceNo: e.target.value})}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              </div>
              {/* Outstanding Invoices */}
              {outstanding.length > 0 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Allocate to Invoices (optional)</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {outstanding.map(inv => (
                      <button key={inv.id} type="button" onClick={() => toggleInvoice(inv.id)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs font-bold transition-all flex justify-between ${
                          form.invoiceIds.includes(inv.id) ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'border-gray-100 text-gray-600'
                        }`}>
                        <span>#{inv.invoiceNumber} • {format(new Date(inv.invoiceDate), 'dd MMM')}</span>
                        <span className="text-red-600">₹{inv.outstanding.toLocaleString()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Remarks</label>
                <input value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})}
                  className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsSection;
