import React, { useState, useEffect } from 'react';
import { Coins, Truck, Search, Calendar, CheckCircle2, AlertCircle, Clock, ArrowRight, Eye, Plus, Loader2, X, Pencil, Trash2 } from 'lucide-react';
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

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    vehicleId: '',
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
    remark: '',
    denominations: {
      "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0
    }
  });

  // Delete Confirmation Modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingSummary, setDeletingSummary] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const stats = {
    totalExpected: summaries.reduce((sum, s) => sum + s.expectedCash, 0),
    totalActual: summaries.reduce((sum, s) => sum + s.actualCash, 0),
    totalExpenses: summaries.reduce((sum, s) => sum + (s.expenses || 0), 0),
    totalDifference: summaries.reduce((sum, s) => sum + s.difference, 0),
    matchedCount: summaries.filter(s => s.status === 'MATCHED').length,
    mismatchCount: summaries.filter(s => s.status === 'MISMATCHED').length,
    pendingCount: summaries.filter(s => s.status === 'PENDING').length,
  };

  const handleAssignFloat = async (e) => {
    e.preventDefault();
    if (!assignmentData.vehicleId) return toast.error('Select a vehicle');
    if (assignmentData.amount <= 0) return toast.error('Enter valid denominations');

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
        totalOpeningCash: assignmentData.amount,
        denominations: assignmentData.denominations,
      });
      toast.success(`Float assigned to ${selectedVehicle.vehicleNumber}`);
      setShowAssignModal(false);
      setAssignmentData({
        vehicleId: '',
        amount: 0,
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
        remark: editData.remark
      });
      toast.success('Opening cash updated — expected & difference recalculated');
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Cash Management</h2>
          <p className="text-sm text-gray-500">Track and reconcile daily vehicle cash movement</p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Expected Total', value: `₹${stats.totalExpected.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Total Expenses', value: `₹${stats.totalExpenses.toLocaleString()}`, color: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Actual Collected', value: `₹${stats.totalActual.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Diff', value: `₹${stats.totalDifference.toLocaleString()}`, color: stats.totalDifference === 0 ? 'text-gray-400' : 'text-rose-600', bg: 'bg-white' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-2xl border border-gray-100 shadow-sm`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{stat.label}</span>
            <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
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

      {/* Reconciliation Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Opening</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sales</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-rose-400">Expenses</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Expected</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-400">Chest</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Difference</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                    Loading cash summaries...
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Coins size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm font-bold text-gray-400">No cash records found for this date</p>
                  </td>
                </tr>
              ) : (
                summaries.map((summary) => (
                  <tr key={summary.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4 text-sm font-bold text-gray-600">₹{summary.openingCash.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{summary.cashSales.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-rose-500">₹{(summary.expenses || 0).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-gray-900 underline decoration-emerald-200 decoration-2 underline-offset-4">₹{summary.expectedCash.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800">₹{summary.actualCash.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-emerald-700">₹{(summary.submittedCash || 0).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {summary.difference === 0 ? (
                        <span className="text-xs font-bold text-gray-400">-</span>
                      ) : (
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${summary.difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                          {summary.difference > 0 ? `+₹${summary.difference}` : `-₹${Math.abs(summary.difference)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {summary.status === 'MATCHED' ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : summary.status === 'MISMATCHED' ? (
                          <AlertCircle size={14} className="text-rose-500" />
                        ) : (
                          <Clock size={14} className="text-orange-500" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${summary.status === 'MATCHED' ? 'text-emerald-600' :
                            summary.status === 'MISMATCHED' ? 'text-rose-600' : 'text-orange-600'
                          }`}>
                          {summary.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-gray-400">
                        <button className="p-2 hover:bg-gray-100 rounded-xl hover:text-emerald-600 transition-all">
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(summary)}
                          className="p-2 hover:bg-orange-50 rounded-xl hover:text-orange-600 transition-all"
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => { setDeletingSummary(summary); setShowDeleteModal(true); }}
                          className="p-2 hover:bg-rose-50 rounded-xl hover:text-rose-600 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Float Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
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

              {/* Denominations Section - Compact Grid */}
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

              <div className="flex items-center justify-between bg-emerald-600 px-5 py-4 rounded-2xl shadow-lg shadow-emerald-600/20 text-white group overflow-hidden">
                <div className="flex flex-col">
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Calculated Total</p>
                  <h4 className="text-2xl font-black tracking-tight">₹{assignmentData.amount.toLocaleString()}</h4>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
                  <Coins size={20} className="text-white opacity-40 group-hover:scale-110 transition-transform" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || assignmentData.amount <= 0}
                className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    Confirm & Submit
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Reconciliation Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
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
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Current Opening</span>
                  <span className="text-sm font-black text-gray-900">₹{editingSummary.openingCash.toLocaleString()}</span>
                </div>
                <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100">
                  <span className="text-[10px] font-black uppercase text-orange-600 block mb-1">New Opening</span>
                  <span className="text-sm font-black text-orange-700">₹{editData.openingCash.toLocaleString()}</span>
                </div>
              </div>

              {/* Denominations Section - Compact Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Opening Cash Denominations</label>
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

              {/* Info: what gets recalculated */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">What changes?</p>
                <p className="text-xs text-blue-500 font-bold">
                  Expected = New Opening + Cash Sales &nbsp;|&nbsp; Difference = Actual − Expected
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

      {/* Delete Confirmation Modal */}
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
                You are about to permanently delete all cash records for:
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
                Opening cash, closing cash &amp; daily summary will all be removed.
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
