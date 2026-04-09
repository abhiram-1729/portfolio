import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  Truck, 
  Package, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Download,
  Loader2,
  CreditCard,
  Target,
  ArrowUpRight,
  ShoppingCart,
  DollarSign,
  Users,
  Activity,
  Globe,
  Map,
  MapPin
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Data States
  const [dailyReport, setDailyReport] = useState(null);
  const [trendsData, setTrendsData] = useState(null);
  const [topProducts, setTopProducts] = useState(null);
  const [routeData, setRouteData] = useState(null);
  const [villageData, setVillageData] = useState(null);
  const [agentPerformance, setAgentPerformance] = useState(null);
  const [locationCheckIns, setLocationCheckIns] = useState(null);


  // Loading States
  const [isOverviewLoading, setIsOverviewLoading] = useState(false);
  const [isDailyLoading, setIsDailyLoading] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [isTrackingLoading, setIsTrackingLoading] = useState(false);


  const loadDailyData = async () => {
    if (dailyReport) return; // Cache hit
    setIsDailyLoading(true);
    try {
      const { data } = await adminAPI.getDailyReport();
      setDailyReport(data);
    } catch (error) {
      toast.error('Failed to fetch daily report');
    } finally {
      setIsDailyLoading(false);
    }
  };

  const loadOverviewData = async () => {
    if (trendsData && topProducts && dailyReport) return; // Cache hit
    setIsOverviewLoading(true);
    try {
      const [trendRes, topRes, dailyRes] = await Promise.all([
        trendsData ? Promise.resolve({ data: trendsData }) : adminAPI.getTrendsReport({ days: 7 }),
        topProducts ? Promise.resolve({ data: topProducts }) : adminAPI.getTopProducts(),
        dailyReport ? Promise.resolve({ data: dailyReport }) : adminAPI.getDailyReport()
      ]);
      setTrendsData(trendRes.data);
      setTopProducts(topRes.data);
      setDailyReport(dailyRes.data);
    } catch (error) {
      console.error('Overview data error:', error);
      toast.error('Failed to load overview data');
    } finally {
      setIsOverviewLoading(false);
    }
  };

  const loadRouteData = async () => {
    if (routeData && villageData) return;
    setIsRouteLoading(true);
    try {
        const [routeRes, villageRes] = await Promise.all([
            adminAPI.getRouteWiseReport(),
            adminAPI.getVillageWiseReport()
        ]);
        setRouteData(routeRes.data);
        setVillageData(villageRes.data);
    } catch (error) {
        toast.error('Failed to fetch route analytics');
    } finally {
        setIsRouteLoading(false);
    }
  };

  const loadAgentData = async () => {
    if (agentPerformance) return;
    setIsAgentLoading(true);
    try {
        const { data } = await adminAPI.getAgentPerformance();
        setAgentPerformance(data);
    } catch (error) {
        toast.error('Failed to fetch agent performance');
    } finally {
        setIsAgentLoading(false);
    }
  };

  const loadTrackingData = async () => {
    if (locationCheckIns) return;
    setIsTrackingLoading(true);
    try {
      const { data } = await adminAPI.getLocationCheckIns();
      setLocationCheckIns(data);
    } catch (error) {
      toast.error('Failed to fetch tracking data');
    } finally {
      setIsTrackingLoading(false);
    }
  };


  useEffect(() => {
    // Initial load relies on the active tab
    if (activeTab === 'overview') loadOverviewData();
  }, []);

  useEffect(() => {
    // Only load if it's the active tab and data isn't already loaded
    if (activeTab === 'daily') loadDailyData();
    if (activeTab === 'overview') loadOverviewData();
    if (activeTab === 'route') loadRouteData();
    if (activeTab === 'targets') loadAgentData();
    if (activeTab === 'tracking') loadTrackingData();
  }, [activeTab]);


  const StatCard = ({ icon: Icon, label, value, subValue, color, bgColor }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center text-white shadow-lg`}>
        <Icon size={22} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className={`text-xl font-black ${color} tracking-tighter`}>{value}</p>
        {subValue && <p className="text-[10px] font-bold text-gray-400 mt-0.5">{subValue}</p>}
      </div>
    </div>
  );

  const renderOverview = () => {
    if (isOverviewLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Loading Overview...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Primary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard 
              icon={TrendingUp} 
              label="Total Revenue" 
              value={`₹${dailyReport?.totalSales?.toLocaleString() || 0}`} 
              subValue="Today's Earnings"
              color="text-emerald-700" 
              bgColor="bg-emerald-500" 
          />
          <StatCard 
              icon={Target} 
              label="Net Profit" 
              value={`₹${dailyReport?.totalProfit?.toLocaleString() || 0}`} 
              subValue="Today's Margin"
              color="text-orange-600" 
              bgColor="bg-orange-500" 
          />
        </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Performance Trends</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Last 7 Days Sales & Profit</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <span className="text-[10px] font-bold text-gray-400 uppercase">Profit</span>
            </div>
          </div>
        </div>

        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendsData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 800, fill: '#9ca3af'}} 
                dy={10}
              />
              <YAxis 
                hide 
              />
              <Tooltip 
                contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#10b981" 
                strokeWidth={4}
                fillOpacity={1} 
                fill="url(#colorRev)" 
                animationDuration={1500}
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorProf)" 
                animationDuration={2000}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Products */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-6 px-1">
          <div>
            <h3 className="text-lg font-black text-gray-900 tracking-tight">Top Products</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Ranked by Revenue Contributions</p>
          </div>
            <button className="p-2.5 rounded-xl bg-gray-50 text-gray-400">
              <ArrowUpRight size={18} />
            </button>
          </div>

          <div className="space-y-4">
            {topProducts?.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between group p-1 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden shadow-sm group-hover:scale-105 transition-transform">
                    {p.image ? (
                      <img src={p.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package size={20} className="text-gray-300" />
                    )}
                  </div>
                  <div>
                    <p className="text-[0.9rem] font-bold text-gray-900 leading-tight">{p.name}</p>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter mt-0.5">{p.totalQty} Units Sold</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-gray-900 text-[1rem] tracking-tighter leading-none">₹{p.totalRevenue.toLocaleString()}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                     <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                     <p className="text-[10px] font-bold text-orange-600 line-none tracking-tighter">₹{p.totalProfit.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
            {(!topProducts || topProducts.length === 0) && (
              <div className="py-10 text-center">
                <ShoppingCart size={32} className="mx-auto text-gray-200 mb-2" />
                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">No Sales Found Today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDaily = () => {
    if (isDailyLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Loading Daily Data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6 text-center">
          <TrendingUp size={48} className="mx-auto text-emerald-500" />
        <div className="flex flex-col gap-1">
          <h3 className="text-xl font-bold text-gray-900">Today's Performance</h3>
          <p className="text-xs text-gray-400 font-medium">Summary for {new Date().toDateString()}</p>
        </div>
        
        <div className="grid grid-cols-1 gap-3 text-left">
          <div className="bg-gray-50 p-4 rounded-xl flex justify-between items-center border border-gray-100 shadow-sm">
             <div className="flex items-center gap-3">
               <Package size={18} className="text-gray-400" />
               <span className="text-sm font-medium text-gray-600">Total Orders</span>
             </div>
             <span className="text-lg font-bold text-gray-900">{dailyReport?.totalOrders || 0}</span>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl flex justify-between items-center border border-emerald-100 shadow-sm">
             <div className="flex items-center gap-3">
               <TrendingUp size={18} className="text-emerald-500" />
               <span className="text-sm font-medium text-emerald-700">Total Sales</span>
             </div>
             <span className="text-lg font-bold text-emerald-900">₹{dailyReport?.totalSales?.toLocaleString() || 0}</span>
          </div>
          <div className="bg-orange-50 p-4 rounded-xl flex justify-between items-center border border-orange-100 shadow-sm">
             <div className="flex items-center gap-3">
               <DollarSign size={18} className="text-orange-500" />
               <span className="text-sm font-medium text-orange-700">Net Profit</span>
             </div>
             <span className="text-lg font-bold text-orange-900">₹{dailyReport?.totalProfit?.toLocaleString() || 0}</span>
          </div>
        </div>

        <div className="space-y-3 text-left">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard size={14} />
              Payment Splits
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {['CASH', 'UPI', 'CARD'].map(mode => (
                <div key={mode} className="bg-white p-3 rounded-xl border border-gray-100 text-center shadow-sm">
                  <span className="text-[10px] font-bold text-gray-400 block">{mode}</span>
                  <span className="text-xs font-bold text-gray-800">₹{dailyReport?.paymentSplits?.[mode]?.toLocaleString() || 0}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderRouteReport = () => {
    if (isRouteLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Analyzing Routes...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Route Performance Chart */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="mb-6 px-1">
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Route Leaderboard</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Revenue Distribution by Assigned Route</p>
            </div>
            
            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={routeData} layout="vertical" margin={{ left: 10, right: 30 }}>
                        <XAxis type="number" hide />
                        <YAxis 
                            dataKey="routeName" 
                            type="category" 
                            axisLine={false} 
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 900, fill: '#374151' }}
                            width={100}
                        />
                        <Tooltip 
                            cursor={{ fill: '#f9fafb' }}
                            contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="totalSales" radius={[0, 10, 10, 0]} barSize={20}>
                            {routeData?.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#f97316'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Village Breakdown */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-6 px-1">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Village Performance</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Morning vs Evening Session Revenue</p>
            </div>
            <Activity className="text-gray-300" size={24} />
          </div>

          <div className="space-y-3">
            {villageData?.map((v, idx) => (
               <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${v.coverageType === 'MORNING' ? 'bg-orange-400' : 'bg-indigo-500'}`}>
                        <Globe size={18} />
                    </div>
                    <div>
                        <p className="text-sm font-black text-gray-900">{v.villageName}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${v.coverageType === 'MORNING' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                {v.coverageType}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{v.orderCount} Orders</span>
                        </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-md font-black text-gray-900 tracking-tighter italic">₹{v.totalSales.toLocaleString()}</p>
                  </div>
               </div>
            ))}
            {(!villageData || villageData.length === 0) && (
              <div className="py-12 text-center text-gray-300">
                <Map size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No Geographical Data Logged</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderAgentPerformance = () => {
    if (isAgentLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Fetching Agent Stats...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8 px-1">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Agent Sales Targets</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time Daily Performance Tracking</p>
            </div>
            <Target size={24} className="text-emerald-500" />
          </div>

          <div className="space-y-8">
            {agentPerformance?.map((agent, idx) => (
              <div key={idx} className="space-y-3">
                <div className="flex justify-between items-end px-1">
                  <div>
                    <h4 className="text-sm font-black text-gray-900">{agent.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                      Today: ₹{agent.totalSales.toLocaleString()} <span className="opacity-40">/ Goal: ₹{agent.dailyTarget.toLocaleString()}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black tracking-tighter ${agent.percentage >= 100 ? 'text-emerald-600' : 'text-orange-500'}`}>
                      {agent.percentage}%
                    </span>
                  </div>
                </div>
                
                <div className="h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100 p-0.5 shadow-inner">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(agent.percentage, 100)}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      agent.percentage >= 100 
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' 
                      : 'bg-gradient-to-r from-orange-400 to-orange-500'
                    }`}
                  />
                </div>

                {agent.percentage >= 100 && (
                  <div className="flex items-center gap-1.5 px-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Target Achieved</span>
                  </div>
                )}
              </div>
            ))}

            {(!agentPerformance || agentPerformance.length === 0) && (
              <div className="py-12 text-center text-gray-300">
                <Users size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No Active Sales Agents</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTracking = () => {
    if (isTrackingLoading) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Loading Tracking Data...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8 px-1">
            <div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight">Agent Location Tracking</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Real-time arrival logs from the field</p>
            </div>
            <MapPin size={24} className="text-emerald-500" />
          </div>

          <div className="space-y-4">
            {locationCheckIns?.map((log, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-emerald-100 transition-all shadow-sm">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${log.status === 'ON_TIME' ? 'bg-emerald-500 shadow-emerald-200' : 'bg-amber-500 shadow-amber-200'} shadow-lg`}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900">{log.user?.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tight">{log.villageName || 'Unknown Village'}</span>
                      <span className="text-gray-300">•</span>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter">
                        {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {log.isLocationMatched ? (
                      <div className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-widest mt-1.5 opacity-60">
                        <CheckCircle2 size={10} strokeWidth={3} />
                        <span>Location Verified</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1.5">
                        <AlertTriangle size={10} strokeWidth={3} />
                        <span>Location Mismatch</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border ${log.status === 'ON_TIME' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                    <span className="text-[10px] font-black uppercase tracking-widest">{log.status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                      {new Date(log.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </p>
                    <a 
                      href={`https://www.google.com/maps?q=${log.latitude},${log.longitude}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                      title="Open in Google Maps"
                    >
                      <Globe size={12} />
                    </a>
                  </div>
                </div>
              </div>
            ))}
            {(!locationCheckIns || locationCheckIns.length === 0) && (
              <div className="py-12 text-center text-gray-300">
                <Activity size={48} className="mx-auto mb-4 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No Tracking Logs Today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Reports Portal</h2>
          <p className="text-sm text-gray-500">Track performance and reconcile data</p>
        </div>
        <button className="bg-emerald-600 text-white p-3 rounded-xl shadow-lg hover:bg-emerald-700 transition-colors">
          <Download size={24} />
        </button>
      </div>

      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'daily', label: 'Summary' },
          { key: 'route', label: 'Geographical' },
          { key: 'targets', label: 'Targets' },
          { key: 'tracking', label: 'Tracking' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex-1 py-3 px-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-200",
              activeTab === tab.key ? "bg-white text-emerald-600 shadow-sm" : "text-gray-400"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="transition-all duration-300">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'daily' && renderDaily()}
        {activeTab === 'route' && renderRouteReport()}
        {activeTab === 'targets' && renderAgentPerformance()}
        {activeTab === 'tracking' && renderTracking()}
      </div>
    </div>
  );
}

function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
