import React, { useState, useEffect } from 'react';
import { Coins, Truck, Search, Calendar, CheckCircle2, AlertCircle, AlertTriangle, Clock, ArrowRight, Eye, Plus, Loader2, X, Pencil, Trash2, Sun, Moon } from 'lucide-react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';
import { getAdminReconciliation, adminSubmitOpeningCash, adminUpdateReconciliation, adminDeleteReconciliation } from '../../services/cashService';
import adminAPI from '../../services/adminService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminCashManagement() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const currentUser = useUserStore(s => s.user);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    vehicleId: '',
    shift: 1,
    amount: 0,
    denominations: {
      "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
    }
  });

  // Edit Reconciliation Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSummary, setEditingSummary] = useState(null);
  const [editData, setEditData] = useState({
    openingCash: 0,
    shift: 1,
    remark: '',
    denominations: {
      "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
    }
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // View Detail Modal
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSummary, setViewingSummary] = useState(null);

  const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

  const handleDenominationChange = (value, denom, type = 'assign') => {
    const qty = parseInt(value) || 0;
    if (type === 'assign') {
      const newDenoms = { ...assignmentData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setAssignmentData({ ...assignmentData, denominations: newDenoms, amount: total });
    } else {
      const newDenoms = { ...editData.denominations, [denom]: qty };
      const total = Object.entries(newDenoms).reduce((sum, [d, q]) => sum + (parseInt(d) * q), 0);
      setEditData({ ...editData, denominations: newDenoms, openingCash: total });
    }
  };

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const data = await getAdminReconciliation(date);
      setSummaries(data);
    } catch (error) {
      toast.error('Failed to fetch cash summaries');
    } finally {
      setLoading(false);
    }
  };

  const fetchVehicles = async () => {
    try {
      const { data } = await adminAPI.getVehicles();
      setVehicles(data);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  useEffect(() => {
    fetchSummaries();
    fetchVehicles();
  }, [date]);

  const handleAssignFloat = async (e) => {
    e.preventDefault();
    if (!assignmentData.vehicleId) return toast.error('Select a vehicle');
    if (!assignmentData.isNoService && assignmentData.amount <= 0) {
      return toast.error('Enter valid denominations or mark as No Service');
    }

    const selectedVehicle = vehicles.find(v => v.id === assignmentData.vehicleId);
    const agent = selectedVehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');
    if (!agent) {
      return toast.error('This vehicle has no Sales Agent assigned');
    }

    setIsSubmitting(true);
    try {
      await adminSubmitOpeningCash({
        vehicleId: assignmentData.vehicleId,
        userId: agent.id,
        totalOpeningCash: assignmentData.isNoService ? 0 : assignmentData.amount,
        denominations: assignmentData.isNoService ? {} : assignmentData.denominations,
        shift: assignmentData.shift,
        isNoService: assignmentData.isNoService || false,
        date: date
      });
      
      const msg = assignmentData.isNoService 
        ? `Shift ${assignmentData.shift} marked as No Service for ${selectedVehicle.vehicleNumber}`
        : `Shift ${assignmentData.shift} float assigned to ${selectedVehicle.vehicleNumber}`;
      
      toast.success(msg);
      setShowAssignModal(false);
      setAssignmentData({
        vehicleId: '',
        shift: 1,
        amount: 0,
        isNoService: false,
        denominations: { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
      });
      fetchSummaries();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign float');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (summary) => {
    setEditingSummary(summary);
    setEditData({
      openingCash: summary.openingCash,
      shift: 1,
      remark: 'Corrected by Admin',
      denominations: summary.openingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
    });
    setShowEditModal(true);
  };

  const handleUpdateReconciliation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await adminUpdateReconciliation({
        vehicleId: editingSummary.vehicleId,
        date: editingSummary.date,
        openingCash: editData.openingCash,
        denominations: editData.denominations,
        remark: editData.remark,
        shift: editData.shift,
      });
      toast.success(`Shift ${editData.shift} opening cash updated`);
      setShowEditModal(false);
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to update opening cash');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await adminDeleteReconciliation(deletingSummary.vehicleId, deletingSummary.date);
      toast.success(`Records deleted for ${deletingSummary.vehicle.vehicleNumber}`);
      setShowDeleteModal(false);
      setDeletingSummary(null);
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenView = (summary) => {
    setViewingSummary(summary);
    setShowViewModal(true);
  };

  const filteredSummaries = summaries.filter(s => {
    if (storeFilterId && s.vehicle?.storeId !== storeFilterId) return false;
    const searchLower = searchTerm.toLowerCase();
    const agent = s.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');
    return (
      s.vehicle?.vehicleNumber?.toLowerCase().includes(searchLower) ||
      s.vehicle?.vehicleName?.toLowerCase().includes(searchLower) ||
      agent?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Helper: shift status badge
  const ShiftStatusBadge = ({ opening, closing }) => {
    if (closing) {
      if (closing.isNoService) return (
        <div className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-rose-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">No Service</span>
        </div>
      );
      const diff = closing.difference || 0;
      if (diff === 0) return (
        <div className="flex items-center gap-1">
          <CheckCircle2 size={12} className="text-emerald-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">Matched</span>
        </div>
      );
      return (
        <div className="flex items-center gap-1">
          <AlertCircle size={12} className="text-rose-500" />
          <span className="text-[9px] font-black uppercase tracking-widest text-rose-600">
            {diff > 0 ? `+₹${diff}` : `-₹${Math.abs(diff)}`}
          </span>
        </div>
      );
    }
    if (opening) return (
      <div className="flex items-center gap-1">
        <Clock size={12} className="text-orange-500" />
        <span className="text-[9px] font-black uppercase tracking-widest text-orange-600">Open</span>
      </div>
    );
    return <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Not Assigned</span>;
  };

  // Shift selector component
  const ShiftSelector = ({ value, onChange, disabledShifts = [] }) => (
    <div className="flex gap-2">
      {[
        { id: 1, label: 'Shift 1', sub: 'Morning', icon: Sun, color: 'amber' },
        { id: 2, label: 'Shift 2', sub: 'Afternoon', icon: Moon, color: 'indigo' },
      ].map(s => {
        const isDisabled = disabledShifts.includes(s.id);
        return (
          <button
            key={s.id}
            type="button"
            disabled={isDisabled}
            onClick={() => onChange(s.id)}
            className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all font-bold text-xs uppercase tracking-wider ${
              isDisabled ? 'border-gray-50 bg-gray-50 text-gray-300 cursor-not-allowed opacity-50' :
              value === s.id
                ? s.color === 'amber'
                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                  : 'border-indigo-400 bg-indigo-50 text-indigo-700'
                : 'border-gray-100 bg-white text-gray-400 hover:border-gray-200'
              }`}
          >
            <s.icon size={16} />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] font-black">{s.label}</span>
              <span className="text-[8px] font-bold opacity-60 truncate">
                {isDisabled ? 'Close S1 first' : s.sub}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );

  // Denomination display grid (for view modal)
  const DenominationGrid = ({ denominations, label }) => {
    if (!denominations || Object.keys(denominations).length === 0) return null;
    const nonZero = denominationsList.filter(d => denominations[d] > 0);
    if (nonZero.length === 0) return null;
    return (
      <div className="space-y-1.5">
        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</span>
        <div className="grid grid-cols-3 gap-1.5">
          {nonZero.map(d => (
            <div key={d} className="bg-gray-50 rounded-lg p-2 text-center border border-gray-100">
              <span className="text-[9px] font-black text-gray-400 block">₹{d}</span>
              <span className="text-xs font-black text-gray-700">× {denominations[d]}</span>
              <span className="text-[8px] text-gray-400 block">= ₹{(d * denominations[d]).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Gatekeeper integration
  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN';
  const isTenantRoute = location.pathname.includes('/tenant/');
  
  if (isGlobalRole && isTenantRoute && !storeFilterId) {
    return (
       <StoreSelector 
         title="Cash Management"
         description="Please select a store branch to manage its assigned daily shifts and cash reconciliations."
         onSelect={(id) => {
           setSearchParams({ storeId: id });
         }}
       />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Cash Management</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">Track and reconcile daily vehicle cash — Shift 1 & Shift 2 (Independent)</p>
            {isTenantRoute && storeFilterId && (
              <>
                <span className="text-gray-300">•</span>
                <button 
                  onClick={() => setSearchParams({})} 
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded transition-colors mt-0.5"
                >
                  Change Store
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search by vehicle or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all w-64 shadow-sm font-medium"
            />
          </div>
          <button
            onClick={() => setShowAssignModal(true)}
            className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus size={18} strokeWidth={2.5} />
            Assign
          </button>
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <Calendar size={18} className="text-emerald-500 ml-2" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 pr-2"
            />
          </div>
        </div>
      </div>

      {/* Mobile Search */}
      <div className="sm:hidden relative group px-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          type="text"
          placeholder="Search by vehicle or agent..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm font-medium"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'reconciliation' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
        >
          Daily Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'live' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
        >
          Live Cash Status
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'reconciliation' ? (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500">S1 Open</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-400">S1 Close</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">S2 Open</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-400">S2 Close</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500">S1 Status</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">S2 Status</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500">Day Exp.</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                      Loading cash summaries...
                    </td>
                  </tr>
                ) : filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center">
                      <Coins size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-sm font-bold text-gray-400">No matching cash records found</p>
                    </td>
                  </tr>
                ) : (
                  filteredSummaries.map((summary) => {
                    const s1 = summary.shiftDetails?.shift1;
                    const s2 = summary.shiftDetails?.shift2;
                    const s1Open = s1?.opening?.totalOpeningCash || 0;
                    const s1Close = s1?.closing?.actualCash || s1?.live?.expected || 0;
                    const s2Open = s2?.opening?.totalOpeningCash || 0;
                    const s2Close = s2?.closing?.actualCash || s2?.live?.expected || 0;

                    return (
                      <tr key={summary.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                              <Truck size={16} strokeWidth={2.5} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 leading-none">{summary.vehicle.vehicleNumber}</span>
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{summary.vehicle.vehicleName || 'Standard'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-bold ${s1Open > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                            ₹{s1Open.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {s1?.closing ? (
                            <span className="text-sm font-bold text-amber-700">₹{s1Close.toLocaleString()}</span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 uppercase">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`text-sm font-bold ${s2Open > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                            ₹{s2Open.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          {s2?.closing ? (
                            <span className="text-sm font-bold text-indigo-700">₹{s2Close.toLocaleString()}</span>
                          ) : (
                            <span className="text-[9px] font-bold text-gray-300 uppercase">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
                        </td>
                        <td className="px-4 py-4">
                          <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-rose-500">₹{(summary.dailySales?.totalCash === 0 && summary.dailySales?.grandTotal > 0 ? 0 : summary.shiftDetails?.shift1?.live?.expenses + summary.shiftDetails?.shift2?.live?.expenses || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 text-gray-400">
                            <button onClick={() => handleOpenView(summary)} className="p-2 hover:bg-emerald-50 rounded-xl hover:text-emerald-600 transition-all"><Eye size={18} /></button>
                            <>
                              <button onClick={() => handleOpenEdit(summary)} className="p-2 hover:bg-orange-50 rounded-xl hover:text-orange-600 transition-all"><Pencil size={18} /></button>
                              <button onClick={() => { setDeletingSummary(summary); setShowDeleteModal(true); }} className="p-2 hover:bg-rose-50 rounded-xl hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                            </>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* LIVE CASH STATUS TABLE */
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-emerald-50/50 border-b border-emerald-100">
                  <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Vehicle / Agent</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Status</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600 font-bold">Total Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">Cash Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-blue-500">UPI Sales</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-rose-500">Live Exp.</th>
                  <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-700">In-Hand Cash</th>
                  <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredSummaries.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-bold">No active vehicles found</td>
                  </tr>
                ) : (
                  filteredSummaries.map((summary) => {
                    const s1 = summary.shiftDetails?.shift1;
                    const s2 = summary.shiftDetails?.shift2;
                    const activeShift = s2?.opening && !s2?.closing ? 2 : (s1?.opening && !s1?.closing ? 1 : null);
                    const metrics = activeShift === 2 ? s2.live : (activeShift === 1 ? s1.live : null);
                    const agent = summary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');

                    return (
                      <tr key={summary.id} className="hover:bg-emerald-50/20 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                              <Truck size={18} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-gray-900 leading-none">{summary.vehicle.vehicleNumber}</span>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 group-hover:text-emerald-600 transition-colors">{agent?.name || 'No Agent'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {activeShift ? (
                            <div className="flex items-center gap-2">
                              <div className="relative">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                              </div>
                              <span className="text-[10px] font-black text-emerald-700 uppercase">Live — Shift {activeShift}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-gray-400 uppercase">Closed / Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-black text-gray-900 leading-none">₹{summary.dailySales.grandTotal.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-emerald-600">₹{summary.dailySales.totalCash.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-blue-600">₹{summary.dailySales.totalUpi.toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm font-bold text-rose-500">₹{(metrics?.expenses || 0).toLocaleString()}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="bg-emerald-100/50 px-3 py-1.5 rounded-lg w-fit border border-emerald-200/50">
                            <span className="text-sm font-black text-emerald-700">₹{(metrics?.expected || 0).toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button 
                            onClick={() => handleOpenView(summary)}
                            className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-emerald-600 transition-all"
                          >
                            <ArrowRight size={18} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== VIEW DETAIL MODAL ========== */}
      {showViewModal && viewingSummary && (() => {
        const s1 = viewingSummary.shiftDetails?.shift1;
        const s2 = viewingSummary.shiftDetails?.shift2;
        const agent = viewingSummary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl rounded-[2rem] p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                    <Eye size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 leading-tight">Cash Detail</h3>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">
                      {viewingSummary.vehicle.vehicleNumber} • {viewingSummary.date}
                      {agent ? ` • ${agent.name}` : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowViewModal(false); setViewingSummary(null); }}
                  className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Daily Sales Breakdown */}
              {viewingSummary.dailySales && (
                <div className="grid grid-cols-4 gap-2 bg-gray-50 border border-gray-100 rounded-xl p-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Cash Sales</span>
                    <span className="text-sm font-black text-emerald-600">₹{viewingSummary.dailySales.totalCash.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col border-l border-gray-200 pl-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">UPI Sales</span>
                    <span className="text-sm font-black text-blue-600">₹{viewingSummary.dailySales.totalUpi.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col border-l border-gray-200 pl-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Card Sales</span>
                    <span className="text-sm font-black text-purple-600">₹{viewingSummary.dailySales.totalCard.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-col border-l border-gray-200 pl-3">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Sales</span>
                    <span className="text-sm font-black text-gray-900">₹{viewingSummary.dailySales.grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {/* Two-column shift cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Shift 1 Card */}
                <div className="rounded-2xl border-2 border-amber-200 overflow-hidden">
                  <div className="bg-amber-50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sun size={16} className="text-amber-600" />
                      <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Shift 1 — Morning</span>
                    </div>
                    <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
                  </div>
                  <div className="p-5 space-y-4 bg-white">
                    {/* Opening */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Opening Cash</span>
                      <span className={`text-sm font-black ${s1?.opening ? 'text-amber-700' : 'text-gray-300'}`}>
                        ₹{(s1?.opening?.totalOpeningCash || 0).toLocaleString()}
                      </span>
                    </div>
                    <DenominationGrid denominations={s1?.opening?.denominations} label="Opening Denominations" />

                    {/* Closing */}
                    {s1?.closing ? (
                      <>
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          <div className="flex justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Cash Sales</span>
                            <span className="text-sm font-black text-emerald-600">₹{(s1.closing.cashSales || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Expenses</span>
                            <span className="text-sm font-black text-rose-500">-₹{(s1.closing.expenses || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Expected</span>
                            <span className="text-sm font-black text-gray-900">₹{(s1.closing.expectedCash || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Actual Submitted</span>
                            <span className="text-sm font-black text-slate-800">₹{(s1.closing.actualCash || 0).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Difference</span>
                            {s1.closing.difference === 0 ? (
                              <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">₹0 ✓</span>
                            ) : (
                              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${s1.closing.difference > 0 ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50'}`}>
                                {s1.closing.difference > 0 ? '+' : ''}₹{s1.closing.difference?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <DenominationGrid denominations={s1.closing.denominations} label="Closing Denominations" />
                        
                        {s1.closing.remark && (
                          <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100/50">
                            <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-1">Agent Remark</span>
                            <p className="text-xs text-amber-900 font-medium italic">"{s1.closing.remark}"</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="border-t border-gray-100 pt-3 text-center py-4">
                        <Clock size={20} className="mx-auto text-gray-300 mb-1" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Closing not submitted</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shift 2 Card */}
                <div className="rounded-2xl border-2 border-indigo-200 overflow-hidden">
                  <div className="bg-indigo-50 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Moon size={16} className="text-indigo-600" />
                      <span className="text-xs font-black text-indigo-700 uppercase tracking-widest">Shift 2 — Afternoon</span>
                    </div>
                    <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
                  </div>
                  <div className="p-5 space-y-4 bg-white">
                    {s2?.opening ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Opening Cash</span>
                          <span className="text-sm font-black text-indigo-700">
                            ₹{(s2.opening.totalOpeningCash || 0).toLocaleString()}
                          </span>
                        </div>
                        <DenominationGrid denominations={s2.opening.denominations} label="Opening Denominations" />

                        {s2?.closing ? (
                          <>
                            <div className="border-t border-gray-100 pt-3 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Cash Sales</span>
                                <span className="text-sm font-black text-emerald-600">₹{(s2.closing.cashSales || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Expenses</span>
                                <span className="text-sm font-black text-rose-500">-₹{(s2.closing.expenses || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Expected</span>
                                <span className="text-sm font-black text-gray-900">₹{(s2.closing.expectedCash || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Actual Submitted</span>
                                <span className="text-sm font-black text-slate-800">₹{(s2.closing.actualCash || 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between items-center pt-1 border-t border-gray-50">
                                <span className="text-[10px] font-black text-gray-400 uppercase">Difference</span>
                                {s2.closing.difference === 0 ? (
                                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">₹0 ✓</span>
                                ) : (
                                  <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${s2.closing.difference > 0 ? 'text-blue-600 bg-blue-50' : 'text-rose-600 bg-rose-50'}`}>
                                    {s2.closing.difference > 0 ? '+' : ''}₹{s2.closing.difference?.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            <DenominationGrid denominations={s2.closing.denominations} label="Closing Denominations" />
                            
                            {s2.closing.remark && (
                              <div className="mt-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Agent Remark</span>
                                <p className="text-xs text-indigo-900 font-medium italic">"{s2.closing.remark}"</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="border-t border-gray-100 pt-3 text-center py-4">
                            <Clock size={20} className="mx-auto text-gray-300 mb-1" />
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Closing not submitted</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8 space-y-2">
                        <Moon size={28} className="mx-auto text-gray-200" />
                        <span className="text-xs font-bold text-gray-400 block">Shift 2 not assigned</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => { setShowViewModal(false); setViewingSummary(null); }}
                className="w-full bg-gray-100 text-gray-600 font-black text-sm py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}

      {/* ========== FLOAT ASSIGNMENT MODAL ========== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <Coins size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Assign Float</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Daily Opening Cash</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignFloat} className="space-y-4">
              {/* Shift Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Shift</label>
                <ShiftSelector 
                  value={assignmentData.shift} 
                  onChange={(s) => setAssignmentData({ ...assignmentData, shift: s })} 
                  disabledShifts={(() => {
                    if (!assignmentData.vehicleId) return [];
                    const summary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                    const s1Closed = summary?.shiftDetails?.shift1?.closing;
                    // If S1 is not closed, disable S2 assignment
                    return !s1Closed ? [2] : [];
                  })()}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Vehicle / Agent</label>
                <select
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all outline-none"
                  value={assignmentData.vehicleId}
                  onChange={(e) => setAssignmentData({ ...assignmentData, vehicleId: e.target.value })}
                >
                  <option value="">Select a vehicle...</option>
                  {vehicles
                    .map((v) => {
                      const agent = v.assignedUsers?.find(u => u.role === 'SALES_AGENT');
                      if (!agent) return null;
                      return (
                        <option key={v.id} value={v.id}>
                          {agent.name} ({v.vehicleNumber})
                        </option>
                      );
                    })
                    .filter(Boolean)
                  }
                </select>
              </div>

              {(() => {
                if (!assignmentData.vehicleId) return null;
                const summary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                const shiftData = assignmentData.shift === 1 ? summary?.shiftDetails?.shift1 : summary?.shiftDetails?.shift2;
                const opening = shiftData?.opening;
                const closing = shiftData?.closing;
                
                if (!opening) return (
                  <>
                    <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100/50 group cursor-pointer" onClick={() => setAssignmentData({ ...assignmentData, isNoService: !assignmentData.isNoService })}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${assignmentData.isNoService ? 'bg-rose-500 text-white' : 'bg-white text-rose-300 group-hover:text-rose-400'}`}>
                        <AlertTriangle size={20} />
                      </div>
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block leading-none mb-1">Vehicle Damage / Service</span>
                        <span className="text-xs font-bold text-rose-900 opacity-70">Mark Shift {assignmentData.shift} as "No Service" for today</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={assignmentData.isNoService || false}
                        onChange={(e) => setAssignmentData({ ...assignmentData, isNoService: e.target.checked })}
                        className="w-5 h-5 rounded-lg border-rose-200 text-rose-500 focus:ring-rose-500 cursor-pointer"
                      />
                    </div>

                    {!assignmentData.isNoService && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Denominations</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                          {denominationsList.map((denom) => (
                            <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-emerald-200 transition-all">
                              <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                                <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                                <span className="text-[9px] font-bold text-emerald-600/40 uppercase">₹{(denom * (assignmentData.denominations[denom] || 0)).toLocaleString()}</span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-center">
                                <span className="text-[10px] text-gray-200">×</span>
                                <input
                                  type="number"
                                  placeholder="0"
                                  min="0"
                                  className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                                  value={assignmentData.denominations[denom] || ''}
                                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'assign')}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className={`flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white group overflow-hidden transition-all ${
                      assignmentData.isNoService 
                        ? 'bg-rose-600 shadow-rose-600/20' 
                        : (assignmentData.shift === 1 ? 'bg-amber-600 shadow-amber-600/20' : 'bg-indigo-600 shadow-indigo-600/20')
                    }`}>
                      <div className="flex flex-col">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">
                          {assignmentData.isNoService ? 'No Service Applied' : `Shift ${assignmentData.shift} Total`}
                        </p>
                        <h4 className="text-2xl font-black tracking-tight">₹{assignmentData.isNoService ? '0' : assignmentData.amount.toLocaleString()}</h4>
                      </div>
                      <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                        {assignmentData.isNoService ? <AlertTriangle size={20} className="text-white opacity-40" /> : assignmentData.shift === 1 ? <Sun size={20} className="text-white opacity-40" /> : <Moon size={20} className="text-white opacity-40" />}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || (!assignmentData.isNoService && assignmentData.amount <= 0)}
                      className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Submit</>}
                    </button>
                  </>
                );

                if (opening.isNoService) {
                  return (
                    <div className="bg-rose-950 rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 border border-rose-900/50">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-rose-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400">Shift Cancelled</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <span className="text-xs font-black text-rose-100 block">Vehicle Damage / Service</span>
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                          <p className="text-[10px] font-bold text-rose-200/60 leading-relaxed uppercase tracking-wider">
                            This shift was marked as non-operational by administration. No assignment or sales possible.
                          </p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowAssignModal(false)} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Close View</button>
                    </div>
                  );
                }

                if (closing) {
                  return (
                    <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400" />
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400">Shift Completed</span>
                        </div>
                        <span className="text-[10px] font-bold text-white/40">Final Summary</span>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-white/30 block">Sales</span>
                          <span className="text-sm font-black">₹{closing.cashSales?.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-white/30 block">Actual</span>
                          <span className="text-sm font-black text-emerald-400">₹{closing.actualCash?.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-white/30 block">Status</span>
                          <div className="flex items-center gap-1">
                            <span className={`text-[10px] font-black uppercase truncate ${closing.difference === 0 ? 'text-white' : 'text-rose-400'}`}>
                              {closing.difference === 0 ? 'Matched' : closing.difference > 0 ? `+₹${closing.difference}` : `-₹${Math.abs(closing.difference)}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-white/40 uppercase">Float Used</span>
                          <span className="text-xs font-black opacity-80">₹{opening.totalOpeningCash?.toLocaleString()}</span>
                        </div>
                        <div className="px-3 py-1 bg-white/10 rounded-lg border border-white/5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/60">Session Ended</span>
                        </div>
                      </div>
                      <button type="button" onClick={() => setShowAssignModal(false)} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Close View</button>
                    </div>
                  );
                }

                // Assigned but not closed
                return (
                  <div className="bg-slate-900 rounded-[1.5rem] p-5 text-white shadow-xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <Clock size={16} className="text-amber-400" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Float Assigned</span>
                      </div>
                      <span className="text-[10px] font-bold text-white/40">Work in Progress</span>
                    </div>

                    <div className="text-center py-4 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase text-white/30 block">Current Float In Hand</span>
                        <span className="text-4xl font-black text-white tracking-tighter">₹{opening.totalOpeningCash?.toLocaleString()}</span>
                      </div>
                      <p className="text-[10px] font-bold text-white/40 leading-relaxed max-w-[200px] mx-auto uppercase tracking-wider">
                        The agent is currently operating with this float. Re-assignment is locked.
                      </p>
                    </div>

                    <button type="button" onClick={() => setShowAssignModal(false)} className="w-full mt-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Close View</button>
                  </div>
                );
              })()}
            </form>
          </div>
        </div>
      )}

      {/* ========== EDIT RECONCILIATION MODAL ========== */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Edit reconciliation</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">{editingSummary.vehicle.vehicleNumber} • {editingSummary.date}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateReconciliation} className="space-y-4">
              {/* Shift Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Which Shift to Edit?</label>
                <ShiftSelector value={editData.shift} onChange={(s) => setEditData({ ...editData, shift: s })} />
              </div>

              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">New S{editData.shift} Opening</span>
                <span className="text-sm font-black text-orange-700">₹{editData.openingCash.toLocaleString()}</span>
              </div>

              {/* Denominations */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Shift {editData.shift} Denominations</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                  {denominationsList.map((denom) => (
                    <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-orange-200 transition-all">
                      <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                        <span className="text-[10px] font-black text-gray-400 group-hover:text-orange-600">₹{denom}</span>
                        <span className="text-[9px] font-bold text-orange-600/40 uppercase">₹{(denom * (editData.denominations[denom] || 0)).toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-center">
                        <span className="text-[10px] text-gray-200">×</span>
                        <input
                          type="number"
                          placeholder="0"
                          min="0"
                          className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                          value={editData.denominations[denom] || ''}
                          onChange={(e) => handleDenominationChange(e.target.value, denom, 'edit')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Independent Shifts</p>
                <p className="text-xs text-blue-500 font-bold">
                  Each shift is recalculated independently: Opening + Sales − Expenses
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Adjustment Reason</label>
                <textarea
                  required
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all outline-none h-20 resize-none"
                  placeholder="Why are you changing the physical count?"
                  value={editData.remark}
                  onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-xl shadow-orange-600/20 flex items-center justify-center gap-2 hover:bg-orange-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Update Reconciliation
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== DELETE CONFIRMATION MODAL ========== */}
      {showDeleteModal && deletingSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <Trash2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 leading-tight">Delete Records</h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">This action cannot be undone</p>
                </div>
              </div>
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingSummary(null); }}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-100 rounded-2xl px-4 py-4 space-y-2">
              <p className="text-xs font-bold text-rose-700">
                You are about to permanently delete all cash records (both shifts) for:
              </p>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600">
                  <Truck size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-none">{deletingSummary.vehicle.vehicleNumber}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{deletingSummary.date}</p>
                </div>
              </div>
              <p className="text-[10px] text-rose-500 font-bold mt-2">
                Both shifts' opening cash, closing cash &amp; daily summary will all be removed.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeletingSummary(null); }}
                className="flex-1 bg-gray-100 text-gray-600 font-black text-sm py-3 rounded-xl hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 bg-rose-600 text-white font-black text-sm py-3 rounded-xl hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
