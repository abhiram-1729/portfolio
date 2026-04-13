import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Package, ClipboardList, Truck, Receipt, BookOpen,
  CreditCard, BarChart3, Plus, X, Search, Loader2, Edit3,
  ToggleLeft, ToggleRight, Eye, ChevronRight, AlertTriangle,
  CheckCircle2, Clock, ArrowUpRight, ArrowDownRight, Filter,
  FileText, DollarSign, TrendingUp, AlertCircle, Link2
} from 'lucide-react';
import { procurementAPI } from '../../services/procurementService';
import { adminAPI } from '../../services/adminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TABS = [
  { key: 'vendors', label: 'Vendors', icon: Users },
  { key: 'mapping', label: 'Item Mapping', icon: Link2 },
  { key: 'po', label: 'Purchase Orders', icon: ClipboardList },
  { key: 'grn', label: 'Goods Receipt', icon: Truck },
  { key: 'purchases', label: 'Purchases', icon: Receipt },
  { key: 'ledger', label: 'Stock Ledger', icon: BookOpen },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'reports', label: 'Reports', icon: BarChart3 },
];

// ─── MAIN COMPONENT ─────────────────────────────────────
export default function AdminProcurement() {
  const [activeTab, setActiveTab] = useState('vendors');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-gray-900 tracking-tight">Procurement & Payables</h2>
        <p className="text-sm text-gray-400 font-bold">Vendor → PO → GRN → Purchase → Stock → Payment</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1.5 bg-gray-100 p-1 rounded-2xl overflow-x-auto custom-scrollbar">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'vendors' && <VendorsTab />}
      {activeTab === 'mapping' && <MappingTab />}
      {activeTab === 'po' && <PurchaseOrdersTab />}
      {activeTab === 'grn' && <GRNTab />}
      {activeTab === 'purchases' && <PurchasesTab />}
      {activeTab === 'ledger' && <StockLedgerTab />}
      {activeTab === 'payments' && <PaymentsTab />}
      {activeTab === 'reports' && <ReportsTab />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── VENDORS TAB ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function VendorsTab() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editVendor, setEditVendor] = useState(null);
  const [ledgerView, setLedgerView] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [form, setForm] = useState({
    vendorName: '', mobile: '', email: '', address: '',
    gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0'
  });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procurementAPI.getVendors({ status: statusFilter || undefined });
      setVendors(data);
    } catch { toast.error('Failed to load vendors'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editVendor) {
        await procurementAPI.updateVendor(editVendor.id, form);
        toast.success('Vendor updated');
      } else {
        await procurementAPI.createVendor(form);
        toast.success('Vendor created');
      }
      setShowForm(false);
      setEditVendor(null);
      setForm({ vendorName: '', mobile: '', email: '', address: '', gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0' });
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving vendor');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await procurementAPI.toggleVendorStatus(id);
      toast.success('Vendor status updated');
      loadVendors();
    } catch { toast.error('Error updating status'); }
  };

  const openEdit = (v) => {
    setEditVendor(v);
    setForm({
      vendorName: v.vendorName, mobile: v.mobile, email: v.email || '',
      address: v.address || '', gstNumber: v.gstNumber || '',
      contactPerson: v.contactPerson || '', creditDays: String(v.creditDays),
      openingBalance: String(v.openingBalance)
    });
    setShowForm(true);
  };

  const openLedger = async (vendorId) => {
    try {
      const { data } = await procurementAPI.getVendorLedger(vendorId);
      setLedgerData(data);
      setLedgerView(vendorId);
    } catch { toast.error('Failed to load ledger'); }
  };

  const filtered = vendors.filter(v =>
    v.vendorName.toLowerCase().includes(search.toLowerCase()) ||
    v.mobile.includes(search)
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex-1 max-w-md">
          <Search size={16} className="text-gray-400 ml-2" />
          <input placeholder="Search vendors..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 w-full" />
        </div>
        <div className="flex gap-2">
          {['', 'ACTIVE', 'INACTIVE'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
              }`}>{s || 'All'}</button>
          ))}
          <button onClick={() => { setShowForm(true); setEditVendor(null); setForm({ vendorName: '', mobile: '', email: '', address: '', gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0' }); }}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
            <Plus size={16} /> Add Vendor
          </button>
        </div>
      </div>

      {/* Loader / Empty / Table */}
      {loading ? (
        <div className="flex flex-col items-center py-24 text-gray-400 gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={40} />
          <p className="font-black text-xs uppercase tracking-widest">Loading vendors...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center space-y-3">
          <Users size={48} className="mx-auto text-gray-200" />
          <h3 className="text-lg font-black text-gray-300">No Vendors Found</h3>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Mobile</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">GST</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Credit Days</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Balance</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div>
                        <span className="text-sm font-black text-gray-900">{v.vendorName}</span>
                        {v.contactPerson && <p className="text-[10px] text-gray-400 font-bold">{v.contactPerson}</p>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center text-xs font-bold text-gray-600">{v.mobile}</td>
                    <td className="px-5 py-3 text-center text-[10px] font-bold text-gray-400">{v.gstNumber || '—'}</td>
                    <td className="px-5 py-3 text-center text-xs font-bold text-gray-700">{v.creditDays}d</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-sm font-black ${v.currentBalance > 0 ? 'text-red-600' : v.currentBalance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        ₹{Math.abs(v.currentBalance).toLocaleString()}
                        {v.currentBalance > 0 && ' DR'}
                        {v.currentBalance < 0 && ' CR'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'
                      }`}>{v.status}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openLedger(v.id)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all" title="View Ledger"><BookOpen size={14} /></button>
                        <button onClick={() => openEdit(v)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all" title="Edit"><Edit3 size={14} /></button>
                        <button onClick={() => handleToggleStatus(v.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all" title="Toggle Status">
                          {v.status === 'ACTIVE' ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filtered.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{v.vendorName}</h4>
                    <p className="text-[10px] text-gray-400 font-bold">{v.mobile} {v.contactPerson && `• ${v.contactPerson}`}</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{v.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-black ${v.currentBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>₹{Math.abs(v.currentBalance).toLocaleString()} {v.currentBalance > 0 ? 'DR' : v.currentBalance < 0 ? 'CR' : ''}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => openLedger(v.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BookOpen size={14} /></button>
                    <button onClick={() => openEdit(v)} className="p-2 bg-gray-50 text-gray-600 rounded-lg"><Edit3 size={14} /></button>
                    <button onClick={() => handleToggleStatus(v.id)} className="p-2 rounded-lg bg-gray-50">
                      {v.status === 'ACTIVE' ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Vendor Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">{editVendor ? 'Edit Vendor' : 'New Vendor'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { name: 'vendorName', label: 'Vendor Name *', required: true },
                { name: 'mobile', label: 'Mobile *', required: true },
                { name: 'email', label: 'Email' },
                { name: 'address', label: 'Address' },
                { name: 'gstNumber', label: 'GST Number' },
                { name: 'contactPerson', label: 'Contact Person' },
              ].map(f => (
                <div key={f.name} className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">{f.label}</label>
                  <input required={f.required} value={form[f.name]} onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Credit Days</label>
                  <input type="number" value={form.creditDays} onChange={e => setForm({ ...form, creditDays: e.target.value })}
                    className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
                {!editVendor && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Opening Balance</label>
                    <input type="number" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                      className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold border-none focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                )}
              </div>
              <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all active:scale-[0.98]">
                {editVendor ? 'Update Vendor' : 'Create Vendor'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Ledger Modal */}
      {ledgerView && ledgerData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => { setLedgerView(null); setLedgerData(null); }}>
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">{ledgerData.vendor?.vendorName}</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor Ledger • Balance: <span className={ledgerData.vendor?.currentBalance > 0 ? 'text-red-600' : 'text-emerald-600'}>₹{Math.abs(ledgerData.vendor?.currentBalance || 0).toLocaleString()}</span></p>
              </div>
              <button onClick={() => { setLedgerView(null); setLedgerData(null); }} className="text-gray-400"><X size={20} /></button>
            </div>
            {ledgerData.ledger?.length === 0 ? (
              <p className="text-center text-gray-400 py-8 font-bold text-sm">No ledger entries yet</p>
            ) : (
              <div className="bg-gray-50 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Date</th>
                      <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Type</th>
                      <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Debit</th>
                      <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Credit</th>
                      <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {ledgerData.ledger.map(entry => (
                      <tr key={entry.id} className="bg-white">
                        <td className="px-4 py-2 text-[11px] font-bold text-gray-600">{format(new Date(entry.date), 'dd MMM yyyy')}</td>
                        <td className="px-4 py-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                            entry.type === 'PURCHASE' ? 'bg-red-50 text-red-600' : entry.type === 'PAYMENT' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                          }`}>{entry.type}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-black text-red-600">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-2 text-right text-xs font-black text-emerald-600">{entry.credit > 0 ? `₹${entry.credit.toLocaleString()}` : '—'}</td>
                        <td className="px-4 py-2 text-right text-xs font-black text-gray-900">₹{Math.abs(entry.balance).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── MAPPING TAB ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function MappingTab() {
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [mappedIds, setMappedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [v, p] = await Promise.all([
          procurementAPI.getVendors({ status: 'ACTIVE' }),
          adminAPI.getItems()
        ]);
        setVendors(v.data);
        setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      } catch { toast.error('Failed to load data'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const selectVendor = async (v) => {
    setSelectedVendor(v);
    try {
      const { data } = await procurementAPI.getVendorMappings(v.id);
      setMappedIds(new Set(data.map(m => m.productId)));
    } catch { toast.error('Failed to load mappings'); }
  };

  const toggleProduct = (pid) => {
    setMappedIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  };

  const saveMappings = async () => {
    if (!selectedVendor) return;
    setSaving(true);
    try {
      await procurementAPI.updateVendorMappings(selectedVendor.id, { productIds: [...mappedIds] });
      toast.success('Mappings saved');
    } catch { toast.error('Failed to save mappings'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Vendor List */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Select Vendor</h4>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {vendors.map(v => (
              <button key={v.id} onClick={() => selectVendor(v)}
                className={`w-full text-left px-4 py-3 border-b border-gray-50 flex items-center justify-between transition-all ${
                  selectedVendor?.id === v.id ? 'bg-emerald-50 border-l-4 border-l-emerald-600' : 'hover:bg-gray-50'
                }`}>
                <div>
                  <span className="text-sm font-bold text-gray-900">{v.vendorName}</span>
                  <p className="text-[10px] text-gray-400">{v.mobile}</p>
                </div>
                <ChevronRight size={14} className="text-gray-300" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Mapping */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-50 flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">
              {selectedVendor ? `Items for ${selectedVendor.vendorName}` : 'Select a vendor first'}
            </h4>
            {selectedVendor && (
              <button onClick={saveMappings} disabled={saving}
                className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs disabled:opacity-50">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} Save
              </button>
            )}
          </div>
          {selectedVendor ? (
            <div className="max-h-[60vh] overflow-y-auto p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {products.map(p => (
                  <button key={p.id} onClick={() => toggleProduct(p.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                      mappedIds.has(p.id)
                        ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-300'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${mappedIds.has(p.id) ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                      {mappedIds.has(p.id) ? <CheckCircle2 size={16} /> : <Package size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-gray-900 truncate block">{p.name}</span>
                      <span className="text-[10px] text-gray-400">₹{p.purchasePrice || p.price}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-gray-300">
              <Link2 size={48} className="mx-auto mb-3 opacity-50" />
              <p className="font-bold text-sm">Select a vendor to manage item mappings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── PURCHASE ORDERS TAB ──────────────────────────────────
// ═══════════════════════════════════════════════════════════
function PurchaseOrdersTab() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [mappedItems, setMappedItems] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
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
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {['', 'CREATED', 'APPROVED', 'ORDERED', 'DELIVERED', 'CLOSED'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === s ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
              }`}>{s || 'All'}</button>
          ))}
        </div>
        <button onClick={openForm}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
          <Plus size={16} /> New PO
        </button>
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
          {pos.map(po => (
            <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">PO #{po.poNumber}</span>
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
                {po.status === 'CREATED' && (
                  <>
                    <button onClick={() => updateStatus(po.id, 'APPROVED')} className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-emerald-100">Approve</button>
                    <button onClick={() => updateStatus(po.id, 'CANCELLED')} className="text-[9px] font-black bg-red-50 text-red-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-red-100">Cancel</button>
                  </>
                )}
                {po.status === 'APPROVED' && (
                  <button onClick={() => updateStatus(po.id, 'ORDERED')} className="text-[9px] font-black bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg uppercase tracking-widest hover:bg-purple-100">Mark Ordered</button>
                )}
                {po.status === 'DELIVERED' && (
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
}

// ═══════════════════════════════════════════════════════════
// ─── GRN TAB ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function GRNTab() {
  const [pos, setPOs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [grnItems, setGRNItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getPurchaseOrders({ status: undefined });
        // Show POs that can receive goods (not CLOSED or CANCELLED)
        setPOs(data.filter(po => !['CLOSED', 'CANCELLED'].includes(po.status)));
      } catch { toast.error('Failed to load POs'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const selectPO = async (poId) => {
    try {
      const { data } = await procurementAPI.getPurchaseOrderById(poId);
      setSelectedPO(poId);
      setPODetail(data);
      setGRNItems(data.items.map(item => ({
        productId: item.productId,
        name: item.product?.name,
        orderedQty: item.quantity,
        alreadyReceived: item.receivedQty || 0,
        balance: item.quantity - (item.receivedQty || 0),
        receivedQty: ''
      })));
    } catch { toast.error('Failed to load PO details'); }
  };

  const handleSubmitGRN = async () => {
    const items = grnItems.filter(i => parseInt(i.receivedQty) > 0);
    if (items.length === 0) return toast.error('Enter received quantities');
    setSubmitting(true);
    try {
      await procurementAPI.createGRN({
        poId: selectedPO,
        items: items.map(i => ({
          productId: i.productId,
          orderedQty: i.orderedQty,
          receivedQty: parseInt(i.receivedQty)
        }))
      });
      toast.success('Goods received successfully');
      setSelectedPO(null);
      setPODetail(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error receiving goods');
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="space-y-4">
      {!selectedPO ? (
        <>
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Select PO to Receive Goods</h4>
          {pos.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
              <Truck size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Open POs for GRN</h3>
            </div>
          ) : (
            <div className="space-y-2">
              {pos.map(po => (
                <button key={po.id} onClick={() => selectPO(po.id)}
                  className="w-full text-left bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-gray-900">PO #{po.poNumber}</span>
                    <p className="text-[10px] text-gray-400 font-bold">{po.vendor?.vendorName} • {format(new Date(po.poDate), 'dd MMM yyyy')} • {po.items?.length} items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">{po.status}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-gray-900">GRN for PO #{poDetail?.poNumber}</h4>
              <p className="text-[10px] text-gray-400 font-bold">{poDetail?.vendor?.vendorName}</p>
            </div>
            <button onClick={() => { setSelectedPO(null); setPODetail(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Item</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Ordered</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Already Rcvd</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Balance</th>
                  <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Receive Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grnItems.map((item, idx) => (
                  <tr key={item.productId}>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{item.name}</td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-gray-600">{item.orderedQty}</td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-emerald-600">{item.alreadyReceived}</td>
                    <td className="px-3 py-2 text-center text-xs font-bold text-orange-600">{item.balance}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min="0" max={item.balance} value={item.receivedQty}
                        onChange={e => {
                          const updated = [...grnItems];
                          updated[idx].receivedQty = e.target.value;
                          setGRNItems(updated);
                        }}
                        className="w-20 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleSubmitGRN} disabled={submitting}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
            {submitting ? 'Processing...' : 'Submit Goods Receipt'}
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── PURCHASES TAB ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function PurchasesTab() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    vendorId: '', poId: '', invoiceNumber: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'),
    transportCharges: '0', otherCharges: '0', items: []
  });

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
      const [v, p] = await Promise.all([
        procurementAPI.getVendors({ status: 'ACTIVE' }),
        adminAPI.getItems()
      ]);
      setVendors(v.data);
      setProducts(p.data.filter(x => x.status === 'ACTIVE'));
      setShowForm(true);
    } catch { toast.error('Failed to load data'); }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.invoiceNumber || form.items.length === 0) {
      return toast.error('Fill all required fields');
    }
    try {
      await procurementAPI.createPurchase({
        ...form,
        items: form.items.map(i => ({ productId: i.productId, quantity: parseInt(i.quantity), price: parseFloat(i.price) }))
      });
      toast.success('Purchase invoice created');
      setShowForm(false);
      setForm({ vendorId: '', poId: '', invoiceNumber: '', invoiceDate: format(new Date(), 'yyyy-MM-dd'), transportCharges: '0', otherCharges: '0', items: [] });
      // Reload
      const { data } = await procurementAPI.getPurchases();
      setPurchases(data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating purchase');
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
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Purchase Invoices</h4>
        <button onClick={openForm}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
          <Plus size={16} /> New Purchase
        </button>
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
          {purchases.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-gray-900">#{p.invoiceNumber}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${invoiceStatusColors[p.status] || ''}`}>{p.status}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-bold">{p.vendor?.vendorName} • {format(new Date(p.invoiceDate), 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-gray-900">₹{p.totalAmount.toLocaleString()}</span>
                  {p.paidAmount > 0 && p.paidAmount < p.totalAmount && (
                    <p className="text-[10px] text-emerald-600 font-bold">Paid: ₹{p.paidAmount.toLocaleString()}</p>
                  )}
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Vendor *</label>
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
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1">Items</label>
                  <button type="button" onClick={addItem} className="text-[10px] font-black text-emerald-600 flex items-center gap-1"><Plus size={12} /> Add Item</button>
                </div>
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2 rounded-xl">
                    <select value={item.productId} onChange={e => {
                      const prod = products.find(p => p.id === e.target.value);
                      updateItem(idx, 'productId', e.target.value);
                      if (prod) updateItem(idx, 'price', String(prod.purchasePrice || prod.price || 0));
                    }} className="flex-1 bg-white rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200">
                      <option value="">Select Item</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" min="1" placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      className="w-16 bg-white rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center" />
                    <input type="number" placeholder="Price" value={item.price} onChange={e => updateItem(idx, 'price', e.target.value)}
                      className="w-20 bg-white rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center" />
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
                  </div>
                ))}
              </div>
              <button className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 transition-all">
                Create Purchase Invoice
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── STOCK LEDGER TAB ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function StockLedgerTab() {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getStockLedger({ type: typeFilter || undefined });
        setLedger(data);
      } catch { toast.error('Failed to load stock ledger'); }
      finally { setLoading(false); }
    };
    setLoading(true);
    load();
  }, [typeFilter]);

  const typeColors = {
    PURCHASE: 'bg-emerald-50 text-emerald-600',
    SALE: 'bg-red-50 text-red-600',
    TRANSFER_IN: 'bg-blue-50 text-blue-600',
    TRANSFER_OUT: 'bg-orange-50 text-orange-600',
    ADJUSTMENT: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {['', 'PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'].map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
              typeFilter === t ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
            }`}>{t || 'All Types'}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : ledger.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-black text-gray-300">No Stock Movements</h3>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Product</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Type</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Qty</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ledger.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50/30">
                  <td className="px-4 py-2 text-[11px] font-bold text-gray-600">{format(new Date(entry.createdAt), 'dd MMM hh:mm a')}</td>
                  <td className="px-4 py-2 text-xs font-bold text-gray-900">{entry.product?.name}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${typeColors[entry.type] || ''}`}>{entry.type.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs font-black ${['PURCHASE', 'TRANSFER_IN'].includes(entry.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                      {['PURCHASE', 'TRANSFER_IN'].includes(entry.type) ? '+' : '-'}{entry.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-xs font-bold text-gray-700">{entry.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// ─── PAYMENTS TAB ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [outstanding, setOutstanding] = useState([]);
  const [form, setForm] = useState({
    vendorId: '', amount: '', mode: 'CASH', referenceNo: '',
    paymentDate: format(new Date(), 'yyyy-MM-dd'), invoiceIds: [], remarks: ''
  });

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
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Vendor Payments</h4>
        <button onClick={openForm}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
          <Plus size={16} /> Record Payment
        </button>
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
          {payments.map(p => (
            <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-gray-900">₹{p.amount.toLocaleString()}</span>
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
}

// ═══════════════════════════════════════════════════════════
// ─── REPORTS TAB ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════════
function ReportsTab() {
  const [activeReport, setActiveReport] = useState('overview');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reports = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
    { key: 'outstanding', label: 'Outstanding', icon: DollarSign },
    { key: 'aging', label: 'Aging', icon: Clock },
    { key: 'profitability', label: 'Profitability', icon: TrendingUp },
  ];

  const loadReport = useCallback(async (type) => {
    setLoading(true);
    try {
      let data;
      switch (type) {
        case 'overview': {
          const [v, p] = await Promise.all([
            procurementAPI.getVendorReport(),
            procurementAPI.getProfitabilityReport()
          ]);
          data = { vendors: v.data, profitability: p.data };
          break;
        }
        case 'low-stock': {
          const r = await procurementAPI.getLowStockAlert();
          data = r.data;
          break;
        }
        case 'outstanding': {
          const r = await procurementAPI.getOutstandingPayables();
          data = r.data;
          break;
        }
        case 'aging': {
          const r = await procurementAPI.getAgingReport();
          data = r.data;
          break;
        }
        case 'profitability': {
          const r = await procurementAPI.getProfitabilityReport();
          data = r.data;
          break;
        }
        default: break;
      }
      setReportData(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(activeReport); }, [activeReport, loadReport]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {reports.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeReport === r.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
            }`}>
            <r.icon size={12} /> {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : !reportData ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-black text-gray-300">No Data Available</h3>
        </div>
      ) : (
        <>
          {/* Overview Report */}
          {activeReport === 'overview' && reportData.profitability && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Purchases', value: `₹${(reportData.profitability.totalPurchases || 0).toLocaleString()}`, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Total Sales', value: `₹${(reportData.profitability.totalSales || 0).toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Gross Profit', value: `₹${(reportData.profitability.grossProfit || 0).toLocaleString()}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Margin %', value: `${reportData.profitability.marginPercent || 0}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-2xl p-4 border border-gray-100`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {reportData.vendors?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Vendors</p>
                    <p className="text-xl font-black text-gray-900">{reportData.vendors.summary.totalVendors}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Active Vendors</p>
                    <p className="text-xl font-black text-emerald-600">{reportData.vendors.summary.activeVendors}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Outstanding</p>
                    <p className="text-xl font-black text-red-600">₹{(reportData.vendors.summary.totalOutstanding || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Advance</p>
                    <p className="text-xl font-black text-blue-600">₹{(reportData.vendors.summary.totalAdvance || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Low Stock Report */}
          {activeReport === 'low-stock' && Array.isArray(reportData) && (
            reportData.length === 0 ? (
              <div className="bg-emerald-50 rounded-2xl p-8 text-center border border-emerald-100">
                <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-3" />
                <h3 className="text-lg font-black text-emerald-600">All Stock Levels Healthy</h3>
              </div>
            ) : (
              <div className="space-y-2">
                {reportData.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-red-100 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-gray-900">{item.product?.name}</span>
                      <p className="text-[10px] font-bold text-gray-400">{item.warehouse?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-red-600">{item.quantity}</span>
                      <p className="text-[9px] font-bold text-red-400">Min: {item.product?.minStockAlert}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Outstanding Report */}
          {activeReport === 'outstanding' && reportData.invoices && (
            <div className="space-y-4">
              {reportData.summary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Outstanding</p>
                    <p className="text-xl font-black text-red-600">₹{reportData.summary.totalOutstanding.toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Overdue Count</p>
                    <p className="text-xl font-black text-orange-600">{reportData.summary.overdueCount}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Overdue Amount</p>
                    <p className="text-xl font-black text-yellow-600">₹{reportData.summary.overdueAmount.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {reportData.invoices.map((inv, i) => (
                  <div key={i} className={`bg-white rounded-2xl border ${inv.isOverdue ? 'border-red-200' : 'border-gray-100'} p-4 flex items-center justify-between`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">#{inv.invoiceNumber}</span>
                        {inv.isOverdue && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-600">Overdue {inv.daysOverdue}d</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold">{inv.vendor?.vendorName} • Due: {format(new Date(inv.dueDate), 'dd MMM yyyy')}</p>
                    </div>
                    <span className="text-base font-black text-red-600">₹{inv.outstanding.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aging Report */}
          {activeReport === 'aging' && typeof reportData === 'object' && !Array.isArray(reportData) && !reportData.invoices && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(reportData).map(([bucket, data]) => (
                <div key={bucket} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{bucket === 'current' ? 'Current' : `${bucket} Days`}</p>
                  <p className="text-xl font-black text-gray-900">₹{(data.amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-400">{data.count || 0} invoices</p>
                </div>
              ))}
            </div>
          )}

          {/* Profitability Report */}
          {activeReport === 'profitability' && reportData.totalSales !== undefined && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Purchases</p>
                <p className="text-2xl font-black text-red-600">₹{reportData.totalPurchases.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Sales</p>
                <p className="text-2xl font-black text-emerald-600">₹{reportData.totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Gross Profit</p>
                <p className={`text-2xl font-black ${reportData.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{reportData.grossProfit.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Margin %</p>
                <p className="text-2xl font-black text-purple-600">{reportData.marginPercent}%</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
