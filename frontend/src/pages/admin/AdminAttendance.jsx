import { useState, useEffect } from 'react';
import { attendanceAPI } from '../../services/api';
import { Clock, Users, UserCheck, UserX, Timer, TrendingUp, CalendarDays, Search, LogIn, LogOut, Truck, ChevronLeft, ChevronRight, AlertCircle, Activity, Camera, X, MapPin, Settings, FileText } from 'lucide-react';
import AdminLateEntryReport from './AdminLateEntryReport';
import AdminLateEntryConfig from './AdminLateEntryConfig';

export default function AdminAttendance() {
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [photoModal, setPhotoModal] = useState(null); // { url, agentName, type, time, lat, lng }
  const [activeTab, setActiveTab] = useState('live'); // 'live' | 'late-reports'

  // Default date = today IST
  const now = new Date();
  const istOffset = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  const todayStr = istOffset.toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Date range mode
  const [viewMode, setViewMode] = useState('daily');
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const params = viewMode === 'daily' 
        ? { date: selectedDate }
        : { startDate, endDate };
      const { data } = await attendanceAPI.getAll(params);
      setRecords(data.records || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, viewMode, startDate, endDate]);

  const changeDate = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().split('T')[0];
    if (newDate <= todayStr) {
      setSelectedDate(newDate);
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

  const formatDisplayDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredRecords = records.filter(r => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.user?.name?.toLowerCase().includes(term) ||
      r.user?.mobile?.includes(term) ||
      r.user?.assignedVehicle?.vehicleNumber?.toLowerCase().includes(term)
    );
  });

  const openPhoto = (record, type) => {
    const url = type === 'in' ? record.punchInPhoto : record.punchOutPhoto;
    if (!url) return;
    setPhotoModal({
      url,
      agentName: record.user?.name || 'Agent',
      type: type === 'in' ? 'Punch-In' : 'Punch-Out',
      time: type === 'in' ? formatTime(record.punchInTime) : formatTime(record.punchOutTime),
      lat: type === 'in' ? record.punchInLat : record.punchOutLat,
      lng: type === 'in' ? record.punchInLng : record.punchOutLng,
      locationName: type === 'in' ? record.punchInLocation : record.punchOutLocation,
      date: record.date,
    });
  };

  const statCards = [
    { label: 'Total Agents', value: summary?.totalAgents || 0, icon: Users, bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100', iconBg: 'bg-slate-100' },
    { label: 'Present', value: summary?.presentToday || 0, icon: UserCheck, bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
    { label: 'Absent', value: summary?.absentToday || 0, icon: UserX, bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', iconBg: 'bg-red-100' },
    { label: 'Active Now', value: summary?.activeNow || 0, icon: Activity, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', iconBg: 'bg-blue-100' },
    { label: 'Completed', value: summary?.completedToday || 0, icon: Timer, bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', iconBg: 'bg-purple-100' },
    { label: 'Avg Hours', value: summary?.avgHours?.toFixed(1) || '0', icon: TrendingUp, bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', iconBg: 'bg-amber-100' }
  ];

  return (
    <div className="space-y-6">
      {/* Photo Modal */}
      {photoModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={() => setPhotoModal(null)}>
          <div className="bg-white rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl animate-in zoom-in-95 fade-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="relative">
              <img src={photoModal.url} alt="Attendance Photo" className="w-full aspect-[4/3] object-cover" />
              <button
                onClick={() => setPhotoModal(null)}
                className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center text-slate-600 hover:bg-white transition-all shadow-lg"
              >
                <X size={18} strokeWidth={3} />
              </button>
              {/* Overlay info */}
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-12">
                <div className="flex items-center gap-2 mb-1">
                  <Camera size={14} className="text-white/80" />
                  <span className="text-white text-sm font-black tracking-tight">{photoModal.agentName}</span>
                </div>
                <div className="flex items-center gap-3 text-white/70 text-[10px] font-bold uppercase tracking-widest">
                  <span>{photoModal.type}</span>
                  <span>•</span>
                  <span>{photoModal.time}</span>
                  <span>•</span>
                  <span>{photoModal.date}</span>
                </div>
              </div>
            </div>
            {/* Location info */}
            {(photoModal.lat && photoModal.lng) && (
              <div className="p-4 border-t border-gray-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <MapPin size={14} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</p>
                  {photoModal.locationName ? (
                     <p className="text-xs font-bold text-gray-700 leading-tight">{photoModal.locationName}</p>
                  ) : (
                     <p className="text-xs font-bold text-gray-700">{photoModal.lat?.toFixed(6)}, {photoModal.lng?.toFixed(6)}</p>
                  )}
                </div>
                <a
                  href={`https://www.google.com/maps?q=${photoModal.lat},${photoModal.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto px-3 py-1.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View Map
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-200">
            <Clock size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Attendance</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Agent Punch-In Tracker with Photo Proof</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm">
          <button
            onClick={() => setActiveTab('live')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'live' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >Live Tracker</button>
          <button
            onClick={() => setActiveTab('late-reports')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'late-reports' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >Late Reports</button>
        </div>
      </div>

      {activeTab === 'late-reports' && <AdminLateEntryReport />}

      {activeTab === 'live' && (
        <>
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 border border-gray-200 shadow-sm w-fit">
            <button
              onClick={() => setViewMode('daily')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'daily' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >Daily</button>
            <button
              onClick={() => setViewMode('range')}
              className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                viewMode === 'range' ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >Date Range</button>
          </div>
        </>
      )}

      {activeTab === 'live' && (
        <>
          {/* Date Controls */}
          {viewMode === 'daily' ? (
            <div className="flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <button onClick={() => changeDate(-1)} className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95">
                <ChevronLeft size={18} strokeWidth={3} />
              </button>
              <div className="flex items-center gap-3">
                <CalendarDays size={18} className="text-emerald-600" />
                <div className="text-center">
                  <input type="date" value={selectedDate} max={todayStr} onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-lg font-black text-gray-900 tracking-tight bg-transparent border-none focus:outline-none cursor-pointer" />
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{formatDisplayDate(selectedDate)}</p>
                </div>
              </div>
              <button onClick={() => changeDate(1)} disabled={selectedDate >= todayStr}
                className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={18} strokeWidth={3} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-3 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 flex-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">From</label>
                <input type="date" value={startDate} max={todayStr} onChange={(e) => setStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
              <div className="flex items-center gap-2 flex-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">To</label>
                <input type="date" value={endDate} max={todayStr} onChange={(e) => setEndDate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" />
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {statCards.map((card) => (
              <div key={card.label} className={`${card.bg} rounded-2xl p-4 border ${card.border} transition-all hover:shadow-md`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-7 h-7 ${card.iconBg} rounded-lg flex items-center justify-center`}>
                    <card.icon size={14} className={card.text} strokeWidth={2.5} />
                  </div>
                </div>
                <p className="text-2xl font-black text-gray-900 mb-0.5">{card.value}</p>
                <p className={`text-[9px] font-black uppercase tracking-widest ${card.text}`}>{card.label}</p>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" strokeWidth={2.5} />
            <input type="text" placeholder="Search by agent name, mobile or vehicle..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 bg-white text-sm font-bold text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-sm" />
          </div>

          {/* Records */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <AlertCircle size={48} className="text-gray-200 mb-3" />
                <p className="text-sm font-bold text-gray-400">No attendance records found</p>
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest mt-1">
                  {searchTerm ? 'Try a different search' : 'No one has punched in on this date'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle</th>
                        {viewMode === 'range' && <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>}
                        <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Punch In</th>
                        <th className="px-4 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Photo</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Punch Out</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Hours</th>
                        <th className="px-4 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((record) => (
                        <tr key={record.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100/50">
                                {record.user?.name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p className="text-sm font-black text-gray-900 tracking-tight">{record.user?.name || 'Unknown'}</p>
                                <p className="text-[10px] font-bold text-gray-400">{record.user?.mobile}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Truck size={13} className="text-gray-400" />
                              <span className="text-xs font-bold text-gray-600">{record.user?.assignedVehicle?.vehicleNumber || '—'}</span>
                            </div>
                          </td>
                          {viewMode === 'range' && (
                            <td className="px-4 py-4 text-xs font-bold text-gray-600">{record.date}</td>
                          )}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <LogIn size={13} className="text-emerald-500" />
                              <span className="text-sm font-black text-gray-900">{formatTime(record.punchInTime)}</span>
                              {record.isLate && (
                                <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase tracking-tighter">
                                  Late {record.lateMinutes < 60 ? `${record.lateMinutes}m` : `${Math.floor(record.lateMinutes / 60)}h ${record.lateMinutes % 60}m`}
                                </span>
                              )}
                            </div>
                            {record.punchInLocation ? (
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5 leading-tight w-48" title={record.punchInLocation}>📍 {record.punchInLocation}</p>
                            ) : record.punchInLat ? (
                              <p className="text-[9px] font-bold text-gray-300 mt-0.5">📍 {record.punchInLat?.toFixed(4)}, {record.punchInLng?.toFixed(4)}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {record.punchInPhoto ? (
                                <button
                                  onClick={() => openPhoto(record, 'in')}
                                  className="group relative w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-200 hover:border-emerald-500 transition-all shadow-sm hover:shadow-md"
                                >
                                  <img src={record.punchInPhoto} alt="In" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/20 transition-all flex items-center justify-center">
                                    <Camera size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center">
                                  <Camera size={12} className="text-gray-300" />
                                </div>
                              )}
                              {record.punchOutPhoto ? (
                                <button
                                  onClick={() => openPhoto(record, 'out')}
                                  className="group relative w-10 h-10 rounded-xl overflow-hidden border-2 border-orange-200 hover:border-orange-500 transition-all shadow-sm hover:shadow-md"
                                >
                                  <img src={record.punchOutPhoto} alt="Out" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-orange-600/0 group-hover:bg-orange-600/20 transition-all flex items-center justify-center">
                                    <Camera size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <LogOut size={13} className="text-orange-500" />
                              <span className="text-sm font-black text-gray-900">{formatTime(record.punchOutTime)}</span>
                            </div>
                            {record.punchOutLocation ? (
                              <p className="text-[9px] font-bold text-gray-400 mt-0.5 leading-tight w-48" title={record.punchOutLocation}>📍 {record.punchOutLocation}</p>
                            ) : record.punchOutLat ? (
                              <p className="text-[9px] font-bold text-gray-300 mt-0.5">📍 {record.punchOutLat?.toFixed(4)}, {record.punchOutLng?.toFixed(4)}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-black text-gray-900">{record.totalHours ? `${record.totalHours}h` : '—'}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                record.status === 'COMPLETED'
                                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                  : 'bg-amber-50 text-amber-600 border border-amber-100'
                              }`}>{record.status === 'COMPLETED' ? 'Done' : 'Active'}</span>
                              {record.isLate && (
                                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[8px] font-black uppercase">Late Entry</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y divide-gray-50">
                  {filteredRecords.map((record) => (
                    <div key={record.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          {record.punchInPhoto ? (
                            <button onClick={() => openPhoto(record, 'in')} className="w-10 h-10 rounded-xl overflow-hidden border-2 border-emerald-200 shadow-sm">
                              <img src={record.punchInPhoto} alt="In" className="w-full h-full object-cover" />
                            </button>
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 font-black text-xs border border-emerald-100/50">
                              {record.user?.name?.charAt(0) || '?'}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-black text-gray-900 tracking-tight">{record.user?.name}</p>
                            <p className="text-[10px] font-bold text-gray-400">{record.user?.assignedVehicle?.vehicleNumber || 'No Vehicle'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            record.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                              : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>{record.status === 'COMPLETED' ? 'Done' : 'Active'}</span>
                          {record.isLate && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-[8px] font-black uppercase">Late</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 flex-1">
                          <LogIn size={13} className="text-emerald-500" />
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">In</p>
                            <p className="text-xs font-black text-gray-900">{formatTime(record.punchInTime)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-1">
                          <LogOut size={13} className="text-orange-500" />
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Out</p>
                            <p className="text-xs font-black text-gray-900">{formatTime(record.punchOutTime)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Timer size={13} className="text-purple-500" />
                          <div>
                            <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Hrs</p>
                            <p className="text-xs font-black text-gray-900">{record.totalHours ? `${record.totalHours}h` : '—'}</p>
                          </div>
                        </div>
                      </div>
                      {record.punchInLocation ? (
                        <p className="text-[9px] font-bold text-gray-400 mt-2 leading-tight">📍 In: {record.punchInLocation}</p>
                      ) : record.punchInLat ? (
                        <p className="text-[9px] font-bold text-gray-300 mt-2">📍 In: {record.punchInLat?.toFixed(4)}, {record.punchInLng?.toFixed(4)}</p>
                      ) : null}
                      {record.punchOutLocation ? (
                        <p className="text-[9px] font-bold text-gray-400 mt-1 leading-tight">📍 Out: {record.punchOutLocation}</p>
                      ) : record.punchOutLat ? (
                        <p className="text-[9px] font-bold text-gray-300 mt-1">📍 Out: {record.punchOutLat?.toFixed(4)}, {record.punchOutLng?.toFixed(4)}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
