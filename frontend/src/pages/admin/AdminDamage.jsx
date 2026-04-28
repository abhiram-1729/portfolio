import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle, Package, DollarSign, CheckCircle, XCircle, Clock, Eye,
  Filter, ChevronDown, ChevronRight, Search, TrendingDown, Users, Truck,
  Image as ImageIcon, Shield, Ban, FileText, BarChart3, X, AlertCircle,
  Percent, CreditCard, RefreshCcw, Download, Info, Hammer, Droplets,
  HelpCircle, Coins, ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import { damageAPI } from '../../services/damageService';
import { adminAPI } from '../../services/adminService';
import { useUserStore } from '../../store/userStore';

const TABS = [
  { id: 'entries', label: 'Damage Entries', icon: AlertTriangle },
  { id: 'deductions', label: 'Deductions', icon: DollarSign },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 }
];

const DAMAGE_TYPE_COLORS = {
  DAMAGED: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: Hammer },
  EXPIRED: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: Clock },
  LEAKAGE: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Droplets },
  LOST: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: HelpCircle }
};

const STATUS_COLORS = {
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-400' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-400' },
  REJECTED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-400' },
  UNDER_REVIEW: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-400' }
};

const RESPONSIBILITY_LABELS = {
  VGE_RESPONSIBLE: 'VGE Responsible',
  NEGLIGENCE: 'Negligence',
  INTENTIONAL: 'Intentional',
  MIS_HANDLING: 'Mis-Handling',
  NOT_RESPONSIBLE: 'Not Responsible'
};

