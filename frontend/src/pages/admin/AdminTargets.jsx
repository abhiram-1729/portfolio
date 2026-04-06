import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, Award, Zap, Trophy, Star, Crown, Users, Calendar, Settings, RefreshCw, Loader2, ChevronDown, ChevronRight, ArrowLeft, BarChart3, Package, Lock, Play, MapPin } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

const LEVEL_CONFIG = {
  NONE:       { label: 'Unranked',   gradient: 'from-gray-400 to-gray-500',    bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-100' },
  STARTER:    { label: 'Starter',    gradient: 'from-blue-400 to-blue-600',    bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100' },
  PERFORMER:  { label: 'Performer',  gradient: 'from-indigo-400 to-indigo-600',bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100' },
  ACHIEVER:   { label: 'Achiever',   gradient: 'from-purple-400 to-purple-600',bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100' },
  CHAMPION:   { label: 'Champion',   gradient: 'from-amber-400 to-amber-600',  bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100' },
  STAR:       { label: 'Star',       gradient: 'from-orange-400 to-orange-600',bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100' },
  SUPER_STAR: { label: 'Super Star', gradient: 'from-rose-400 to-rose-600',    bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100' },
};

export default function AdminTargets() {
  const [performances, setPerformances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('daily'); // daily | monthly | config
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthlySummaries, setMonthlySummaries] = useState([]);
  const [config, setConfig] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingAgent, setViewingAgent] = useState(null);
  const [agentHistory, setAgentHistory] = useState([]);

  const loadDailyData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.vgeAllPerformance({ date: selectedDate });
      setPerformances(res.data);
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const loadMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.vgeMonthlyReport({ month: selectedMonth });
      setMonthlySummaries(res.data);
    } catch (err) {
      toast.error('Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await adminAPI.vgeGetConfig();
      setConfig(res.data);
    } catch (err) {
      toast.error('Failed to load config');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'daily') loadDailyData();
    if (activeTab === 'monthly') loadMonthlyData();
    if (activeTab === 'config') loadConfig();
  }, [activeTab, loadDailyData, loadMonthlyData, loadConfig]);

  const handleRecalculate = async () => {
    try {
      setIsSubmitting(true);
      await adminAPI.vgeRecalculate({ date: selectedDate });
      toast.success('Recalculation triggered');
      loadDailyData();
    } catch (err) {
      toast.error('Recalculation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndOfDay = async () => {
    try {
      setIsSubmitting(true);
      const res = await adminAPI.vgeEndOfDay({ date: selectedDate });
      toast.success(res.data.message);
      loadDailyData();
    } catch (err) {
      toast.error('End-of-day failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateMonthly = async () => {
    try {
      setIsSubmitting(true);
      const res = await adminAPI.vgeGenerateMonthly({ month: selectedMonth });
      toast.success(res.data.message);
      loadMonthlyData();
    } catch (err) {
      toast.error('Monthly generation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      setIsSubmitting(true);
      const { id, updatedAt, ...data } = config;
      await adminAPI.vgeUpdateConfig(data);
      toast.success('Configuration saved');
    } catch (err) {
      toast.error('Failed to save config');
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewAgentDetail = async (userId) => {
    try {
      const res = await adminAPI.vgeAgentPerformance(userId, { days: 30 });
      setViewingAgent(res.data.user);
      setAgentHistory(res.data.records);
    } catch (err) {
      toast.error('Failed to load agent details');
    }
  };

  // Summary stats
  const totalSales = performances.reduce((s, p) => s + p.totalSales, 0);
  const totalIncentives = performances.reduce((s, p) => s + p.totalIncentive, 0);
  const avgSales = performances.length > 0 ? totalSales / performances.length : 0;
  const incentiveRatio = totalSales > 0 ? (totalIncentives / totalSales) * 100 : 0;

  if (loading && performances.length === 0 && monthlySummaries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading Targets & Incentives...</p>
      </div>
    );
  }

  // ─── Agent Detail View ─────────────────
  if (viewingAgent) {
    return (
      <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-4 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <button onClick={() => setViewingAgent(null)} className="p-3 rounded-2xl bg-gray-50 text-gray-500 hover:bg-emerald-50 hover:text-emerald-600 transition-all">
            <ArrowLeft size={20} strokeWidth={3} />
          </button>
          <div className="w-14 h-14 bg-emerald-600 rounded-3xl flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-emerald-600/20">
            {viewingAgent.name?.[0] || '?'}
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">{viewingAgent.name}</h3>
            <p className="text-xs font-bold text-gray-400">{viewingAgent.assignedVehicle?.vehicleNumber || 'No vehicle'}</p>
          </div>
        </div>

        <div className="space-y-3">
          {agentHistory.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-100">
              <BarChart3 size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-black text-gray-400">No performance data yet</p>
            </div>
          ) : (
            agentHistory.map(day => {
              const lev = LEVEL_CONFIG[day.level || 'NONE'];
              return (
                <div key={day.id} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1.5 rounded-xl bg-gradient-to-r ${lev.gradient} text-white`}>
                        <span className="text-[10px] font-black uppercase tracking-wider">{lev.label}</span>
                      </div>
                      <span className="text-xs font-black text-gray-600">
                        {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      {day.isLocked && <Lock size={12} className="text-amber-400" />}
                    </div>
                    <span className="text-lg font-black text-gray-900">₹{day.totalSales.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Orders</p>
                      <p className="text-sm font-black text-gray-800">{day.completedOrders}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-gray-400 uppercase">Customers</p>
                      <p className="text-sm font-black text-gray-800">{day.totalRegistrations}</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-emerald-500 uppercase">Sales ₹</p>
                      <p className="text-sm font-black text-emerald-700">{day.salesIncentive}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-2 text-center">
                      <p className="text-[8px] font-black text-blue-500 uppercase">Reg ₹</p>
                      <p className="text-sm font-black text-blue-700">{day.regIncentive}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 px-4 md:px-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Targets & Incentives</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">VGE Performance Module</p>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
        {[
          { id: 'daily', label: 'Daily View', icon: Target },
          { id: 'monthly', label: 'Monthly', icon: Calendar },
          { id: 'routes', label: 'Routes', icon: MapPin },
          { id: 'config', label: 'Config', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── DAILY TAB ───────────────────────── */}
      {activeTab === 'daily' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none"
            />
            <button onClick={handleRecalculate} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all disabled:opacity-50">
              <RefreshCw size={14} className={isSubmitting ? 'animate-spin' : ''} /> Recalculate
            </button>
            <button onClick={handleEndOfDay} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
              <Lock size={14} /> Lock Day
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Sales</p>
              <p className="text-xl font-black text-gray-900">₹{totalSales.toLocaleString('en-IN')}</p>
              <p className="text-[10px] font-bold text-gray-400 mt-1">{performances.length} agents active</p>
            </div>
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Incentives</p>
              <p className="text-xl font-black text-emerald-600">₹{totalIncentives.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Avg Sales</p>
              <p className="text-xl font-black text-gray-900">₹{Math.round(avgSales).toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Incentive Ratio</p>
              <p className="text-xl font-black text-indigo-600">{incentiveRatio.toFixed(1)}%</p>
            </div>
          </div>

          {/* Agent Performance Table */}
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Agent Performance — {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            </div>

            {performances.length === 0 ? (
              <div className="text-center py-12">
                <Users size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-sm font-black text-gray-400">No performance data for this date</p>
                <p className="text-xs text-gray-300 mt-1">Try recalculating or pick a different date</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {performances.map((p, idx) => {
                  const lev = LEVEL_CONFIG[p.level || 'NONE'];
                  return (
                    <div
                      key={p.id}
                      onClick={() => viewAgentDetail(p.userId)}
                      className="flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50/50 transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white bg-gradient-to-br ${lev.gradient} text-lg shrink-0`}>
                        {idx < 3 ? ['🥇', '🥈', '🥉'][idx] : idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-900 truncate">{p.user?.name || 'Unknown'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${lev.bg} ${lev.text} ${lev.border} border`}>
                            {lev.label}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400">{p.user?.assignedVehicle?.vehicleNumber}</span>
                          {p.isLocked && <Lock size={10} className="text-amber-400" />}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-gray-900">₹{p.totalSales.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] font-bold text-gray-400">{p.completedOrders} orders</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-emerald-600">₹{p.totalIncentive}</p>
                        <p className="text-[10px] font-bold text-gray-400">{p.totalRegistrations} reg</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MONTHLY TAB ──────────────────────── */}
      {activeTab === 'monthly' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none"
            />
            <button onClick={handleGenerateMonthly} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
              <Play size={14} /> Generate Summary
            </button>
          </div>

          {monthlySummaries.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-100">
              <Calendar size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-black text-gray-400">No monthly summaries yet</p>
              <p className="text-xs text-gray-300 mt-1">Click "Generate Summary" to create</p>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-50">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">Monthly Summary — {selectedMonth}</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {monthlySummaries.map((s, idx) => {
                  const lev = LEVEL_CONFIG[s.bestLevel || 'NONE'];
                  const meta = s.metadata || {};
                  return (
                    <div key={s.id} className="p-5 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-white bg-gradient-to-br ${lev.gradient} text-lg shrink-0`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-gray-900 truncate">{s.user?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${lev.bg} ${lev.text}`}>
                              Best: {lev.label}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400">{s.workingDays} days</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-gray-900">₹{s.totalSales.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] font-bold text-gray-400">{s.totalOrders} orders</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-emerald-600">₹{s.totalIncentive.toLocaleString('en-IN')}</p>
                          {meta.bonus > 0 && <p className="text-[9px] font-black text-amber-500">+₹{meta.bonus} Bonus</p>}
                        </div>
                      </div>

                      {/* CTC Breakdown */}
                      <div className="grid grid-cols-4 gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                        <div className="text-center border-r border-gray-200">
                          <p className="text-[8px] font-black text-gray-400 uppercase">Base Pay</p>
                          <p className="text-xs font-black text-gray-700">₹{(meta.baseSalary || 12000).toLocaleString()}</p>
                        </div>
                        <div className="text-center border-r border-gray-200">
                          <p className="text-[8px] font-black text-gray-400 uppercase">Incentives</p>
                          <p className="text-xs font-black text-gray-700">₹{s.totalIncentive.toLocaleString()}</p>
                        </div>
                        <div className="text-center border-r border-gray-200">
                          <p className="text-[8px] font-black text-gray-400 uppercase">Bonuses</p>
                          <p className="text-xs font-black text-gray-700">₹{(meta.bonus || 0).toLocaleString()}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[8px] font-black text-emerald-500 uppercase">Total CTC</p>
                          <p className="text-xs font-black text-emerald-700">₹{(meta.totalEarnings || (12000 + s.totalIncentive)).toLocaleString()}</p>
                        </div>
                      </div>

                      {/* Awards */}
                      {meta.awards?.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {meta.awards.map((award, i) => (
                            <span key={i} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-100 text-[9px] font-black text-amber-700">
                              <Award size={10} /> {award}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── ROUTES TAB ────────────────────────── */}
      {activeTab === 'routes' && performances.length > 0 && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-6 flex items-center gap-2">
              <MapPin size={16} className="text-emerald-500" /> Route Contribution Summary
            </h3>
            
            {/* Simple Aggregation of performances by routeId */}
            {(() => {
              const routeGroups = performances.reduce((acc, p) => {
                const rid = p.routeId || 'unassigned';
                const rname = p.user?.assignedVehicle?.assignedRoute?.name || p.user?.assignedVehicle?.vehicleNumber || 'Unassigned';
                if (!acc[rid]) acc[rid] = { name: rname, sales: 0, orders: 0, agents: 0 };
                acc[rid].sales += p.totalSales;
                acc[rid].orders += p.completedOrders;
                acc[rid].agents += 1;
                return acc;
              }, {});

              return (
                <div className="space-y-4">
                  {Object.values(routeGroups).sort((a,b) => b.sales - a.sales).map((route, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-gray-900">{route.name}</p>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{route.agents} Active Agents</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-gray-900">₹{route.sales.toLocaleString()}</p>
                        <p className="text-[10px] font-bold text-gray-400">{route.orders} total orders</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {activeTab === 'config' && config && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <Settings size={16} className="text-emerald-500" /> Incentive Configuration
            </h3>

            {/* Thresholds */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Minimum Thresholds</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Min Sales (₹)</label>
                  <input type="number" value={config.minSalesThreshold} onChange={e => setConfig({...config, minSalesThreshold: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Min Registrations</label>
                  <input type="number" value={config.minRegThreshold} onChange={e => setConfig({...config, minRegThreshold: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
              </div>
            </div>

            {/* Sales Slabs */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sales Slab Configuration</p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Slab Size (₹)</label>
                  <input type="number" value={config.salesSlabSize} onChange={e => setConfig({...config, salesSlabSize: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">First N Slabs</label>
                  <input type="number" value={config.firstSlabCount} onChange={e => setConfig({...config, firstSlabCount: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">First Slab ₹</label>
                  <input type="number" value={config.firstSlabIncentive} onChange={e => setConfig({...config, firstSlabIncentive: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Remaining Slab ₹</label>
                  <input type="number" value={config.remainingSlabIncentive} onChange={e => setConfig({...config, remainingSlabIncentive: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
              </div>
            </div>

            {/* Registration Incentive */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Registration Incentive</p>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">First N Regs</label>
                  <input type="number" value={config.firstRegCount} onChange={e => setConfig({...config, firstRegCount: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">First ₹/Reg</label>
                  <input type="number" value={config.firstRegIncentive} onChange={e => setConfig({...config, firstRegIncentive: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-500">Remaining ₹/Reg</label>
                  <input type="number" value={config.remainingRegIncentive} onChange={e => setConfig({...config, remainingRegIncentive: parseFloat(e.target.value)})}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                </div>
              </div>
            </div>

            {/* Level Thresholds */}
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Level Thresholds (₹ Sales)</p>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { key: 'starterThreshold', label: 'Starter' },
                  { key: 'performerThreshold', label: 'Performer' },
                  { key: 'achieverThreshold', label: 'Achiever' },
                  { key: 'championThreshold', label: 'Champion' },
                  { key: 'starThreshold', label: 'Star' },
                  { key: 'superStarThreshold', label: 'Super Star' },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500">{label}</label>
                    <input type="number" value={config[key]} onChange={e => setConfig({...config, [key]: parseFloat(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleSaveConfig}
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
              Save Configuration
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
