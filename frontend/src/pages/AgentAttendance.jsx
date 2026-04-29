import { useState, useEffect } from 'react';
import { attendanceAPI } from '../services/api';
import { Clock, CalendarDays, ChevronLeft, ChevronRight, Timer, CheckCircle2, AlertCircle, TrendingUp, LogIn, LogOut, Info, FileText } from 'lucide-react';
import lateEntryService from '../services/lateEntryService';
import { toast } from 'react-hot-toast';

export default function AgentAttendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Default to current month/year IST
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [showWaiverModal, setShowWaiverModal] = useState(false);
  const [selectedLateId, setSelectedLateId] = useState(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [activeTab, setActiveTab] = useState('logs'); // 'logs' | 'late-report'
  const [lateHistory, setLateHistory] = useState([]);

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const { data } = await attendanceAPI.getMyHistory({ month, year });
      setRecords(data.records || []);
      setSummary({
        ...data.summary,
        totalLates: (data.records || []).filter(r => r.isLate && !r.isWaived).length
      });

      // Also fetch detailed late history
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const lateRes = await lateEntryService.getMyHistory(monthStr);
      setLateHistory(lateRes.data || []);

    } catch (err) {
      console.error('Failed to fetch attendance history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchLeaveBalance();
  }, [month, year]);

  const fetchLeaveBalance = async () => {
    try {
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const { data } = await lateEntryService.getLeaveBalance(null, monthStr);
      setLeaveBalance(data);
    } catch (err) {
      console.error('Failed to fetch leave balance:', err);
    }
  };

  const handleWaiverRequest = async () => {
    if (!waiverReason) return toast.error('Please provide a reason');
    try {
      await lateEntryService.requestException({ 
        lateEntryId: selectedLateId, 
        reason: waiverReason 
      });
      toast.success('Waiver requested successfully');
      setShowWaiverModal(false);
      setWaiverReason('');
      fetchHistory();
    } catch (err) {
      toast.error('Failed to submit waiver request');
    }
  };

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
    },
    {
      label: 'Total Lates',
      value: summary?.totalLates || 0,
      icon: AlertCircle,
      color: 'rose',
      bg: 'bg-rose-50',
      text: 'text-rose-600',
      border: 'border-rose-100'
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto pb-24">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Clock size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">Attendance</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Punch-In & Late Reports</p>
          </div>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('logs')}
             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
           >Logs</button>
           <button 
             onClick={() => setActiveTab('late-report')}
             className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'late-report' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
           >Late Report</button>
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

      {activeTab === 'logs' ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {statCards.map((card) => (
              <div key={card.label} className={`${card.bg} rounded-2xl p-3 border ${card.border} flex flex-col justify-between`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <card.icon size={12} className={card.text} strokeWidth={2.5} />
                  <span className={`text-[8px] font-black uppercase tracking-widest ${card.text}`}>{card.label}</span>
                </div>
                <p className="text-lg font-black text-slate-900">{card.value}</p>
              </div>
            ))}
          </div>

          {/* Leave Balance Section */}
          {leaveBalance && (
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-4 mb-5 text-white shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <Info size={14} className="text-blue-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Monthly Leave Balance</h3>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Half Days</p>
                  <p className="text-xl font-black">{leaveBalance.halfDays || 0}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">LOP Days</p>
                  <p className="text-xl font-black text-red-400">{leaveBalance.lopDays || 0}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">Remaining</p>
                  <p className="text-xl font-black text-emerald-400">{(leaveBalance.annualLeave || 0) + (leaveBalance.casualLeave || 0) + (leaveBalance.sickLeave || 0)}</p>
                </div>
              </div>
            </div>
          )}

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
                      {record.isLate && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-[9px] font-bold">
                          LATE ({record.lateMinutes < 60 ? `${record.lateMinutes}m` : `${Math.floor(record.lateMinutes / 60)}h ${record.lateMinutes % 60}m`})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {record.isLate && !record.exceptionId && (
                        <button 
                          onClick={() => { setSelectedLateId(record.id); setShowWaiverModal(true); }}
                          className="text-[9px] font-bold text-blue-600 underline"
                        >
                          Request Waiver
                        </button>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                        record.status === 'COMPLETED' 
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-600 border border-amber-100'
                      }`}>
                        {record.status === 'COMPLETED' ? 'Completed' : 'Active'}
                      </span>
                    </div>
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
        </>
      ) : (
        <div className="space-y-4">
           {/* Late Report View */}
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl">
                 <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-1">Total Late Entries</p>
                 <p className="text-2xl font-black text-slate-900">{lateHistory.length}</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl">
                 <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Active Penalties</p>
                 <p className="text-2xl font-black text-slate-900">
                    {lateHistory.reduce((sum, h) => sum + (h.isWaived ? 0 : (h.penaltyValue > 0 ? 1 : 0)), 0)}
                 </p>
              </div>
           </div>

           <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Penalty History</h3>
                 <span className="text-[10px] font-bold text-slate-400">{monthNames[month-1]}</span>
              </div>
              <div className="divide-y divide-slate-50">
                 {lateHistory.length === 0 ? (
                   <div className="p-10 text-center">
                      <CheckCircle2 size={32} className="text-emerald-200 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400">Great! No late entries this month.</p>
                   </div>
                 ) : (
                   lateHistory.map(late => (
                     <div key={late.id} className="p-4 flex items-center justify-between">
                        <div>
                           <p className="text-xs font-black text-slate-900">{formatDate(late.date)}</p>
                           <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {late.lateMinutes < 60 ? `${late.lateMinutes} mins` : `${Math.floor(late.lateMinutes / 60)} hr ${late.lateMinutes % 60} mins`} late • Shift: {late.shiftStart}
                           </p>
                           {late.exception && (
                             <div className={`mt-2 flex items-center gap-1.5`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${late.exception.status === 'APPROVED' ? 'bg-emerald-500' : late.exception.status === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                <span className="text-[9px] font-black uppercase tracking-tight text-slate-500">
                                   Waiver: {late.exception.status}
                                </span>
                             </div>
                           )}
                        </div>
                        <div className="text-right">
                           <div className={`px-2 py-1 rounded text-[10px] font-black uppercase ${late.isWaived ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                              {late.isWaived ? 'Waived' : late.penaltyApplied}
                           </div>
                           {!late.isWaived && late.penaltyValue > 0 && (
                             <p className="text-[10px] font-bold text-rose-500 mt-1">-{late.penaltyValue} Day</p>
                           )}
                        </div>
                     </div>
                   ))
                 )}
              </div>
           </div>
        </div>
      )}

      {/* Waiver Modal */}
      {showWaiverModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-lg font-black text-slate-900 mb-2">Request Waiver</h3>
            <p className="text-sm text-slate-500 mb-4">Please provide a reason why this late mark should be ignored.</p>
            
            <select 
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 mb-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500"
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
            >
              <option value="">Select Reason</option>
              <option value="CLIENT_VISIT">Client Visit</option>
              <option value="WFH">Work From Home</option>
              <option value="BIOMETRIC_FAILURE">Device Failure</option>
              <option value="EMERGENCY">Personal Emergency</option>
              <option value="OTHER">Other</option>
            </select>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowWaiverModal(false)}
                className="flex-1 py-3 rounded-xl font-bold text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleWaiverRequest}
                className="flex-1 py-3 rounded-xl font-bold bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700 transition-all"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
