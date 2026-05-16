import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Search, Loader2, Edit3, ToggleLeft, ToggleRight, 
  ArrowLeft, Phone, Mail, MapPin, ShieldCheck, User, Clock, 
  DollarSign, BookOpen, Trash2, X
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const VendorsSection = ({ can, setHideMainHeader }) => {
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
  
  useEffect(() => {
    if (setHideMainHeader) {
      setHideMainHeader(showForm);
    }
    return () => {
      if (setHideMainHeader) setHideMainHeader(false);
    };
  }, [showForm, setHideMainHeader]);

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

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This cannot be undone.')) return;
    try {
      await procurementAPI.deleteVendor(id);
      toast.success('Vendor deleted');
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting vendor');
    }
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

  const renderForm = () => (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
      <div className="p-4 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setShowForm(false); setEditVendor(null); }}
            className="p-2 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-emerald-600 shadow-sm border border-transparent hover:border-emerald-100"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{editVendor ? 'Update Vendor Details' : 'Onboard New Vendor'}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{editVendor ? 'Refining existing partner information' : 'Registering a new supply chain partner'}</p>
          </div>
        </div>
        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
          <Users size={24} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4 max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { name: 'vendorName', label: 'Business Name *', required: true, icon: Users },
            { name: 'mobile', label: 'Primary Contact No. *', required: true, icon: Phone },
            { name: 'email', label: 'Official Email ID', icon: Mail },
            { name: 'address', label: 'Business Address', icon: MapPin },
            { name: 'gstNumber', label: 'GST Identification Number', icon: ShieldCheck },
            { name: 'contactPerson', label: 'POC / Contact Person Name', icon: User },
          ].map(f => (
            <div key={f.name} className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">{f.label}</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                  <f.icon size={16} />
                </div>
                <input 
                  required={f.required} 
                  value={form[f.name]} 
                  onChange={e => setForm({ ...form, [f.name]: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2 text-sm font-bold border border-transparent focus:border-emerald-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                  placeholder={`Enter ${f.label.toLowerCase().replace('*', '').trim()}...`}
                />
              </div>
            </div>
          ))}

          <div className="space-y-2 group">
            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Default Credit Cycle (Days)</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                <Clock size={16} />
              </div>
              <input 
                type="number" 
                value={form.creditDays} 
                onChange={e => setForm({ ...form, creditDays: e.target.value })}
                className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2 text-sm font-bold border border-transparent focus:border-emerald-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                placeholder="30"
              />
            </div>
          </div>

          {!editVendor && (
            <div className="space-y-2 group">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Opening Account Balance</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                  <DollarSign size={16} />
                </div>
                <input 
                  type="number" 
                  value={form.openingBalance} 
                  onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                  className="w-full bg-gray-50 rounded-xl pl-10 pr-4 py-2 text-sm font-bold border border-transparent focus:border-emerald-200 focus:bg-white focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-end gap-3">
          <button 
            type="button" 
            onClick={() => { setShowForm(false); setEditVendor(null); }}
            className="px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
          >
            Cancel
          </button>
          <button className="px-12 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:translate-y-0">
            {editVendor ? 'Save Changes' : 'Confirm & Register'}
          </button>
        </div>
      </form>
    </div>
  );

  if (showForm) return renderForm();

  return (
    <div className="space-y-4 flex-1 flex flex-col min-h-0 overflow-y-auto pr-2 custom-scrollbar">
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
          {can('PROCUREMENT', 'CREATE', 'VENDORS') && (
            <button onClick={() => { setShowForm(true); setEditVendor(null); setForm({ vendorName: '', mobile: '', email: '', address: '', gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0' }); }}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">
              <Plus size={16} /> Add Vendor
            </button>
          )}
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
          <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-x-auto custom-scrollbar w-full">
            <table className="w-max min-w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 whitespace-nowrap">
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 whitespace-nowrap">Vendor</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-nowrap">Mobile</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-nowrap">GST</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-nowrap">Credit Days</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-nowrap">Balance</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right sticky right-0 bg-[#f8fafc] z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/30 transition-colors whitespace-nowrap group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <span className="text-sm font-black text-gray-900">{v.vendorName}</span>
                        {v.displayId && <span className="ml-2 text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">{v.displayId}</span>}
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
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-400'
                      }`}>{v.status}</span>
                    </td>
                    <td className="px-6 py-4 text-right sticky right-0 bg-white group-hover:bg-[#fcfdfd] transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openLedger(v.id)} className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all" title="View Ledger"><BookOpen size={14} /></button>
                        {can('PROCUREMENT', 'UPDATE', 'VENDORS') && (
                          <>
                            <button onClick={() => openEdit(v)} className="p-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-all" title="Edit"><Edit3 size={14} /></button>
                            {can('PROCUREMENT', 'TOGGLE_STATUS', 'VENDORS') && (
                              <button onClick={() => handleToggleStatus(v.id)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-all" title="Toggle Status">
                                {v.status === 'ACTIVE' ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                              </button>
                            )}
                            {can('PROCUREMENT', 'DELETE', 'VENDORS') && (
                              <button onClick={() => handleDeleteVendor(v.id)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-all" title="Delete"><Trash2 size={14} /></button>
                            )}
                          </>
                        )}
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
                    {v.displayId && <span className="text-[9px] font-black text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded tracking-wider">{v.displayId}</span>}
                    <p className="text-[10px] text-gray-400 font-bold">{v.mobile} {v.contactPerson && `• ${v.contactPerson}`}</p>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{v.status}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-black ${v.currentBalance > 0 ? 'text-red-600' : 'text-gray-400'}`}>₹{Math.abs(v.currentBalance).toLocaleString()} {v.currentBalance > 0 ? 'DR' : v.currentBalance < 0 ? 'CR' : ''}</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => openLedger(v.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><BookOpen size={14} /></button>
                    {can('PROCUREMENT', 'UPDATE', 'VENDORS') && (
                      <button onClick={() => openEdit(v)} className="p-2 bg-gray-50 text-gray-600 rounded-lg"><Edit3 size={14} /></button>
                    )}
                    {can('PROCUREMENT', 'TOGGLE_STATUS', 'VENDORS') && (
                      <button onClick={() => handleToggleStatus(v.id)} className="p-2 rounded-lg bg-gray-50">
                        {v.status === 'ACTIVE' ? <ToggleRight size={14} className="text-emerald-600" /> : <ToggleLeft size={14} className="text-gray-400" />}
                      </button>
                    )}
                    {can('PROCUREMENT', 'DELETE', 'VENDORS') && (
                      <button onClick={() => handleDeleteVendor(v.id)} className="p-2 bg-rose-50 text-rose-600 rounded-lg"><Trash2 size={14} /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
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
};

export default VendorsSection;
