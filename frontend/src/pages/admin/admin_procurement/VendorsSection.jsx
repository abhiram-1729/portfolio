import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Plus, Search, Loader2, Edit3, ToggleLeft, ToggleRight, 
  ArrowLeft, Phone, Mail, MapPin, ShieldCheck, User, Clock, 
  DollarSign, BookOpen, Trash2, X, CheckCircle2, XCircle,
  Building2, CreditCard, Hash, Tag, ShieldAlert, FileText, Check, ChevronRight, ChevronLeft
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
  const [approvalFilter, setApprovalFilter] = useState('');
  
  // Tab navigation for vendor form sections
  const [activeFormTab, setActiveFormTab] = useState('general');

  const [form, setForm] = useState({
    vendorName: '', mobile: '', email: '', address: '',
    gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
    paymentTerms: 'Net 30', creditLimit: '0',
    bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
    vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
  });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await procurementAPI.getVendors({ status: statusFilter || undefined });
      setVendors(data);
    } catch { 
      toast.error('Failed to load vendors'); 
    } finally { 
      setLoading(false); 
    }
  }, [statusFilter]);

  useEffect(() => { 
    loadVendors(); 
  }, [loadVendors]);
  
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

    // Final checks before submitting
    if (form.isTaxable && (!form.gstNumber || !form.gstNumber.trim())) {
      setActiveFormTab('regulation');
      toast.error('GST Identification Number is mandatory for taxable vendors.');
      return;
    }

    if (form.gstNumber && form.gstNumber.trim() && form.gstNumber.trim().length !== 15) {
      setActiveFormTab('regulation');
      toast.error('GST Identification Number must be exactly 15 characters.');
      return;
    }

    try {
      if (editVendor) {
        await procurementAPI.updateVendor(editVendor.id, form);
        toast.success('Vendor details updated successfully');
      } else {
        await procurementAPI.createVendor(form);
        toast.success('Vendor onboarding request registered successfully');
      }
      setShowForm(false);
      setEditVendor(null);
      setActiveFormTab('general');
      setForm({ 
        vendorName: '', mobile: '', email: '', address: '', gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
        paymentTerms: 'Net 30', creditLimit: '0',
        bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
        vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
      });
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving vendor information');
    }
  };

  const handleToggleStatus = async (id) => {
    try {
      await procurementAPI.toggleVendorStatus(id);
      toast.success('Vendor status updated successfully');
      loadVendors();
    } catch { 
      toast.error('Error updating status'); 
    }
  };

  const handleApproveStatus = async (id, status) => {
    try {
      await procurementAPI.updateVendorApproval(id, { approvalStatus: status });
      toast.success(`Vendor approval status set to ${status}`);
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error updating approval status');
    }
  };

  const handleDeleteVendor = async (id) => {
    if (!window.confirm('Are you sure you want to delete this vendor? This cannot be undone.')) return;
    try {
      await procurementAPI.deleteVendor(id);
      toast.success('Vendor deleted successfully');
      loadVendors();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting vendor');
    }
  };

  const openEdit = (v) => {
    setEditVendor(v);
    setActiveFormTab('general');
    setForm({
      vendorName: v.vendorName, 
      mobile: v.mobile, 
      email: v.email || '',
      address: v.address || '', 
      gstNumber: v.gstNumber || '',
      contactPerson: v.contactPerson || '', 
      creditDays: String(v.creditDays),
      openingBalance: String(v.openingBalance),
      paymentTerms: v.paymentTerms || 'Net 30',
      creditLimit: String(v.creditLimit || 0),
      bankName: v.bankName || '',
      accountNumber: v.accountNumber || '',
      ifscCode: v.ifscCode || '',
      bankBranch: v.bankBranch || '',
      vendorCategory: v.vendorCategory || 'RAW_MATERIAL',
      minOrderQty: String(v.minOrderQty || 1),
      isTaxable: v.isTaxable || false
    });
    setShowForm(true);
  };

  const openLedger = async (vendorId) => {
    try {
      const { data } = await procurementAPI.getVendorLedger(vendorId);
      setLedgerData(data);
      setLedgerView(vendorId);
    } catch { 
      toast.error('Failed to load ledger'); 
    }
  };

  const filtered = vendors.filter(v => {
    const matchesSearch = v.vendorName.toLowerCase().includes(search.toLowerCase()) || v.mobile.includes(search);
    const matchesApproval = approvalFilter ? v.approvalStatus === approvalFilter : true;
    return matchesSearch && matchesApproval;
  });

  const getCategoryLabel = (cat) => {
    const mapping = {
      RAW_MATERIAL: 'Raw Materials',
      PACKAGING: 'Packaging',
      FINISHED_GOODS: 'Finished Goods',
      LOGISTICS: 'Logistics',
      SERVICES: 'Services'
    };
    return mapping[cat] || cat || 'Uncategorized';
  };

  const isTabIncomplete = (tabId) => {
    if (tabId === 'regulation') {
      return form.isTaxable && (!form.gstNumber || form.gstNumber.trim().length !== 15);
    }
    return false;
  };

  const nextTab = () => {
    const sequence = ['general', 'commercial', 'regulation', 'settlement'];
    const idx = sequence.indexOf(activeFormTab);
    if (idx < sequence.length - 1) {
      setActiveFormTab(sequence[idx + 1]);
    }
  };

  const prevTab = () => {
    const sequence = ['general', 'commercial', 'regulation', 'settlement'];
    const idx = sequence.indexOf(activeFormTab);
    if (idx > 0) {
      setActiveFormTab(sequence[idx - 1]);
    }
  };

  const renderForm = () => {
    const formTabs = [
      { id: 'general', label: '1. General Details', icon: User },
      { id: 'commercial', label: '2. Commercials', icon: DollarSign },
      { id: 'regulation', label: '3. Regulation & Tax', icon: ShieldCheck },
      { id: 'settlement', label: '4. Bank Details', icon: Building2 }
    ];

    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <div className="flex items-center gap-4">
            <button 
              type="button"
              onClick={() => { setShowForm(false); setEditVendor(null); }}
              className="p-2.5 hover:bg-white rounded-xl transition-all text-gray-400 hover:text-emerald-600 shadow-sm border border-transparent hover:border-emerald-100"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">{editVendor ? 'Update Vendor Profile' : 'Onboard New Vendor'}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">{editVendor ? 'Refining partnership credentials' : 'Registering a new supply chain partner'}</p>
            </div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
            <Users size={24} />
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="px-6 pt-4 border-b border-gray-100/80 bg-slate-50/40 flex gap-2 overflow-x-auto scrollbar-none">
          {formTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeFormTab === tab.id;
            const isIncomplete = isTabIncomplete(tab.id);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormTab(tab.id)}
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

        {/* Form Body - Conditional tabs */}
        <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
          <div className="space-y-6 max-w-5xl mx-auto w-full">
            
            {/* SECTION 1: General Info */}
            {activeFormTab === 'general' && (
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
                        value={form.vendorName} 
                        onChange={e => setForm({ ...form, vendorName: e.target.value })}
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
                        value={form.mobile} 
                        onChange={e => setForm({ ...form, mobile: e.target.value })}
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
                        value={form.contactPerson} 
                        onChange={e => setForm({ ...form, contactPerson: e.target.value })}
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
                        value={form.email} 
                        onChange={e => setForm({ ...form, email: e.target.value })}
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
                        value={form.vendorCategory} 
                        onChange={e => setForm({ ...form, vendorCategory: e.target.value })}
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
                        value={form.address} 
                        onChange={e => setForm({ ...form, address: e.target.value })}
                        className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="Enter official street address..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: Commercial Terms */}
            {activeFormTab === 'commercial' && (
              <div className="bg-slate-50/40 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <DollarSign size={16} className="text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Commercial & Credit Terms</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Credit Cycle Days</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                        <Clock size={16} />
                      </div>
                      <input 
                        type="number" 
                        value={form.creditDays} 
                        onChange={e => setForm({ ...form, creditDays: e.target.value })}
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
                        value={form.creditLimit} 
                        onChange={e => setForm({ ...form, creditLimit: e.target.value })}
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
                        value={form.paymentTerms} 
                        onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
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
                        value={form.minOrderQty} 
                        onChange={e => setForm({ ...form, minOrderQty: e.target.value })}
                        className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {!editVendor && (
                    <div className="space-y-2 group md:col-span-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Opening Account Balance (₹)</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                          <DollarSign size={16} />
                        </div>
                        <input 
                          type="number" 
                          value={form.openingBalance} 
                          onChange={e => setForm({ ...form, openingBalance: e.target.value })}
                          className="w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none" 
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 3: Regulation & Tax */}
            {activeFormTab === 'regulation' && (
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
                      onClick={() => setForm({ ...form, isTaxable: !form.isTaxable })}
                      className="focus:outline-none"
                    >
                      {form.isTaxable ? (
                        <ToggleRight size={32} className="text-emerald-600" />
                      ) : (
                        <ToggleLeft size={32} className="text-gray-300" />
                      )}
                    </button>
                  </div>

                  <div className="flex-1 space-y-2 group w-full">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">
                      GST Identification Number {form.isTaxable && <span className="text-rose-500 font-black">* (Mandatory)</span>}
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                        <ShieldAlert size={16} />
                      </div>
                      <input 
                        value={form.gstNumber} 
                        onChange={e => setForm({ ...form, gstNumber: e.target.value.toUpperCase() })}
                        maxLength={15}
                        className={`w-full bg-white rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold border transition-all outline-none ${
                          form.isTaxable && !form.gstNumber
                            ? 'border-rose-200 focus:border-rose-400 focus:ring-4 focus:ring-rose-500/5'
                            : 'border-gray-100 focus:border-emerald-200 focus:ring-4 focus:ring-emerald-500/5'
                        }`}
                        placeholder="Enter 15-character GSTIN (e.g. 29GGGGG1314R1Z5)..."
                      />
                    </div>
                    {form.isTaxable && !form.gstNumber && (
                      <p className="text-[9px] font-black text-rose-500 uppercase tracking-wider pl-1 flex items-center gap-1">
                        <ShieldAlert size={10} /> Valid GST Identification Number is strictly required for taxable suppliers.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: Bank Details */}
            {activeFormTab === 'settlement' && (
              <div className="bg-slate-50/40 rounded-2xl p-5 border border-slate-100 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Building2 size={16} className="text-emerald-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Settlement & Bank Accounts</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 pl-1 group-focus-within:text-emerald-500 transition-colors">Bank Name</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500 transition-colors">
                        <Building2 size={16} />
                      </div>
                      <input 
                        value={form.bankName} 
                        onChange={e => setForm({ ...form, bankName: e.target.value })}
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
                        value={form.accountNumber} 
                        onChange={e => setForm({ ...form, accountNumber: e.target.value })}
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
                        value={form.ifscCode} 
                        onChange={e => setForm({ ...form, ifscCode: e.target.value.toUpperCase() })}
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
                        value={form.bankBranch} 
                        onChange={e => setForm({ ...form, bankBranch: e.target.value })}
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
          <div className="pt-6 border-t border-gray-50 flex items-center justify-between gap-3 max-w-5xl mx-auto w-full">
            {/* Left Action - Previous */}
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => { setShowForm(false); setEditVendor(null); }}
                className="px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
              >
                Cancel
              </button>
              {activeFormTab !== 'general' && (
                <button
                  type="button"
                  onClick={prevTab}
                  className="flex items-center gap-1.5 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ChevronLeft size={12} strokeWidth={3} /> Back
                </button>
              )}
            </div>

            {/* Right Action - Next / Submit */}
            <div>
              {activeFormTab !== 'settlement' ? (
                <button
                  type="button"
                  onClick={nextTab}
                  className="flex items-center gap-1.5 px-8 py-3.5 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-slate-900/10 hover:bg-slate-800 transition-all"
                >
                  Next Section <ChevronRight size={12} strokeWidth={3} />
                </button>
              ) : (
                <button 
                  type="submit"
                  className="flex items-center gap-1.5 px-12 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
                >
                  {editVendor ? 'Save Changes' : 'Confirm & Register'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    );
  };

  if (showForm) return renderForm();

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0 overflow-y-auto pr-2 custom-scrollbar">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center justify-between">
        
        {/* Search */}
        <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm flex-1 max-w-sm">
          <Search size={14} className="text-gray-400 ml-2" />
          <input 
            placeholder="Search vendors..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-xs font-bold text-gray-700 w-full" 
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* Active Status Filters */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-[7.5px] font-black uppercase text-gray-400 px-1 border-r border-slate-100">Status</span>
            {['', 'ACTIVE', 'INACTIVE'].map(s => (
              <button 
                key={s} 
                onClick={() => setStatusFilter(s)}
                className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === s ? 'bg-slate-900 text-white shadow-sm' : 'bg-transparent text-slate-400'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>

          {/* Governance / Approval Filters */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-gray-100 shadow-sm">
            <span className="text-[7.5px] font-black uppercase text-gray-400 px-1 border-r border-slate-100">Workflow</span>
            {['', 'PENDING', 'APPROVED', 'REJECTED'].map(a => (
              <button 
                key={a} 
                onClick={() => setApprovalFilter(a)}
                className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${
                  approvalFilter === a ? 'bg-emerald-600 text-white shadow-sm' : 'bg-transparent text-slate-400'
                }`}
              >
                {a || 'All'}
              </button>
            ))}
          </div>

          {can('PROCUREMENT', 'CREATE', 'VENDORS') && (
            <button 
              onClick={() => { 
                setShowForm(true); 
                setEditVendor(null); 
                setActiveFormTab('general');
                setForm({ 
                  vendorName: '', mobile: '', email: '', address: '', gstNumber: '', contactPerson: '', creditDays: '30', openingBalance: '0',
                  paymentTerms: 'Net 30', creditLimit: '0',
                  bankName: '', accountNumber: '', ifscCode: '', bankBranch: '',
                  vendorCategory: 'RAW_MATERIAL', minOrderQty: '1', isTaxable: false
                }); 
              }}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/10"
            >
              <Plus size={14} strokeWidth={3} /> Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* Loader / Empty / Table */}
      {loading ? (
        <div className="flex flex-col items-center py-24 text-gray-400 gap-3">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="font-black text-[10px] uppercase tracking-widest">Loading supply partners...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center space-y-3">
          <Users size={32} className="mx-auto text-gray-200" />
          <h3 className="text-sm font-black text-gray-300 uppercase tracking-widest">No Supply Partners Found</h3>
        </div>
      ) : (
        <>
          {/* Desktop High-Density Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-gray-100">
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400">Identity & Category</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-center">Mobile</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-center">GST IN</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-center">Terms & MOQ</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-center">Ledger Bal</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-center">Approval</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="px-3 py-3.5 text-[8.5px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50/30 transition-colors group">
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-gray-950 uppercase tracking-tight">{v.vendorName}</span>
                          {v.displayId && <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-1 py-0 rounded tracking-widest uppercase">{v.displayId}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {v.contactPerson && <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight leading-none">{v.contactPerson}</p>}
                          <span className="w-1 h-1 bg-slate-200 rounded-full" />
                          <span className="text-[8.5px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider">{getCategoryLabel(v.vendorCategory)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center text-[11px] font-black text-gray-700">{v.mobile}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{v.gstNumber || '—'}</span>
                        {v.isTaxable ? (
                          <span className="text-[7px] font-black text-red-500 bg-red-50 px-1 rounded tracking-wider uppercase mt-0.5">Taxable</span>
                        ) : (
                          <span className="text-[7px] font-black text-slate-400 bg-slate-50 px-1 rounded tracking-wider uppercase mt-0.5">Exempt</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded">{v.paymentTerms || 'COD'} ({v.creditDays}d)</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">MOQ: {v.minOrderQty || 1} units</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`text-[11px] font-black ${v.currentBalance > 0 ? 'text-rose-600' : v.currentBalance < 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                        ₹{Math.abs(v.currentBalance).toLocaleString()}
                        <span className="text-[8px] ml-0.5 font-bold uppercase">{v.currentBalance > 0 ? 'DR' : v.currentBalance < 0 ? 'CR' : ''}</span>
                      </span>
                    </td>
                    
                    {/* Approval Workflow State */}
                    <td className="px-3 py-2.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                          v.approvalStatus === 'APPROVED' 
                            ? 'bg-teal-50 text-teal-600 border-teal-100' 
                            : v.approvalStatus === 'REJECTED' 
                            ? 'bg-rose-50 text-rose-600 border-rose-100' 
                            : 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse'
                        }`}>{v.approvalStatus || 'PENDING'}</span>
                        
                        {/* Quick approval action cards for administrators */}
                        {v.approvalStatus === 'PENDING' && can('PROCUREMENT', 'UPDATE', 'VENDORS') && (
                          <div className="flex gap-1 mt-0.5">
                            <button 
                              onClick={() => handleApproveStatus(v.id, 'APPROVED')} 
                              className="p-0.5 bg-emerald-50 hover:bg-emerald-100 rounded text-emerald-600 transition-all"
                              title="Approve Partner"
                            >
                              <Check size={10} strokeWidth={3} />
                            </button>
                            <button 
                              onClick={() => handleApproveStatus(v.id, 'REJECTED')} 
                              className="p-0.5 bg-rose-50 hover:bg-rose-100 rounded text-rose-600 transition-all"
                              title="Reject Partner"
                            >
                              <X size={10} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      {can('PROCUREMENT', 'TOGGLE_STATUS', 'VENDORS') ? (
                        <button 
                          onClick={() => handleToggleStatus(v.id)} 
                          className="focus:outline-none transition-all active:scale-95 inline-flex"
                          title={v.status === 'ACTIVE' ? 'Mark Inactive' : 'Mark Active'}
                        >
                          {v.status === 'ACTIVE' ? (
                            <ToggleRight size={28} className="text-emerald-600 cursor-pointer" />
                          ) : (
                            <ToggleLeft size={28} className="text-gray-300 cursor-pointer" />
                          )}
                        </button>
                      ) : (
                        <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${
                          v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-100'
                        }`}>{v.status}</span>
                      )}
                    </td>
                    
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openLedger(v.id)} className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-all" title="View Ledger"><BookOpen size={12} /></button>
                        {can('PROCUREMENT', 'UPDATE', 'VENDORS') && (
                          <>
                            <button onClick={() => openEdit(v)} className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all" title="Edit"><Edit3 size={12} /></button>
                            {can('PROCUREMENT', 'DELETE', 'VENDORS') && (
                              <button onClick={() => handleDeleteVendor(v.id)} className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all" title="Delete"><Trash2 size={12} /></button>
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

          {/* Mobile Cards Redesigned */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {filtered.map(v => (
              <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{v.vendorName}</h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {v.displayId && <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1 py-0.5 rounded tracking-wider">{v.displayId}</span>}
                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider">{getCategoryLabel(v.vendorCategory)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">{v.mobile} {v.contactPerson && `• ${v.contactPerson}`}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase border ${
                      v.approvalStatus === 'APPROVED' ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>{v.approvalStatus || 'PENDING'}</span>
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${v.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>{v.status}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl flex justify-between items-center text-xs">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Balance</span>
                    <span className={`font-black ${v.currentBalance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>₹{Math.abs(v.currentBalance).toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Credit Terms</span>
                    <span className="font-bold text-gray-700">{v.paymentTerms || 'COD'} ({v.creditDays}d)</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">MOQ</span>
                    <span className="font-bold text-gray-700">{v.minOrderQty || 1} units</span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-1">
                  {/* Approval Actions on mobile */}
                  {v.approvalStatus === 'PENDING' && can('PROCUREMENT', 'UPDATE', 'VENDORS') ? (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApproveStatus(v.id, 'APPROVED')} 
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
                      >
                        <Check size={10} strokeWidth={3} /> Approve
                      </button>
                      <button 
                        onClick={() => handleApproveStatus(v.id, 'REJECTED')} 
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[9px] font-black uppercase tracking-wider rounded-lg flex items-center gap-1 transition-all"
                      >
                        <X size={10} strokeWidth={3} /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="w-1" />
                  )}

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
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vendor Ledger • Balance: <span className={ledgerData.vendor?.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}>₹{Math.abs(ledgerData.vendor?.currentBalance || 0).toLocaleString()}</span></p>
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
                        <td className="px-4 py-2 text-right text-xs font-black text-rose-600">{entry.debit > 0 ? `₹${entry.debit.toLocaleString()}` : '—'}</td>
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
