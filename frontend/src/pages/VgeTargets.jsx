import React, { useState, useEffect, useCallback } from 'react';
import { Target, TrendingUp, Award, Zap, ChevronRight, Trophy, Star, Crown, Flame, Gift, Users, ArrowUp, ArrowDown, Minus, Loader2, Calendar, ChevronDown } from 'lucide-react';
import { vgeAPI } from '../services/api';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const LEVEL_CONFIG = {
  NONE:       { label: 'Unranked',   color: 'gray',    icon: Target,     gradient: 'from-gray-400 to-gray-500' },
  STARTER:    { label: 'Starter',    color: 'blue',    icon: Zap,        gradient: 'from-blue-400 to-blue-600' },
  PERFORMER:  { label: 'Performer',  color: 'indigo',  icon: TrendingUp, gradient: 'from-indigo-400 to-indigo-600' },
  ACHIEVER:   { label: 'Achiever',   color: 'purple',  icon: Award,      gradient: 'from-purple-400 to-purple-600' },
  CHAMPION:   { label: 'Champion',   color: 'amber',   icon: Trophy,     gradient: 'from-amber-400 to-amber-600' },
  STAR:       { label: 'Star',       color: 'orange',  icon: Star,       gradient: 'from-orange-400 to-orange-600' },
  SUPER_STAR: { label: 'Super Star', color: 'rose',    icon: Crown,      gradient: 'from-rose-400 to-rose-600' },
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

const ICONS = [Target, Zap, TrendingUp, Award, Trophy, Star, Crown, Flame, Gift];

const LEVEL_ORDER = ['NONE', 'STARTER', 'PERFORMER', 'ACHIEVER', 'CHAMPION', 'STAR', 'SUPER_STAR'];

export default function VgeTargets() {
  const [perf, setPerf] = useState(null);
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('today'); // today | history | leaderboard
  const [showLevelAlert, setShowLevelAlert] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [perfRes, histRes, lbRes] = await Promise.all([
        vgeAPI.getMyPerformance(),
        vgeAPI.getMyHistory({ days: 7 }),
        vgeAPI.getLeaderboard(),
      ]);
      setPerf(perfRes.data);
      setHistory(histRes.data);
      setLeaderboard(lbRes.data);
    } catch (err) {
      console.error('[VGE] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Socket.IO real-time updates
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';
    const baseUrl = API_URL.replace(/\/api\/?$/, '');

    const socket = io(baseUrl, { auth: { token } });

    socket.on('performance_update', (data) => {
      setPerf(prev => {
        // Check if level changed for alert
        if (prev && data.level !== prev.level && LEVEL_ORDER.indexOf(data.level) > LEVEL_ORDER.indexOf(prev.level)) {
          setShowLevelAlert(data.level);
          setTimeout(() => setShowLevelAlert(null), 5000);
        }
        return { ...prev, ...data };
      });
    });

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading Targets...</p>
      </div>
    );
  }

  const getLevelInfo = (levelName) => {
    const key = levelName?.toUpperCase().replace(/\s+/g, '_') || 'NONE';
    if (LEVEL_CONFIG[key]) return LEVEL_CONFIG[key];
    
    // Fallback for custom dynamically named levels
    const nameStr = levelName || 'None';
    const hash = nameStr.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const gradIndex = hash % DYNAMIC_GRADIENTS.length;
    const iconIndex = hash % ICONS.length;
    
    return {
       label: nameStr,
       color: 'custom',
       gradient: DYNAMIC_GRADIENTS[gradIndex],
       icon: ICONS[iconIndex]
    };
  };

  const levelInfo = getLevelInfo(perf?.level);
  const LevelIcon = levelInfo.icon;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8 min-h-screen pt-4 px-4 md:px-6">
      {/* Level Unlock Alert */}
      {showLevelAlert && (
        <div className={`fixed top-4 left-4 right-4 z-50 p-5 rounded-3xl bg-gradient-to-r ${getLevelInfo(showLevelAlert).gradient} text-white shadow-2xl animate-in slide-in-from-top-4 duration-500`}>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              {React.createElement(getLevelInfo(showLevelAlert).icon, { size: 28 })}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-80">Level Unlocked!</p>
              <p className="text-2xl font-black tracking-tight">{showLevelAlert} 🎉</p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">My Targets</h2>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <div className={`px-4 py-2 rounded-2xl bg-gradient-to-r ${levelInfo.gradient} text-white shadow-lg`}>
          <div className="flex items-center gap-2">
            <LevelIcon size={18} />
            <span className="text-sm font-black tracking-tight">{levelInfo.label}</span>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-2 bg-gray-100 p-1.5 rounded-2xl">
        {[
          { id: 'today', label: 'Today', icon: Target },
          { id: 'history', label: 'History', icon: Calendar },
          { id: 'leaderboard', label: 'Rankings', icon: Trophy },
          { id: 'rewards', label: 'Rewards', icon: Award },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB: Today */}
      {activeTab === 'today' && perf && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Earnings Potential Summary Card */}
          <div className={`bg-gradient-to-br ${perf.vgeType === 'FREELANCER' ? 'from-indigo-600 to-indigo-800' : 'from-emerald-600 to-emerald-800'} rounded-[2.5rem] p-6 text-white shadow-xl shadow-emerald-500/10`}>
             <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Monthly Payout Projection</p>
                  <p className="text-3xl font-black tracking-tight">
                    ₹{( (perf.vgeType === 'FREELANCER' ? 0 : perf.baseSalary) + (perf.totalIncentive * 30)).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="flex-1 bg-white/10 backdrop-blur px-3 py-2 rounded-xl border border-white/10">
                   <p className="text-[8px] font-black uppercase opacity-60">Base Pay</p>
                   <p className="text-sm font-black">₹{perf.vgeType === 'FREELANCER' ? '0' : (perf.baseSalary || 0).toLocaleString()}</p>
                </div>
                <div className="flex-1 bg-white/10 backdrop-blur px-3 py-2 rounded-xl border border-white/10">
                   <p className="text-[8px] font-black uppercase opacity-60">Est. Incentives</p>
                   <p className="text-sm font-black">₹{(perf.totalIncentive * 30).toLocaleString()}</p>
                </div>
             </div>
             <p className="text-[9px] font-bold opacity-60 mt-4 italic text-center">"Earn more today to increase your monthly estimate!"</p>
          </div>

          {/* Sales Progress Card */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                  <TrendingUp size={20} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Sales</p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">
                    ₹{(perf.totalSales || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Target</p>
                <p className="text-lg font-black text-gray-300">₹{(perf.dailyTarget || 10000).toLocaleString('en-IN')}</p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full rounded-full bg-gradient-to-r ${levelInfo.gradient} transition-all duration-1000 ease-out`}
                style={{ width: `${Math.min(100, perf.targetProgress || 0)}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-black text-white drop-shadow-sm">
                  {Math.round(perf.targetProgress || 0)}%
                </span>
              </div>
            </div>

            <div className="flex justify-between mt-2">
              <span className="text-[10px] font-bold text-gray-400">{perf.completedOrders || 0} orders</span>
              <span className="text-[10px] font-bold text-gray-400">{perf.totalRegistrations || 0} customers</span>
            </div>
          </div>

          {/* Level Progress */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-10 h-10 bg-gradient-to-br ${levelInfo.gradient} rounded-2xl flex items-center justify-center text-white`}>
                <LevelIcon size={20} />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Level</p>
                <p className="text-lg font-black text-gray-900 tracking-tight">{levelInfo.label}</p>
              </div>
              {perf.nextLevel?.nextLevel && (
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Next Level</p>
                  <p className="text-sm font-black text-emerald-600">{perf.nextLevel.nextLevel}</p>
                </div>
              )}
            </div>

            {/* Dynamic Level Ladder */}
            <div className="space-y-2">
              {(perf.rules || []).sort((a,b) => (a.salesFrom || 0) - (b.salesFrom || 0)).map((rule, idx) => {
                const config = getLevelInfo(rule.name);
                const isActive = perf.level === rule.name;
                
                // Logic to check if this level is already surpassed (using simple index for sorted rules)
                const currentIdx = (perf.rules || []).sort((a,b) => (a.salesFrom || 0) - (b.salesFrom || 0)).findIndex(r => r.name === perf.level);
                const isReached = currentIdx >= idx;
                
                const Icon = config.icon || Target;

                return (
                  <div key={rule.id || idx} className={`flex flex-col gap-2 p-3 rounded-2xl transition-all ${
                    isActive ? `bg-gradient-to-r ${config.gradient} text-white shadow-md` :
                    isReached ? 'bg-gray-50 text-gray-600 border border-gray-100' : 'bg-white border border-gray-100 text-gray-400 opacity-60'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-white/20' : isReached ? 'bg-gray-200' : 'bg-gray-50 text-gray-300'
                      }`}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-black tracking-tight">{rule.name}</span>
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                              ₹{Number(rule.salesFrom || 0).toLocaleString()} +
                            </span>
                         </div>
                         
                         {/* Config Details */}
                         <div className="flex items-center gap-2 mt-1 flex-wrap">
                           {rule.salesValue > 0 && (
                             <span className={`text-[9px] font-bold ${isActive ? 'text-white/80' : 'text-emerald-600'}`}>
                               • {rule.salesType === 'PERCENTAGE' ? `${rule.salesValue}%` : `₹${rule.salesValue}`} per ₹{rule.salesSlab || 0} sales
                             </span>
                           )}
                           {rule.appsRate > 0 && (
                             <span className={`text-[9px] font-bold ${isActive ? 'text-white/80' : 'text-blue-500'}`}>
                               • ₹{rule.appsRate} per {rule.appsSlab || 0} apps
                             </span>
                           )}
                         </div>
                      </div>
                      {isReached && !isActive && <span className="text-[12px] font-black uppercase tracking-widest opacity-50 shrink-0">✓</span>}
                      {isActive && <Flame size={16} className="animate-pulse shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {perf.nextLevel?.amountNeeded > 0 && (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs font-black text-emerald-700 text-center">
                  ₹{perf.nextLevel.amountNeeded.toLocaleString('en-IN')} more to {perf.nextLevel.nextLevel}
                </p>
              </div>
            )}
          </div>

          {/* Incentive Breakdown */}
          <div className="bg-white rounded-[2.5rem] p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                <Gift size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Incentives</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">
                  ₹{(perf.totalIncentive || 0).toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Sales Incentive</p>
                <p className="text-lg font-black text-emerald-900">₹{perf.salesIncentive || 0}</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-1">{perf.slabsCount || 0} slabs earned</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Reg. Incentive</p>
                <p className="text-lg font-black text-blue-900">₹{perf.regIncentive || 0}</p>
                <p className="text-[10px] font-bold text-blue-600 mt-1">{perf.totalRegistrations || 0} customers</p>
              </div>
            </div>

            {/* Next Slab Progress */}
            {perf.nextSlab && (
              <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Next Slab</span>
                  <span className="text-xs font-black text-emerald-600">+₹{perf.nextSlab.nextSlabReward}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-700"
                    style={{ width: `${perf.nextSlab.currentSlabProgress || 0}%` }}
                  />
                </div>
                <p className="text-[10px] font-bold text-gray-400 mt-1 text-right">
                  ₹{Math.round(perf.nextSlab.amountToNextSlab || 0).toLocaleString('en-IN')} to go
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB: History */}
      {activeTab === 'history' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-100">
              <Calendar size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-black text-gray-400">No history yet</p>
            </div>
          ) : (
            history.map(day => {
              const dayLevel = LEVEL_CONFIG[day.level || 'NONE'];
              const DayIcon = dayLevel.icon;
              return (
                <div key={day.id} className="bg-white rounded-[2rem] p-5 border border-gray-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${dayLevel.gradient} rounded-2xl flex items-center justify-center text-white`}>
                        <DayIcon size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900">
                          {new Date(day.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-[10px] font-bold text-gray-400">{dayLevel.label}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-gray-900">₹{day.totalSales.toLocaleString('en-IN')}</p>
                      {day.totalIncentive > 0 && (
                        <p className="text-[10px] font-black text-emerald-600">+₹{day.totalIncentive}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-4 text-[10px] font-bold text-gray-400">
                    <span>{day.completedOrders} orders</span>
                    <span>{day.totalRegistrations} customers</span>
                    <span>{day.slabsCount} slabs</span>
                    {day.isLocked && <span className="text-amber-500">🔒 Finalized</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB: Leaderboard */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {leaderboard.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-100">
              <Trophy size={40} className="mx-auto text-gray-200 mb-3" />
              <p className="text-sm font-black text-gray-400">No rankings yet today</p>
            </div>
          ) : (
            leaderboard.map((entry, idx) => {
              const entryLevel = LEVEL_CONFIG[entry.level || 'NONE'];
              const isTop3 = idx < 3;
              const rankColors = ['text-amber-500', 'text-gray-400', 'text-orange-400'];

              return (
                <div key={entry.userId} className={`bg-white rounded-[2rem] p-5 border shadow-sm flex items-center gap-4 ${
                  isTop3 ? 'border-emerald-100' : 'border-gray-100'
                }`}>
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${
                    isTop3 ? `bg-gradient-to-br ${entryLevel.gradient} text-white` : 'bg-gray-100 text-gray-500'
                  }`}>
                    {isTop3 ? ['🥇', '🥈', '🥉'][idx] : `#${entry.rank}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-900 truncate">{entry.name}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400">{entryLevel.label}</span>
                      {entry.vehicleNumber && (
                        <span className="text-[10px] font-bold text-gray-300">• {entry.vehicleNumber}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-gray-900">₹{entry.totalSales.toLocaleString('en-IN')}</p>
                    {entry.totalIncentive > 0 && (
                      <p className="text-[10px] font-black text-emerald-600">+₹{entry.totalIncentive}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
      {/* TAB: Rewards & Certificates */}
      {activeTab === 'rewards' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* CTC Awareness Card */}
          <div className={`bg-gradient-to-br ${perf.vgeType === 'FREELANCER' ? 'from-blue-600 to-blue-800' : 'from-emerald-600 to-emerald-800'} rounded-[2.5rem] p-6 text-white shadow-xl`}>
             <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 text-white/70">{perf.vgeType === 'FREELANCER' ? 'Project Earnings' : 'Monthly Compensation'}</p>
                  <p className="text-3xl font-black tracking-tight">
                    ₹{( (perf.vgeType === 'FREELANCER' ? 0 : perf.baseSalary) + (perf.totalIncentive * 30)).toLocaleString()} 
                    <span className="text-xs font-bold opacity-60 ml-2">{perf.vgeType === 'FREELANCER' ? 'Est. Monthly' : 'Est. CTC'}</span>
                  </p>
                </div>
                <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <TrendingUp size={24} />
                </div>
             </div>
             
             <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Fixed Salary</p>
                  <p className="text-xl font-black">₹{perf.vgeType === 'FREELANCER' ? '0' : perf.baseSalary?.toLocaleString()}</p>
                  <p className="text-[10px] font-bold opacity-60 mt-1">{perf.vgeType === 'FREELANCER' ? 'Not Applicable' : 'Guaranteed Base'}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-1">Incentives (Est.)</p>
                  <p className="text-xl font-black">₹{(perf.totalIncentive * 30).toLocaleString()}</p>
                  <p className="text-[10px] font-bold opacity-60 mt-1">App Commissions</p>
                </div>
             </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider px-2">Digital Awards & Badges</h3>
            {(perf.rules || []).filter(r => (r.salesFrom || 0) >= 20000).map(rule => {
              const info = getLevelInfo(rule.name);
              const currentIdx = (perf.rules || []).sort((a,b) => (a.salesFrom || 0) - (b.salesFrom || 0)).findIndex(r => r.name === perf.level);
              const ruleIdx = (perf.rules || []).sort((a,b) => (a.salesFrom || 0) - (b.salesFrom || 0)).findIndex(r => r.name === rule.name);
              const isUnlocked = currentIdx >= ruleIdx;

              return (
                <div key={rule.id} className={`bg-white p-5 rounded-[2rem] border transition-all flex items-center gap-4 ${isUnlocked ? 'border-amber-100 shadow-sm' : 'border-gray-50 opacity-40 grayscale'}`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br ${info.gradient} text-white shadow-lg`}>
                    {React.createElement(info.icon || Target, { size: 28 })}
                  </div>
                  <div className="flex-1">
                    <p className="text-base font-black text-gray-900 leading-tight">{rule.name} Badge</p>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">{isUnlocked ? 'Unlocked & Active' : 'Level-specific Achievement'}</p>
                  </div>
                  {isUnlocked && (
                    <button className="px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-wider border border-amber-100" onClick={() => toast.success('Certificate ready to download!')}>
                      Certificate
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-[2.5rem] p-6 text-center">
            <Trophy className="mx-auto text-amber-500 mb-2" size={32} />
            <h3 className="text-lg font-black text-amber-900 tracking-tight">Performance Excellence</h3>
            <p className="text-xs font-bold text-amber-700/70 mt-1 max-w-[200px] mx-auto">Maintain "Star" level for 3 months to receive the Star Bonus Award!</p>
          </div>
        </div>
      )}
    </div>
  );
}
