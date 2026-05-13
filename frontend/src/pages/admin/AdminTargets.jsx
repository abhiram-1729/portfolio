import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, Award, Zap, Trophy, Star, Crown, Users, Calendar, Settings, RefreshCw, Loader2, ChevronDown, ChevronRight, ChevronLeft, ArrowLeft, BarChart3, Package, Lock, Play, MapPin, X, Store } from 'lucide-react';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import StoreSelector from './StoreSelector';
import { useUserStore } from '../../store/userStore';

const LEVEL_CONFIG = {
  NONE:       { label: 'Unranked',   gradient: 'from-gray-400 to-gray-500',    bg: 'bg-gray-50',    text: 'text-gray-600',    border: 'border-gray-100' },
  STARTER:    { label: 'Starter',    gradient: 'from-blue-400 to-blue-600',    bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100' },
  PERFORMER:  { label: 'Performer',  gradient: 'from-indigo-400 to-indigo-600',bg: 'bg-indigo-50',  text: 'text-indigo-600',  border: 'border-indigo-100' },
  ACHIEVER:   { label: 'Achiever',   gradient: 'from-purple-400 to-purple-600',bg: 'bg-purple-50',  text: 'text-purple-600',  border: 'border-purple-100' },
  CHAMPION:   { label: 'Champion',   gradient: 'from-amber-400 to-amber-600',  bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100' },
  STAR:       { label: 'Star',       gradient: 'from-orange-400 to-orange-600',bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-100' },
  SUPER_STAR: { label: 'Super Star', gradient: 'from-rose-400 to-rose-600',    bg: 'bg-rose-50',    text: 'text-rose-600',    border: 'border-rose-100' },
};

const DYNAMIC_GRADIENTS = [
  'from-blue-400 to-blue-600',
  'from-indigo-400 to-indigo-600',
  'from-violet-400 to-violet-600',
  'from-purple-400 to-purple-600',
  'from-fuchsia-400 to-fuchsia-600',
  'from-pink-400 to-pink-600',
  'from-rose-400 to-rose-600',
  'from-orange-400 to-orange-600',
  'from-amber-400 to-amber-600',
  'from-yellow-400 to-yellow-600',
];

const getLevelInfo = (levelName) => {
  const key = levelName?.toUpperCase().replace(/\s+/g, '_') || 'NONE';
  if (LEVEL_CONFIG[key]) return LEVEL_CONFIG[key];
  
  const nameStr = levelName || 'None';
  const hash = nameStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradIndex = hash % DYNAMIC_GRADIENTS.length;
  
  // Create deterministic fallback classes based on the index to preserve aesthetic consistency
  const fallbackStyles = [
    { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100' },
    { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-100' },
    { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
    { bg: 'bg-fuchsia-50', text: 'text-fuchsia-600', border: 'border-fuchsia-100' },
    { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-100' },
    { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100' },
    { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100' }
  ];
  const styles = fallbackStyles[gradIndex];

  return {
     label: nameStr,
     gradient: DYNAMIC_GRADIENTS[gradIndex],
     bg: styles.bg,
     text: styles.text,
     border: styles.border
  };
};

export default function AdminTargets() {
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);
  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && !currentUser?.customRoleId) || currentUser?.portalType === 'ADMIN';

  const [stores, setStores] = useState([]);
  const [allBranchStats, setAllBranchStats] = useState({});

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
      // Clear previous data to prevent stale data flicker
      setPerformances([]);
      setMonthlySummaries([]);
      setAllBranchStats({});

      const res = await adminAPI.vgeAllPerformance({ 
        date: selectedDate,
        storeId: storeId
      });
      
      console.log(`[VGE-UI] loadDailyData | storeId: ${storeId} | count: ${res.data.length}`);

      // If we're in cross-branch view (no storeId), aggregate stats for the overview
      if (!storeId) {
        const stats = res.data.reduce((acc, p) => {
          const sid = p.storeId || 'unassigned';
          if (!acc[sid]) acc[sid] = { sales: 0, incentive: 0, agents: 0 };
          acc[sid].sales += p.totalSales;
          acc[sid].incentive += p.totalIncentive;
          acc[sid].agents += 1;
          return acc;
        }, {});
        setAllBranchStats(stats);
      }

      setPerformances(res.data);
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, storeId]);

  const loadMonthlyData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminAPI.vgeMonthlyReport({ 
        month: selectedMonth,
        storeId: storeId
      });
      setMonthlySummaries(res.data);
    } catch (err) {
      toast.error('Failed to load monthly data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, storeId]);

  const loadConfig = useCallback(async () => {
    try {
      const res = await adminAPI.vgeGetConfig({ storeId: storeId || currentUser?.storeId });
      const loadedConfig = res.data;
      if (!Array.isArray(loadedConfig.rules)) {
        if (typeof loadedConfig.rules === 'string') {
          loadedConfig.rules = JSON.parse(loadedConfig.rules || '[]');
        } else {
          loadedConfig.rules = [];
        }
      }
      setConfig(loadedConfig);
    } catch (err) {
      toast.error('Failed to load config');
    }
  }, []);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const res = await adminAPI.getStores();
        const fetchedStores = res.data.success ? res.data.data : (res.data || []);
        setStores(fetchedStores);

        // Auto-select if only one store exists
        if (fetchedStores.length === 1 && !storeId) {
          setSearchParams({ storeId: fetchedStores[0].id });
        }
      } catch (e) {}
    };
    if (isGlobalRole) fetchStores();
  }, [isGlobalRole, storeId]);

  useEffect(() => {
    if (activeTab === 'daily') loadDailyData();
    if (activeTab === 'monthly' || activeTab === 'payouts') loadMonthlyData();
    if (activeTab === 'config' && storeId) loadConfig();
  }, [activeTab, loadDailyData, loadMonthlyData, loadConfig, storeId]);

  const handleRecalculate = async () => {
    try {
      setIsSubmitting(true);
      await adminAPI.vgeRecalculate({ 
        date: selectedDate,
        storeId: storeId || currentUser?.storeId
      });
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
      const res = await adminAPI.vgeEndOfDay({ 
        date: selectedDate,
        storeId: storeId || currentUser?.storeId
      });
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
      const res = await adminAPI.vgeGenerateMonthly({ 
        month: selectedMonth,
        storeId: storeId || currentUser?.storeId
      });
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
      // Ensure rules are saved properly
      if (!Array.isArray(data.rules)) data.rules = [];
      await adminAPI.vgeUpdateConfig({ 
        ...data,
        storeId: storeId || currentUser?.storeId
      });
      toast.success('Configuration saved');
    } catch (err) {
      toast.error('Failed to save config');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddRule = () => {
    const newRule = {
      id: Date.now().toString(),
      name: '',
      salesFrom: 0,
      salesTo: 10000,
      appsTarget: 0,
      salesSlab: 5000,
      appsSlab: 5,
      salesType: 'PERCENTAGE',
      salesValue: 0,
      appsRate: 0,
    };
    setConfig(prev => ({
      ...prev,
      rules: Array.isArray(prev.rules) ? [...prev.rules, newRule] : [newRule]
    }));
  };

  const updateRule = (id, field, val) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.map(r => r.id === id ? { ...r, [field]: val } : r)
    }));
  };

  const deleteRule = (id) => {
    setConfig(prev => ({
      ...prev,
      rules: prev.rules.filter(r => r.id !== id)
    }));
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
              const lev = getLevelInfo(day.level);
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

  // ─── Branch Overview ─────────────────
  if (isGlobalRole && !storeId) {
    return (
      <div key="overview" className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 p-4 md:p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
            <Trophy size={30} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">VGE Performance</h2>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5 italic">Multi-branch targets & incentive monitoring</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 max-w-5xl">
          <div className="mb-2">
            <h3 className="text-xl font-black tracking-tight text-gray-900">Branch Performance Overview</h3>
            <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 italic">Real-time sales tracking and incentive distribution across all retail branches</p>
          </div>

          {stores.map(store => {
            const stats = allBranchStats[store.id] || { sales: 0, incentive: 0, agents: 0 };
            return (
              <button
                key={store.id}
                onClick={() => setSearchParams({ storeId: store.id })}
                className="group w-full bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-500 flex items-center justify-between gap-6 relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500/10 group-hover:bg-emerald-600 transition-all duration-500" />
                
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shrink-0">
                    <Store size={32} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col text-left">
                    <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-2">{store.name}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md tracking-widest uppercase">{store.code || 'Branch'}</span>
                      {store.address && <span className="text-xs font-bold text-gray-400 truncate max-w-[200px]">• {store.address}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-12">
                  <div className="hidden md:flex items-center gap-10">
                    <div className="flex flex-col items-end">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Total Sales</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${stats.sales > 0 ? 'text-gray-900' : 'text-gray-400'}`}>₹{stats.sales.toLocaleString()}</span>
                        <TrendingUp size={16} className={stats.sales > 0 ? 'text-emerald-500' : 'text-gray-200'} />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end border-l border-gray-100 pl-10">
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Active Agents</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${stats.agents > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{stats.agents}</span>
                        <Users size={16} className={stats.agents > 0 ? 'text-blue-400' : 'text-gray-200'} />
                      </div>
                    </div>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-inner shrink-0">
                    <ChevronRight size={24} strokeWidth={3} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div key={storeId || 'branch'} className="max-w-6xl mx-auto space-y-6 pb-12 px-4 md:px-6">
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-4">
          {storeId && stores.length > 1 && (
            <button 
              onClick={() => setSearchParams({})} 
              className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
              title="Back to All Branches"
            >
              <ChevronLeft size={18} />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-600/20">
              <Target size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-gray-900 tracking-tight">VGE Performance</h2>
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                  {performances.length} Agents
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <p className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                  <Store size={10} />
                  {currentUser?.storeId ? (performances[0]?.user?.store?.name || 'Assigned Branch') : (storeId ? 'Selected Branch' : 'Cross-Branch View')}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {stores.length > 1 && (
            <select
              value={storeId || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setSearchParams({ storeId: e.target.value });
                } else {
                  setSearchParams({});
                }
              }}
              className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-3 pr-7 py-2 rounded-xl border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.35rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.1rem'
              }}
            >
              <option value="">All Branches</option>
              {stores.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Tracking</p>
            <p className="text-xs font-bold text-gray-500">{new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
        {[
          { id: 'daily', label: 'Daily View', icon: Target },
          { id: 'monthly', label: 'Monthly', icon: Calendar },
          { id: 'payouts', label: 'Payouts', icon: Award },
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
            {can('TARGETS', 'UPDATE') && (
              <button onClick={handleRecalculate} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-100 transition-all disabled:opacity-50">
                <RefreshCw size={14} className={isSubmitting ? 'animate-spin' : ''} /> Recalculate
              </button>
            )}
            {can('TARGETS', 'UPDATE') && (
              <button onClick={handleEndOfDay} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 disabled:opacity-50">
                <Lock size={14} /> Lock Day
              </button>
            )}
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
                  const lev = getLevelInfo(p.level);
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
                          {p.user?.vgeType === 'FREELANCER' ? (
                            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">Freelancer</span>
                          ) : (
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">Employee</span>
                          )}
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
            {can('TARGETS', 'CREATE') && (
              <button onClick={handleGenerateMonthly} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50">
                <Play size={14} /> Generate Summary
              </button>
            )}
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
                  const lev = getLevelInfo(s.bestLevel);
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
                          {s.user?.vgeType === 'FREELANCER' ? (
                            <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 uppercase tracking-tighter">Freelancer</span>
                          ) : (
                            <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-tighter">Employee</span>
                          )}
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

      {/* ─── PAYOUTS TAB ───────────────────────── */}
      {activeTab === 'payouts' && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-300 outline-none"
            />
            {can('TARGETS', 'CREATE') && (
              <button onClick={handleGenerateMonthly} disabled={isSubmitting} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50">
                <RefreshCw size={14} className={isSubmitting ? 'animate-spin' : ''} /> Recalculate Summaries
              </button>
            )}
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Employee</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Working Days</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Base Salary</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Incentives</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Bonuses</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 text-right">Total Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlySummaries.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-20 text-center">
                        <Users size={40} className="mx-auto text-gray-200 mb-3" />
                        <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No payout data for this month</p>
                      </td>
                    </tr>
                  ) : (
                    monthlySummaries.map((s) => {
                      const meta = s.metadata || {};
                      const basePay = (s.user?.vgeType === 'FREELANCER') ? 0 : (s.user?.baseSalary ?? (meta.baseSalary || 12000));
                      const totalEarnings = meta.totalEarnings ?? (basePay + s.totalIncentive + (meta.bonus || 0));
                      
                      return (
                        <tr key={s.id} className="hover:bg-indigo-50/20 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">
                                {s.user?.name?.[0]}
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-black text-gray-900 leading-none">{s.user?.name}</span>
                                <span className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                                  {s.user?.vgeType} • {s.user?.assignedVehicle?.vehicleNumber || 'No VH'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-black text-gray-600 text-sm">
                            {s.workingDays}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-gray-600 text-sm">
                            ₹{basePay.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-indigo-600 text-sm">
                            ₹{s.totalIncentive.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-amber-600 text-sm">
                            ₹{(meta.bonus || 0).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                             <span className="px-4 py-2 rounded-2xl bg-emerald-50 text-emerald-700 font-black text-sm">
                               ₹{totalEarnings.toLocaleString()}
                             </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
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
              <Settings size={16} className="text-emerald-500" /> Earnings Configuration
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left min-w-[1200px]">
                <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Level</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Sales From</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Sales To</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Daily Apps</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Sales Slab</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Apps Slab</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-blue-500">Sales Type</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-blue-500">Sales Value</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-blue-500">Apps Rate(₹)</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-500 text-center">Incentive/Day</th>
                  <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-600 text-center">Monthly Inc</th>
                  {can('TARGETS', 'DELETE') && <th className="px-3 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Action</th>}
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {(!config.rules || config.rules.length === 0) ? (
                    <tr>
                      <td colSpan="10" className="p-8 text-center text-gray-400 font-bold text-sm">
                        No earning levels defined. Click "Add One More Row" to start matching the excel sheet.
                      </td>
                    </tr>
                  ) : (
                    config.rules.map(rule => {
                      const dailySalesInc = (rule.salesSlab * rule.salesPercent) / 100;
                      const dailyAppInc = rule.appsSlab * rule.appsRate;
                      const dailyTotal = dailySalesInc + dailyAppInc;
                      const monthlyTotal = dailyTotal * 30;

                      return (
                        <tr key={rule.id} className="hover:bg-gray-50/50">
                          <td className="p-2">
                            <input type="text" placeholder="Level Name" value={rule.name} onChange={e => updateRule(rule.id, 'name', e.target.value)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.salesFrom} onChange={e => updateRule(rule.id, 'salesFrom', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.salesTo} onChange={e => updateRule(rule.id, 'salesTo', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.appsTarget} onChange={e => updateRule(rule.id, 'appsTarget', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.salesSlab} onChange={e => updateRule(rule.id, 'salesSlab', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.appsSlab} onChange={e => updateRule(rule.id, 'appsSlab', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <select value={rule.salesType || 'PERCENTAGE'} onChange={e => updateRule(rule.id, 'salesType', e.target.value)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400">
                              <option value="PERCENTAGE">%</option>
                              <option value="FIXED">Flat ₹</option>
                            </select>
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.salesValue} onChange={e => updateRule(rule.id, 'salesValue', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2">
                            <input type="number" value={rule.appsRate} onChange={e => updateRule(rule.id, 'appsRate', parseFloat(e.target.value)||0)}
                              disabled={!can('TARGETS', 'UPDATE') && !can('TARGETS', 'CREATE')}
                              className="w-full bg-blue-50 text-blue-700 border border-blue-100 rounded-lg px-2 py-1.5 text-xs font-bold outline-none disabled:bg-gray-50 disabled:text-gray-400" />
                          </td>
                          <td className="p-2 text-center">
                            {(() => {
                              const sType = rule.salesType || 'PERCENTAGE';
                              const sVal = rule.salesValue || 0;
                              const sInc = sType === 'PERCENTAGE' ? (rule.salesSlab * sVal / 100) : sVal;
                              const aInc = rule.appsSlab * rule.appsRate;
                              const dailyTotal = sInc + aInc;
                              
                              return (
                                <>
                                  <span className="text-xs font-black text-emerald-700">₹{dailyTotal.toLocaleString()}</span>
                                  <div className="text-[8px] text-gray-400">({sInc} + {aInc})</div>
                                </>
                              );
                            })()}
                          </td>
                          <td className="p-2 text-center">
                             {(() => {
                               const sType = rule.salesType || 'PERCENTAGE';
                               const sVal = rule.salesValue || 0;
                               const sInc = sType === 'PERCENTAGE' ? (rule.salesSlab * sVal / 100) : sVal;
                               const aInc = rule.appsSlab * rule.appsRate;
                               const monthlyTotal = (sInc + aInc) * 30;
                               return <span className="text-xs font-black text-emerald-600">₹{monthlyTotal.toLocaleString()}</span>;
                             })()}
                          </td>
                          {can('TARGETS', 'DELETE') && (
                            <td className="p-2 text-center">
                              <button onClick={() => deleteRule(rule.id)} className="p-1.5 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors">
                                <X size={14} strokeWidth={3} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {can('TARGETS', 'CREATE') && (
              <button
                onClick={handleAddRule}
                disabled={isSubmitting}
                className="w-full py-2 bg-gray-50 border border-dashed border-gray-300 text-gray-500 font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-gray-100 hover:text-gray-700 transition-all flex items-center justify-center gap-2"
              >
                <Target size={14} /> Add One More Row
              </button>
            )}

            {(can('TARGETS', 'UPDATE') || can('TARGETS', 'CREATE')) && (
              <button
                onClick={handleSaveConfig}
                disabled={isSubmitting}
                className="w-full py-3 bg-emerald-600 text-white font-black text-sm uppercase tracking-wider rounded-2xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />}
                Save Configuration
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
