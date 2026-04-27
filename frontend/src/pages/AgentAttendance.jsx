import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { Clock, CalendarDays, ChevronLeft, ChevronRight, Timer, CheckCircle2, AlertCircle, TrendingUp, LogIn, LogOut } from 'lucide-react';

export default function AgentAttendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default to current month/year IST
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await attendanceAPI.getMyHistory({ month, year });
      setRecords(data.records || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [month, year]);

  const prevMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(y => y - 1);
    } else {
      setMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    const current = new Date();
    const currentMonth = current.getMonth() + 1;
    const currentYear = current.getFullYear();
    if (year === currentYear && month >= currentMonth) return;
    if (month === 12) {
      setMonth(1);
      setYear(y => y + 1);
    } else {
      setMonth(m => m + 1);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatDate = (dateStr) => {
    const parts = dateStr.split('-');
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const statCards = [
    {
      label: 'Days Present',
      value: summary?.totalDays || 0,
      icon: CalendarDays,
      color: 'emerald',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      border: 'border-emerald-100'
    },
    {
      label: 'Completed',
      value: summary?.completedDays || 0,
      icon: CheckCircle2,
      color: 'blue',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100'
    },
    {
      label: 'Total Hours',
      value: summary?.totalHoursWorked?.toFixed(1) || '0',
      icon: Timer,
      color: 'purple',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
      border: 'border-purple-100'
    },
    {
      label: 'Avg Hours',
      value: summary?.avgHours?.toFixed(1) || '0',
      icon: TrendingUp,
      color: 'amber',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100'
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">My Attendance</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Punch-In History</p>
          </div>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mb-5">
        <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95">
          <ChevronLeft size={18} strokeWidth={3} />
        </button>
        <div className="text-center">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {monthNames[month - 1]} {year}
          </h2>
        </div>
        <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95">
          <ChevronRight size={18} strokeWidth={3} />
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {statCards.map((card) => (
          <div key={card.label} className={`${card.bg} rounded-2xl p-4 border ${card.border}`}>
            <div className="flex items-center gap-2 mb-2">
              <card.icon size={14} className={card.text} strokeWidth={2.5} />
              <span className={`text-[9px] font-black uppercase tracking-widest ${card.text}`}>{card.label}</span>
            </div>
            <p className="text-2xl font-black text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Records List */}
      <div className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-10 text-center">
            <AlertCircle size={40} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-400">No attendance records for this month</p>
          </div>
        ) : (
          records.map((record) => (
            <div key={record.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-slate-400" />
                  <span className="text-sm font-black text-slate-900 tracking-tight">{formatDate(record.date)}</span>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                  record.status === 'COMPLETED' 
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                    : 'bg-amber-50 text-amber-600 border border-amber-100'
                }`}>
                  {record.status === 'COMPLETED' ? 'Completed' : 'Active'}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <LogIn size={13} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">In</p>
                    <p className="text-sm font-black text-slate-900">{formatTime(record.punchInTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center">
                    <LogOut size={13} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Out</p>
                    <p className="text-sm font-black text-slate-900">{formatTime(record.punchOutTime)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                    <Timer size={13} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Hrs</p>
                    <p className="text-sm font-black text-slate-900">{record.totalHours ? `${record.totalHours}h` : '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
