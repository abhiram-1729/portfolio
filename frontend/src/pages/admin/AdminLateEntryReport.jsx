import React, { useState, useEffect } from 'react';
import lateEntryService from '../../services/lateEntryService';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'react-hot-toast';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';

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
                      {record.lateMinutes} mins
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-medium ${record.isWaived ? 'line-through text-gray-400' : 'text-amber-700'}`}>
                      {record.penaltyApplied} ({record.penaltyValue})
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {record.isWaived ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-bold uppercase">Waived</span>
                    ) : record.exception?.status === 'PENDING' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold uppercase">Pending Appr.</span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-[10px] font-bold uppercase">Applied</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {record.exception?.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => handleReview(record.exception.id, 'APPROVED')}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Approve Exception"
                        >
                          ✅
                        </button>
                        <button 
                          onClick={() => handleReview(record.exception.id, 'REJECTED')}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Reject Exception"
                        >
                          ❌
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLateEntryReport;
