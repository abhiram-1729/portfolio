import React, { useState, useEffect } from 'react';
import lateEntryService from '../../services/lateEntryService';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';
import { Edit, X, Save, User, Clock, Calendar, AlertTriangle, ShieldCheck } from 'lucide-react';

const AdminLateEntryReport = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: format(new Date().setDate(1), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    userId: ''
  });
  const [stats, setStats] = useState({ dailyTrend: [], penaltyDistribution: [], exceptions: [] });
  const [topOffenders, setTopOffenders] = useState([]);
  const [editingRecord, setEditingRecord] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    userId: '',
    date: '',
    shiftStart: '',
    checkinTime: '',
    lateMinutes: '',
    penaltyApplied: '',
    penaltyValue: '',
    isWaived: false
  });

  useEffect(() => {
    fetchReport();
    fetchAnalytics();
  }, [filters]);

  const fetchAnalytics = async () => {
    try {
      const statsRes = await lateEntryService.getAnalyticsStats(filters);
      if (statsRes.success) setStats(statsRes.data);

      const topRes = await lateEntryService.getTopOffenders();
      if (topRes.success) setTopOffenders(topRes.data);
    } catch (err) {
      console.error('Analytics load error:', err);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await lateEntryService.getAdminReport(filters);
      if (res.success) {
        setRecords(res.data);
      }
    } catch (err) {
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, status) => {
    try {
      const res = await lateEntryService.reviewException(id, { status });
      if (res.success) {
        toast.success(`Exception ${status.toLowerCase()}ed`);
        fetchReport();
      }
    } catch (err) {
      toast.error('Failed to update exception');
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setEditForm({
      userId: record.userId,
      date: record.date,
      shiftStart: record.shiftStart,
      checkinTime: record.checkinTime ? format(new Date(record.checkinTime), "yyyy-MM-dd'T'HH:mm") : '',
      lateMinutes: record.lateMinutes,
      penaltyApplied: record.penaltyApplied,
      penaltyValue: record.penaltyValue,
      isWaived: record.isWaived
    });
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      const res = await lateEntryService.updateRecord(editingRecord.id, editForm);
      if (res.success) {
        toast.success('Late entry updated');
        setShowEditModal(false);
        fetchReport();
      }
    } catch (err) {
      toast.error('Failed to update record');
    }
  };

  const summaryStats = {
    totalLates: records.length,
    totalPenalties: records.reduce((sum, r) => sum + (r.isWaived ? 0 : r.penaltyValue), 0),
    pendingExceptions: records.filter(r => r.exception && r.exception.status === 'PENDING').length
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Late Entry Report</h1>
          <p className="text-gray-500">View and manage late entries and penalty deductions.</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="date" 
            className="px-3 py-2 rounded-lg border text-sm"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
          />
          <span className="text-gray-400">to</span>
          <input 
            type="date" 
            className="px-3 py-2 rounded-lg border text-sm"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Late Marks</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{summaryStats.totalLates}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Penalties Applied</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{summaryStats.totalPenalties} <span className="text-sm font-normal text-gray-400">Days</span></p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Pending Exceptions</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{summaryStats.pendingExceptions}</p>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
          <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Late Entry Trend</h3>
          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={stats.dailyTrend}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="date" fontSize={10} tickFormatter={(val) => val.split('-')[2]} />
              <YAxis fontSize={10} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top Offenders */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 overflow-y-auto max-h-80">
          <h3 className="text-sm font-bold text-gray-800 mb-4 uppercase tracking-wider">Top Offenders (This Month)</h3>
          <div className="space-y-4">
            {topOffenders.map((user, idx) => (
              <div key={user.userId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{user.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase">{user.role}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-rose-600">{user.lateCount} Lates</p>
                  <p className="text-[10px] text-gray-400">-{user.totalPenalties} Days</p>
                </div>
              </div>
            ))}
            {topOffenders.length === 0 && <p className="text-center text-gray-400 py-8 italic">No data yet</p>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs font-bold uppercase">
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Shift Start</th>
                <th className="px-6 py-4">Check-In</th>
                <th className="px-6 py-4">Late Mins</th>
                <th className="px-6 py-4">Penalty</th>
                <th className="px-6 py-4">Waiver Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-400">Loading records...</td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan="8" className="px-6 py-12 text-center text-gray-400">No late entries found for this period.</td></tr>
              ) : records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-800">{record.user.name}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{record.date}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{record.shiftStart}</td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{format(new Date(record.checkinTime), 'HH:mm')}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs font-bold">
                      {record.lateMinutes < 60 ? `${record.lateMinutes} mins` : `${Math.floor(record.lateMinutes / 60)} hr ${record.lateMinutes % 60 > 0 ? `${record.lateMinutes % 60} mins` : ''}`}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${record.isWaived ? 'line-through text-gray-400' : 'text-amber-700'}`}>
                      {record.penaltyApplied} ({record.penaltyValue})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {record.exception ? (
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{record.exception.reason?.replace('_', ' ')}</span>
                        {record.exception.description && (
                          <span className="text-[9px] text-slate-400 italic truncate max-w-[150px]" title={record.exception.description}>
                            "{record.exception.description}"
                          </span>
                        )}
                      </div>
                    ) : record.isWaived && record.waivedReason ? (
                      <span className="text-[10px] text-slate-400 italic">"{record.waivedReason}"</span>
                    ) : (
                      <span className="text-[10px] text-slate-300">---</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {record.isWaived ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase w-fit">Waived</span>
                    ) : record.exception?.status === 'PENDING' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase w-fit">Pending Appr.</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold uppercase w-fit">Applied</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(record)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit Record"
                      >
                        <Edit size={14} />
                      </button>
                      {record.exception?.status === 'PENDING' && (
                        <>
                          <button 
                            onClick={() => handleReview(record.exception.id, 'APPROVED')}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve Exception"
                          >
                            ✅
                          </button>
                          <button 
                            onClick={() => handleReview(record.exception.id, 'REJECTED')}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject Exception"
                          >
                            ❌
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                  <Edit size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Edit Late Entry</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update record manually</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Employee Name</label>
                  <div className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 flex items-center gap-2">
                    <User size={14} className="text-slate-400" />
                    {editingRecord?.user?.name}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                  <input 
                    type="date"
                    value={editForm.date}
                    onChange={e => setEditForm({...editForm, date: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Shift Start</label>
                  <input 
                    type="text"
                    value={editForm.shiftStart}
                    onChange={e => setEditForm({...editForm, shiftStart: e.target.value})}
                    placeholder="e.g. 09:00 AM"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-In Time</label>
                  <input 
                    type="datetime-local"
                    value={editForm.checkinTime}
                    onChange={e => setEditForm({...editForm, checkinTime: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Late Minutes</label>
                  <input 
                    type="number"
                    value={editForm.lateMinutes}
                    onChange={e => setEditForm({...editForm, lateMinutes: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Waive Status</label>
                  <button 
                    onClick={() => setEditForm({...editForm, isWaived: !editForm.isWaived})}
                    className={`w-full px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${editForm.isWaived ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                  >
                    {editForm.isWaived ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                    {editForm.isWaived ? 'Waived' : 'Active'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penalty Type</label>
                  <select 
                    value={editForm.penaltyApplied}
                    onChange={e => setEditForm({...editForm, penaltyApplied: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                  >
                    <option value="WARNING">Warning</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="FULL_DAY">Full Day</option>
                    <option value="LOP">LOP</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Penalty Value (Days)</label>
                  <input 
                    type="number"
                    step="0.5"
                    value={editForm.penaltyValue}
                    onChange={e => setEditForm({...editForm, penaltyValue: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-gray-100 flex gap-3">
              <button 
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleUpdate}
                className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={16} /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLateEntryReport;