export default function AdminDamage() {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const { user, can } = useUserStore();

  if (!can('INVENTORY', 'READ', 'DAMAGE')) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2rem] border border-gray-100 shadow-sm mt-8">
        <Ban size={48} className="text-gray-300 mb-4" />
        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Access Denied</h2>
        <p className="text-gray-500 mt-1 font-bold text-sm">You do not have permission to view Damage management.</p>
        <button 
          onClick={() => window.history.back()}
          className="mt-6 px-6 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-gray-800 transition-all"
        >
          Go Back
        </button>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('entries');
  const [entries, setEntries] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal states
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showDeductionModal, setShowDeductionModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(null);

  // Review form
  const [reviewAction, setReviewAction] = useState('');
  const [adminResponsibility, setAdminResponsibility] = useState('');
  const [adminRemarks, setAdminRemarks] = useState('');

  // Deduction form
  const [deductionMode, setDeductionMode] = useState('FULL');
  const [deductionPercentage, setDeductionPercentage] = useState(100);
  const [deductionRemarks, setDeductionRemarks] = useState('');

  const fetchEntries = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (storeId) params.storeId = storeId;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.damageType = typeFilter;
      const { data } = await damageAPI.getDamageEntries(params);
      setEntries(data);
    } catch (err) {
      toast.error('Failed to load damage entries');
    } finally {
      setLoading(false);
    }
  }, [storeId, statusFilter, typeFilter]);

  const fetchDeductions = useCallback(async () => {
    try {
      const params = {};
      if (storeId) params.storeId = storeId;
      const { data } = await damageAPI.getDeductions(params);
      setDeductions(data);
    } catch (err) {
      toast.error('Failed to load deductions');
    }
  }, [storeId]);

  const fetchReports = useCallback(async () => {
    try {
      const params = {};
      if (storeId) params.storeId = storeId;
      const { data } = await damageAPI.getDamageReports(params);
      setReports(data);
    } catch (err) {
      toast.error('Failed to load reports');
    }
  }, [storeId]);

  useEffect(() => {
    if (activeTab === 'entries') fetchEntries();
    else if (activeTab === 'deductions') fetchDeductions();
    else if (activeTab === 'reports') fetchReports();
  }, [activeTab, fetchEntries, fetchDeductions, fetchReports]);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (!search) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      e.product?.name?.toLowerCase().includes(q) ||
      e.reportedBy?.name?.toLowerCase().includes(q) ||
      e.displayId?.toLowerCase().includes(q) ||
      e.vehicle?.vehicleNumber?.toLowerCase().includes(q)
    );
  }, [entries, search]);

  // Stats from entries
  const stats = useMemo(() => {
    const total = entries.length;
    const pending = entries.filter(e => e.status === 'PENDING').length;
    const approved = entries.filter(e => e.status === 'APPROVED').length;
    const totalLoss = entries.filter(e => e.status === 'APPROVED').reduce((s, e) => s + (e.totalLoss || 0), 0);
    return { total, pending, approved, totalLoss };
  }, [entries]);

  // Handlers
  const openReview = (entry) => {
    setSelectedEntry(entry);
    setReviewAction('');
    setAdminResponsibility('');
    setAdminRemarks('');
    setShowReviewModal(true);
  };

  const openDeduction = (entry) => {
    setSelectedEntry(entry);
    setDeductionMode('FULL');
    setDeductionPercentage(100);
    setDeductionRemarks('');
    setShowDeductionModal(true);
  };

  const openDetail = async (entry) => {
    try {
      const { data } = await damageAPI.getDamageEntryById(entry.id);
      setSelectedEntry(data);
      setShowDetailModal(true);
    } catch {
      toast.error('Failed to load details');
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewAction) return toast.error('Select an action');
    try {
      await damageAPI.reviewDamage(selectedEntry.id, {
        action: reviewAction,
        adminResponsibility,
        adminRemarks
      });
      toast.success(`Damage entry ${reviewAction.toLowerCase()}`);
      setShowReviewModal(false);
      fetchEntries();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to review');
    }
  };

  const handleDeductionSubmit = async () => {
    try {
      await damageAPI.applyDeduction({
        damageEntryId: selectedEntry.id,
        userId: selectedEntry.reportedById,
        mode: deductionMode,
        percentage: deductionPercentage,
        remarks: deductionRemarks
      });
      toast.success('Deduction applied successfully');
      setShowDeductionModal(false);
      fetchEntries();
      fetchDeductions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply deduction');
    }
  };

  const handleDeductionStatusChange = async (id, status) => {
    try {
      await damageAPI.updateDeductionStatus(id, { status });
      toast.success(`Deduction ${status.toLowerCase()}`);
      fetchDeductions();
    } catch (err) {
      toast.error('Failed to update deduction status');
    }
  };

  // ───────── RENDER HELPERS ─────────
  const renderStatusBadge = (status) => {
    const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {status?.replace('_', ' ')}
      </span>
    );
  };

  const renderTypeBadge = (type) => {
    const c = DAMAGE_TYPE_COLORS[type] || DAMAGE_TYPE_COLORS.DAMAGED;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${c.bg} ${c.text} border ${c.border}`}>
        <c.icon size={11} strokeWidth={2.5} /> {type}
      </span>
    );
  };

  // ───────── STAT CARDS ─────────
  const renderStats = () => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {[
        { label: 'Total Entries', value: stats.total, icon: Package, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
        { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
        { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
        { label: 'Total Loss', value: `₹${stats.totalLoss.toFixed(0)}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
      ].map((s, i) => (
        <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-4 transition-all hover:shadow-md`}>
          <div className="flex items-center gap-2 mb-2">
            <s.icon size={16} className={s.color} strokeWidth={2.5} />
            <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.label}</span>
          </div>
          <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );

  // ───────── ENTRIES TABLE ─────────
  const renderEntries = () => (
    <div>
      {renderStats()}

      {/* Sticky Filters Wrapper - sticks below the tabs */}
      <div className="sticky top-[8.5rem] z-20 bg-gray-50/95 backdrop-blur-md pb-4 mb-2 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search product, agent, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="UNDER_REVIEW">Under Review</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">All Types</option>
              <option value="DAMAGED">Damaged</option>
              <option value="EXPIRED">Expired</option>
              <option value="LEAKAGE">Leakage</option>
              <option value="LOST">Lost</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <AlertTriangle size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No damage entries found</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-xl shadow-slate-200/50">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 min-w-[180px]">ID / Date</th>
                  <th className="text-left px-4 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Product</th>
                  <th className="text-left px-4 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400">Reported By</th>
                  <th className="text-center px-4 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 w-16">Qty</th>
                  <th className="text-left px-4 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 w-28">Type</th>
                  <th className="text-right px-4 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 w-24">Loss</th>
                  <th className="text-center px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 w-32">Status</th>
                  <th className="text-center px-6 py-4 text-[9px] font-black uppercase tracking-widest text-gray-400 w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5 whitespace-nowrap">
                        <span className="text-xs font-black text-slate-800 tracking-tight">
                          {entry.displayId || entry.id.slice(0, 8)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400">
                          {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          {entry.product?.image ? (
                            <img src={entry.product.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-100 shadow-sm" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200">
                              <Package size={16} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                           <span className="font-bold text-slate-800">{entry.product?.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-500 italic">{entry.reportedBy?.name}</span>
                        {entry.vehicle?.vehicleNumber && (
                           <span className="text-[9px] font-black text-emerald-600/70 uppercase flex items-center gap-1 mt-0.5">
                             <Truck size={10} /> {entry.vehicle.vehicleNumber}
                           </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                       <span className="w-8 h-8 inline-flex items-center justify-center rounded-lg bg-slate-50 border border-slate-100 font-black text-slate-900 text-xs">
                         {entry.quantity}
                       </span>
                    </td>
                    <td className="px-4 py-4">{renderTypeBadge(entry.damageType)}</td>
                    <td className="px-4 py-4 text-right">
                       <p className="text-xs font-black text-rose-600">₹{(entry.totalLoss || 0).toLocaleString()}</p>
                    </td>
                    <td className="px-6 py-4 text-center">{renderStatusBadge(entry.status)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button 
                          onClick={() => openDetail(entry)} 
                          className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-emerald-600 hover:bg-white hover:shadow-md transition-all" 
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {can('INVENTORY', 'UPDATE', 'DAMAGE') && (entry.status === 'PENDING' || entry.status === 'UNDER_REVIEW') && (
                          <button 
                            onClick={() => openReview(entry)} 
                            className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-500 hover:text-emerald-700 hover:bg-white hover:shadow-md transition-all" 
                            title="Review"
                          >
                            <Shield size={16} />
                          </button>
                        )}
                        {can('INVENTORY', 'UPDATE', 'DAMAGE') && entry.status === 'APPROVED' && !entry.deduction && entry.adminResponsibility && entry.adminResponsibility !== 'NOT_RESPONSIBLE' && (
                          <button 
                            onClick={() => openDeduction(entry)} 
                            className="p-2 rounded-xl bg-amber-50 border border-amber-100 text-amber-500 hover:text-amber-700 hover:bg-white hover:shadow-md transition-all" 
                            title="Apply Deduction"
                          >
                            <CreditCard size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {filteredEntries.map(entry => (
              <div key={entry.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm" onClick={() => openDetail(entry)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {entry.product?.image ? (
                      <img src={entry.product.image} alt="" className="w-10 h-10 rounded-xl object-cover border border-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Package size={16} className="text-gray-400" /></div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{entry.product?.name}</p>
                      <p className="text-[10px] text-gray-400">{entry.displayId} · {entry.reportedBy?.name}</p>
                    </div>
                  </div>
                  {renderStatusBadge(entry.status)}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  {renderTypeBadge(entry.damageType)}
                  <span className="font-bold text-gray-900">Qty: {entry.quantity}</span>
                  <span className="ml-auto font-bold text-red-600">₹{(entry.totalLoss || 0).toFixed(0)}</span>
                </div>
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  {(entry.status === 'PENDING' || entry.status === 'UNDER_REVIEW') && (
                    <button onClick={(e) => { e.stopPropagation(); openReview(entry); }} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold text-center hover:bg-emerald-100 transition-colors">
                      Review
                    </button>
                  )}
                  {entry.status === 'APPROVED' && !entry.deduction && entry.adminResponsibility !== 'NOT_RESPONSIBLE' && (
                    <button onClick={(e) => { e.stopPropagation(); openDeduction(entry); }} className="flex-1 py-2 rounded-xl bg-orange-50 text-orange-600 text-xs font-bold text-center hover:bg-orange-100 transition-colors">
                      Deduct
                    </button>
                  )}
                  {entry.images?.length > 0 && (
                    <button onClick={(e) => { e.stopPropagation(); setShowImageModal(entry.images); }} className="py-2 px-4 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold hover:bg-gray-100 transition-colors">
                      <ImageIcon size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // ───────── DEDUCTIONS TAB ─────────
  const renderDeductions = () => (
    <div>
      {deductions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <DollarSign size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">No deductions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deductions.map(d => (
            <div key={d.id} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">{d.user?.name}</p>
                  <p className="text-[10px] text-gray-400">
                    {d.damageEntry?.product?.name} · Month: {d.month}
                  </p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${d.status === 'APPLIED' ? 'bg-emerald-50 text-emerald-600' : d.status === 'DISPUTED' ? 'bg-red-50 text-red-600' : d.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-amber-50 text-amber-600'}`}>
                  {d.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Mode</p>
                  <p className="text-sm font-bold text-gray-800">{d.mode}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Percentage</p>
                  <p className="text-sm font-bold text-gray-800">{d.percentage || 0}%</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3 text-center">
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-wider">Amount</p>
                  <p className="text-sm font-bold text-red-600">₹{(d.deductionAmount || 0).toFixed(0)}</p>
                </div>
              </div>
              {can('INVENTORY', 'UPDATE', 'DAMAGE') && d.status === 'PENDING' && (
                <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                  <button onClick={() => handleDeductionStatusChange(d.id, 'APPLIED')} className="flex-1 py-2 rounded-xl bg-emerald-50 text-emerald-600 text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-2">
                    <CheckCircle size={14} /> Apply to Payroll
                  </button>
                  <button onClick={() => handleDeductionStatusChange(d.id, 'CANCELLED')} className="flex-1 py-2 rounded-xl bg-gray-50 text-gray-500 text-xs font-bold hover:bg-gray-100">
                    Cancel
                  </button>
                </div>
              )}
              {d.remarks && (
                <p className="text-xs text-gray-400 mt-2 italic">"{d.remarks}"</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ───────── REPORTS TAB ─────────
  const renderReportsTab = () => {
    if (!reports) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />
        </div>
      );
    }

    const { summary, lossByType, topProducts, vgeReport, payrollReport } = reports;

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Entries', value: summary.total, icon: Package, color: 'text-slate-600', bg: 'bg-slate-50' },
            { label: 'Total Loss', value: `₹${summary.totalLoss?.toFixed(0) || 0}`, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Total Deductions', value: `₹${summary.totalDeductions?.toFixed(0) || 0}`, icon: DollarSign, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Recovery Rate', value: summary.totalLoss > 0 ? `${((summary.appliedDeductions / summary.totalLoss) * 100).toFixed(0)}%` : '0%', icon: Percent, color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-4 border border-gray-100`}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon size={16} className={s.color} />
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">{s.label}</span>
              </div>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Loss by Type */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2 align-bottom">
            <BarChart3 size={14} className="text-gray-300" /> Loss by Damage Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(lossByType).map(([type, data]) => {
              const c = DAMAGE_TYPE_COLORS[type] || DAMAGE_TYPE_COLORS.DAMAGED;
              return (
                <div key={type} className={`${c.bg} border ${c.border} rounded-xl p-3`}>
                  <p className="text-[10px] font-black text-gray-500 uppercase flex items-center gap-1.5"><c.icon size={12} className={c.text} /> {type}</p>
                  <p className={`text-lg font-black ${c.text}`}>₹{data.loss?.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">{data.count} entries</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Damaged Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
            <TrendingDown size={14} className="text-red-300" /> Top Damaged Products
          </h3>
          {topProducts?.length > 0 ? (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-gray-400 w-6">#{i + 1}</span>
                    <span className="text-sm font-bold text-gray-800">{p.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">₹{p.loss?.toFixed(0)}</p>
                    <p className="text-[10px] text-gray-400">{p.qty} units</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>

        {/* VGE Accountability */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">👤 VGE Accountability Report</h3>
          {vgeReport?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Agent</th>
                    <th className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Reports</th>
                    <th className="text-center px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Qty</th>
                    <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Total Loss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {vgeReport.map((v, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{v.name}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{v.count}</td>
                      <td className="px-3 py-2 text-center text-gray-600">{v.totalDamage}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">₹{v.totalLoss?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>

        {/* Payroll Deduction Report */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center gap-2">
             <Coins size={14} className="text-orange-300" /> Payroll Deduction Report
          </h3>
          {payrollReport?.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">User</th>
                    <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Base Salary</th>
                    <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Deduction</th>
                    <th className="text-right px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {payrollReport.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                      <td className="px-3 py-2 text-right text-gray-600">₹{p.baseSalary?.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-red-600">-₹{p.totalDeduction?.toFixed(0)}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">₹{p.netSalary?.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No data available</p>
          )}
        </div>
      </div>
    );
  };

  // ───────── MODALS ─────────

  // Detail Modal
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedEntry) return null;
    const e = selectedEntry;
    return (
      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
           <button onClick={() => setShowDetailModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-sm transition-all hover:bg-gray-50">
             <ArrowLeft size={16} /> Back to List
           </button>
           <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Damage Details</h2>
        </div>
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 mx-auto max-w-4xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-black text-gray-900">{e.displayId || e.id.slice(0, 8)}</p>
                <p className="text-xs text-gray-400">{new Date(e.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {renderStatusBadge(e.status)}
            </div>

            {/* Product Info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                {e.product?.image ? (
                  <img src={e.product.image} className="w-12 h-12 rounded-xl object-cover border" alt="" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center"><Package size={18} className="text-gray-400" /></div>
                )}
                <div>
                  <p className="font-bold text-gray-900">{e.product?.name}</p>
                  <p className="text-xs text-gray-400">Purchase Price: ₹{e.purchaseCost?.toFixed(2) || '0'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Qty</p>
                  <p className="text-lg font-black text-gray-900">{e.quantity}</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Type</p>
                  {renderTypeBadge(e.damageType)}
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-[9px] font-black text-red-400 uppercase">Loss</p>
                  <p className="text-lg font-black text-red-600">₹{(e.totalLoss || 0).toFixed(0)}</p>
                </div>
              </div>
            </div>

            {/* Reporter & Vehicle */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-[9px] font-black text-blue-400 uppercase tracking-wider mb-1">Reported By</p>
                <p className="text-sm font-bold text-blue-800">{e.reportedBy?.name}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Vehicle</p>
                <p className="text-sm font-bold text-slate-800">{e.vehicle?.vehicleNumber || e.vehicle?.displayId || 'Store Level'}</p>
              </div>
            </div>

            {/* Self-Responsibility */}
            <div className="bg-purple-50 rounded-xl p-3">
              <p className="text-[9px] font-black text-purple-400 uppercase tracking-wider mb-1">Self Responsibility</p>
              <p className="text-sm font-bold text-purple-800">{e.selfResponsibility}</p>
            </div>

            {/* Reason */}
            <div className="bg-amber-50 rounded-xl p-3">
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-wider mb-1">Reason</p>
              <p className="text-sm text-gray-700">{e.reason}</p>
            </div>

            {/* Images */}
            {e.images?.length > 0 && (
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ImageIcon size={10} /> Evidence Photos
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {e.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`Damage ${i + 1}`}
                      className="rounded-xl object-cover aspect-square border border-gray-200 cursor-pointer hover:opacity-80"
                      onClick={() => setShowImageModal([img])}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Admin Decision (if reviewed) */}
            {e.adminResponsibility && (
              <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                <p className="text-[9px] font-black text-emerald-400 uppercase tracking-wider mb-1">Admin Decision</p>
                <p className="text-sm font-bold text-emerald-800">{RESPONSIBILITY_LABELS[e.adminResponsibility] || e.adminResponsibility}</p>
                {e.adminRemarks && <p className="text-xs text-gray-500 mt-1 italic">"{e.adminRemarks}"</p>}
                {e.reviewedBy && <p className="text-[10px] text-gray-400 mt-1">Reviewed by: {e.reviewedBy.name}</p>}
              </div>
            )}

            {/* Deduction (if exists) */}
            {e.deduction && (
              <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Coins size={10} /> Deduction
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Mode</p>
                    <p className="font-bold text-gray-800">{e.deduction.mode}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">%</p>
                    <p className="font-bold text-gray-800">{e.deduction.percentage}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">Amount</p>
                    <p className="font-bold text-red-600">₹{e.deduction.deductionAmount?.toFixed(0)}</p>
                  </div>
                </div>
              </div>
            )}

            <div className={`rounded-xl p-3 ${e.stockAdjusted ? 'bg-emerald-50 border border-emerald-200' : 'bg-gray-50'}`}>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Stock Adjustment</p>
              <div className="flex items-center gap-2">
                 {e.stockAdjusted && <CheckCircle size={14} className="text-emerald-500" />}
                 <p className={`text-sm font-bold ${e.stockAdjusted ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {e.stockAdjusted ? 'Stock has been adjusted' : '⏳ Pending stock adjustment'}
                 </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Review Modal
  const renderReviewModal = () => {
    if (!showReviewModal || !selectedEntry) return null;
    return (
      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
           <button onClick={() => setShowReviewModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-sm transition-all hover:bg-gray-50">
             <ArrowLeft size={16} /> Back
           </button>
           <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Review Damage</h2>
        </div>
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 mx-auto max-w-2xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Entry summary */}
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-sm font-bold">{selectedEntry.product?.name} × {selectedEntry.quantity}</p>
              <p className="text-xs text-gray-400">{selectedEntry.reportedBy?.name} · {selectedEntry.displayId}</p>
              <p className="text-sm font-bold text-red-600 mt-1">Loss: ₹{(selectedEntry.totalLoss || 0).toFixed(2)}</p>
            </div>

            {/* Action */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Action</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'APPROVED', label: 'Approve', icon: CheckCircle, color: 'emerald' },
                  { val: 'REJECTED', label: 'Reject', icon: XCircle, color: 'red' },
                  { val: 'UNDER_REVIEW', label: 'Review', icon: AlertCircle, color: 'indigo' }
                ].map(a => (
                  <button
                    key={a.val}
                    onClick={() => setReviewAction(a.val)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${reviewAction === a.val ? `border-${a.color}-500 bg-${a.color}-50 text-${a.color}-600` : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}
                  >
                    <a.icon size={20} />
                    <span className="text-[10px] font-black uppercase">{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Responsibility Decision */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Responsibility Decision</p>
              <select
                value={adminResponsibility}
                onChange={(e) => setAdminResponsibility(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select Responsibility</option>
                <option value="VGE_RESPONSIBLE">VGE Responsible</option>
                <option value="NEGLIGENCE">Negligence</option>
                <option value="INTENTIONAL">Intentional</option>
                <option value="MIS_HANDLING">Mis-Handling</option>
                <option value="NOT_RESPONSIBLE">Not Responsible</option>
              </select>
            </div>

            {/* Remarks */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Remarks</p>
              <textarea
                value={adminRemarks}
                onChange={(e) => setAdminRemarks(e.target.value)}
                placeholder="Optional admin remarks..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleReviewSubmit}
              disabled={!reviewAction}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-200"
            >
              Submit Decision
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Deduction Modal
  const renderDeductionModal = () => {
    if (!showDeductionModal || !selectedEntry) return null;
    const loss = selectedEntry.totalLoss || 0;
    const calcAmount = deductionMode === 'FULL' ? loss : deductionMode === 'PARTIAL' ? (loss * deductionPercentage / 100) : 0;

    return (
      <div className="w-full space-y-4 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-4">
           <button onClick={() => setShowDeductionModal(false)} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 border border-gray-200 bg-white px-5 py-2.5 rounded-xl text-xs font-black uppercase shadow-sm transition-all hover:bg-gray-50">
             <ArrowLeft size={16} /> Back
           </button>
           <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Apply Deduction</h2>
        </div>
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 mx-auto max-w-2xl overflow-hidden">
          <div className="p-6 md:p-8 space-y-6">
            {/* Loss Info */}
            <div className="bg-red-50 rounded-xl p-4 border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black text-red-400 uppercase tracking-wider">Total Loss</p>
                  <p className="text-2xl font-black text-red-600">₹{loss.toFixed(2)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-gray-400 uppercase">Product</p>
                  <p className="text-sm font-bold text-gray-700">{selectedEntry.product?.name}</p>
                  <p className="text-xs text-gray-400">{selectedEntry.quantity} × ₹{(selectedEntry.purchaseCost || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Deduction Mode */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Deduction Mode</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { val: 'FULL', label: '100%', desc: 'Full deduction' },
                  { val: 'PARTIAL', label: 'Partial', desc: '% deduction' },
                  { val: 'WAIVED', label: 'Waived', desc: 'No deduction' }
                ].map(m => (
                  <button
                    key={m.val}
                    onClick={() => setDeductionMode(m.val)}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${deductionMode === m.val ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="text-sm font-black text-gray-900">{m.label}</p>
                    <p className="text-[10px] text-gray-400">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Percentage (only for partial) */}
            {deductionMode === 'PARTIAL' && (
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Percentage (%)</p>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={deductionPercentage}
                  onChange={(e) => setDeductionPercentage(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}

            {/* Calculated Amount */}
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200 text-center">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-wider">Deduction Amount</p>
              <p className="text-3xl font-black text-orange-600">₹{calcAmount.toFixed(2)}</p>
            </div>

            {/* Remarks */}
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-2">Remarks</p>
              <textarea
                value={deductionRemarks}
                onChange={(e) => setDeductionRemarks(e.target.value)}
                placeholder="Optional deduction remarks..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm resize-none h-20 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <button
              onClick={handleDeductionSubmit}
              className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm uppercase tracking-wider hover:bg-orange-600 transition-all shadow-lg shadow-orange-200"
            >
              Apply Deduction
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Image Lightbox
  const renderImageModal = () => {
    if (!showImageModal) return null;
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowImageModal(null)}>
        <div className="max-w-2xl w-full">
          <button onClick={() => setShowImageModal(null)} className="absolute top-4 right-4 text-white/80 hover:text-white"><X size={28} /></button>
          <div className="flex gap-2 overflow-x-auto pb-4">
            {showImageModal.map((img, i) => (
              <img key={i} src={img} alt={`Evidence ${i + 1}`} className="max-h-[80vh] rounded-2xl object-contain" />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ───────── MAIN RENDER ─────────
  if (showDetailModal && selectedEntry) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderDetailModal()}
        {renderImageModal()}
      </div>
    );
  }

  if (showReviewModal && selectedEntry) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderReviewModal()}
        {renderImageModal()}
      </div>
    );
  }

  if (showDeductionModal && selectedEntry) {
    return (
      <div className="w-full space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
        {renderDeductionModal()}
        {renderImageModal()}
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Page Header - Non sticky for better vertical space */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shadow-sm">
            <AlertTriangle size={20} className="text-red-600" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">Damage & Deductions</h1>
            <p className="text-xs text-gray-400 font-medium tracking-tight">Inventory damage tracking, accountability & financial recovery</p>
          </div>
        </div>
      </div>

      {/* Sticky Tab Navigation - Offsets exactly below app header */}
      <div className="sticky top-[4rem] z-30 bg-gray-50/95 backdrop-blur-md pt-2 pb-4 mb-2 -mx-4 px-4 md:-mx-8 md:px-8">
        <div className="flex gap-2 bg-gray-100/50 backdrop-blur rounded-xl p-1 overflow-x-auto [scrollbar-width:none]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'entries' && renderEntries()}
      {activeTab === 'deductions' && renderDeductions()}
      {activeTab === 'reports' && renderReportsTab()}

      {/* Modals */}
      {/* Modals */}
      {renderImageModal()}
    </div>
  );
}
