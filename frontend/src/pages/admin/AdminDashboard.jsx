import React, { useEffect, useState } from 'react';
import {
  Users,
  Truck,
  ShoppingCart,
  IndianRupee,
  TrendingUp,
  Loader2,
  Coins,
  Target,
  Trophy,
  Package,
  MapPin,
  Route as RouteIcon,
  Wallet,
  Box,
  Map as MapIcon,
  ChevronLeft,
  Building2,
  ArrowRight,
  Activity,
  UserCheck,
  Clock,
  RefreshCw,
  AlertCircle,
  Sparkles,
  PlayCircle,
  X
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import adminAPI from '../../services/adminService';
import { getAdminReconciliation } from '../../services/cashService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, 
  CartesianGrid, AreaChart, Area 
} from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const mapStyles = [
  { "featureType": "administrative", "elementType": "labels.text.fill", "stylers": [{ "color": "#444444" }] },
  { "featureType": "landscape", "elementType": "all", "stylers": [{ "color": "#f8f9fa" }] },
  { "featureType": "poi", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "all", "stylers": [{ "saturation": -100 }, { "lightness": 45 }] },
  { "featureType": "road.highway", "elementType": "all", "stylers": [{ "visibility": "simplified" }] },
  { "featureType": "road.arterial", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "transit", "elementType": "all", "stylers": [{ "visibility": "off" }] },
  { "featureType": "water", "elementType": "all", "stylers": [{ "color": "#e9ecef" }, { "visibility": "on" }] }
];

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AdminDashboard() {
  const { user: currentUser, refreshUserProfile } = useUserStore();
  const [stats, setStats] = useState(null);
  const [cashStats, setCashStats] = useState([]);
  const [vgeStats, setVgeStats] = useState([]);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const storeIdParam = searchParams.get('storeId');
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(!localStorage.getItem('hideAdminOnboardingPrompt'));

  const dismissPrompt = () => {
    localStorage.setItem('hideAdminOnboardingPrompt', 'true');
    setShowPrompt(false);
  };

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const fetchData = async () => {
    try {
      const [statsRes, cashRes, vgeRes, storesRes, usersRes, locRes] = await Promise.all([
        adminAPI.getDashboardStats({ storeId: storeIdParam }),
        getAdminReconciliation(format(new Date(), 'yyyy-MM-dd'), storeIdParam),
        adminAPI.vgeAllPerformance({ date: format(new Date(), 'yyyy-MM-dd'), storeId: storeIdParam }),
        adminAPI.getStores(),
        adminAPI.getUsers(),
        adminAPI.getLiveLocations({ storeId: storeIdParam })
      ]);
      
      setStats(statsRes.data);
      setCashStats(cashRes);
      setVgeStats(vgeRes.data);
      setLiveLocations(locRes.data || []);
      const fetchedStores = storesRes.data?.success ? storesRes.data.data : (storesRes.data || []);
      setStores(fetchedStores);
      setUsers(usersRes.data || []);

      if (fetchedStores.length === 1 && !storeIdParam) {
        setSearchParams({ storeId: fetchedStores[0].id });
      }
    } catch (error) {
      toast.error('Failed to update operational data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Always refresh permissions from server before rendering widgets
    refreshUserProfile();
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [storeIdParam]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-sm text-gray-500 font-semibold uppercase tracking-widest">Initializing Control Center</p>
      </div>
    );
  }

  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN' || (currentUser?.role === 'ADMIN' && !currentUser?.customRoleId) || currentUser?.portalType === 'ADMIN' || currentUser?.portalType === 'SUPERVISOR';
  
  const canViewWidget = (key) => {
    let widgets = currentUser?.permissions?.DASHBOARD_WIDGETS;
    // If no widget config exists at all, show everything (TENANT_OWNER / legacy users)
    if (widgets === undefined || widgets === null) return true;
    // Handle case where Prisma JSON is deserialized as a string
    if (typeof widgets === 'string') {
      try { widgets = JSON.parse(widgets); } catch { return false; }
    }
    if (!Array.isArray(widgets)) return false;
    // If widget config exists, ALWAYS enforce it — even for admin roles
    return widgets.includes(key);
  };
  
  if (false && !storeIdParam && isGlobalRole && stores.length > 1) {
    const staffByStore = users.reduce((acc, u) => {
      if (u.storeId) acc[u.storeId] = (acc[u.storeId] || 0) + 1;
      return acc;
    }, {});

    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-3 tracking-tight">Operational Network</h1>
          <p className="text-gray-500 text-lg">Select a command node to monitor real-time distribution and performance.</p>
        </div>
        <div className="grid gap-6">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => setSearchParams({ storeId: store.id })}
              className="flex items-center justify-between p-8 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group text-left"
            >
              <div className="flex items-center gap-8">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all shadow-inner">
                  <Building2 size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900 mb-1">{store.name}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black px-3 py-1 bg-gray-900 text-white rounded-full uppercase tracking-widest">{store.code}</span>
                    <span className="text-sm text-gray-400 font-bold tracking-wide">• {store.stateCode || 'Active Node'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-12">
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Total Personnel</p>
                  <p className="text-2xl font-black text-gray-900">{staffByStore[store.id] || 0} <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Staff</span></p>
                </div>
                <ArrowRight size={24} className="text-gray-200 group-hover:text-emerald-500 group-hover:translate-x-2 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    );
  }

  const mapCenter = liveLocations.length > 0 
    ? { lat: liveLocations[0].lat, lng: liveLocations[0].long }
    : { lat: 17.3850, lng: 78.4867 };
  const metrics = stats?.metrics || {};

  // Prepare Chart Data
  const orderSourceData = [
    { name: 'Counter', value: stats?.orderSources?.COUNTER || 0 },
    { name: 'Field', value: stats?.orderSources?.FIELD || 0 }
  ];

  const paymentData = Object.entries(stats?.paymentSplits || {}).map(([name, value]) => ({ name, value }));

  const velocityData = stats?.fastMoving?.map(p => ({
    name: p.name.split(' ').slice(0, 2).join(' '),
    quantity: p.quantity
  })) || [];

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      
      {/* Highly Spottable Professional Guidance Banner */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            className="bg-emerald-600 text-white rounded-2xl p-4 md:p-5 shadow-lg shadow-emerald-600/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black tracking-tight">Command Center Guidance</h3>
                  <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-md uppercase tracking-wider">Pro Tip</span>
                </div>
                <p className="text-xs text-emerald-50/90 font-medium mt-0.5 max-w-xl leading-relaxed">
                  Master multi-node operational audits, active fleet distributions, and instant dispatch controls directly in our guidance dashboard.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={() => navigate('/admin/onboarding')}
                className="flex items-center gap-2 bg-white hover:bg-emerald-50 text-emerald-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-sm transition-all active:scale-95"
              >
                <PlayCircle size={14} className="text-emerald-600" />
                Launch Onboarding
              </button>
              <button 
                onClick={dismissPrompt}
                className="p-2 text-emerald-200 hover:text-white rounded-lg transition-colors"
                title="Dismiss guidance prompt"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-gray-100">
        <div className="flex items-center gap-6">
          {false && isGlobalRole && stores.length > 1 && (
            <button onClick={() => setSearchParams({})} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all shadow-sm">
              <ChevronLeft size={24} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Command Center</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full">
                <Activity size={12} className="text-emerald-500" />
                <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Active Node</span>
              </div>
              <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest">
                {currentUser?.tenantName} • {stores.find(s => s.id === storeIdParam)?.name}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Status</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-black text-gray-900 uppercase">Secure Link Active</span>
            </div>
          </div>
          <button onClick={() => fetchData()} className="p-3 bg-white border border-gray-200 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm">
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {/* Primary KPI Command Grid */}
      <div className="grid grid-cols-12 gap-6">
        {[
          { key: 'totalSales',       label: 'Revenue Today',    value: `₹${stats?.totalSales?.toLocaleString() || 0}`,       icon: IndianRupee,  color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12.5%',           detail: 'Gross Intake'    },
          { key: 'grossMargin',      label: 'Gross Margin',     value: `${stats?.grossMargin || 0}%`,                         icon: TrendingUp,   color: 'text-blue-600',    bg: 'bg-blue-50',    trend: `₹${stats?.grossProfit?.toLocaleString() || 0}`, detail: 'Net Efficiency'  },
          { key: 'totalOrders',      label: 'Orders Today',     value: stats?.ordersToday || 0,                               icon: ShoppingCart, color: 'text-orange-600',  bg: 'bg-orange-50',  trend: 'Processed',         detail: 'Trans. Volume'   },
          { key: 'activeVehicles',   label: 'Active Fleet',     value: stats?.activeVehicles || 0,                            icon: Truck,        color: 'text-indigo-600',  bg: 'bg-indigo-50',  trend: 'In-Transit',        detail: 'Deployment'      },
          { key: 'stockValuation',   label: 'Stock Valuation',  value: `₹${(metrics.totalStockValue || 0).toLocaleString()}`, icon: Package,      color: 'text-teal-600',    bg: 'bg-teal-50',    trend: 'Estimated',         detail: 'Assets Value'    },
          { key: 'pendingLogistics', label: 'Pending Logistics',value: stats?.pendingOrders || 0,                             icon: Clock,        color: 'text-amber-600',   bg: 'bg-amber-50',   trend: 'Awaiting',          detail: 'Fulfillment'     },
          { key: 'criticalAlerts',   label: 'Critical Alerts',  value: stats?.inventoryAlerts || 0,                          icon: Target,       color: 'text-rose-600',    bg: 'bg-rose-50',    trend: 'Response Required', detail: 'Safety Stock'    },
          { key: 'refillRequests',   label: 'Refill Requests',  value: stats?.pendingRefills || 0,                            icon: Box,          color: 'text-purple-600',  bg: 'bg-purple-50',  trend: 'Pending',           detail: 'Fleet Resupply'  }
        ].map((kpi, idx) => canViewWidget(kpi.key) ? (
          <div key={idx} className="col-span-12 sm:col-span-6 lg:col-span-3 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group overflow-hidden relative">
            <div className="absolute -right-2 -bottom-2 text-gray-50 opacity-10 group-hover:scale-110 transition-transform">
              <kpi.icon size={100} strokeWidth={1} />
            </div>
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className={`w-12 h-12 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center shadow-inner`}>
                <kpi.icon size={24} />
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${kpi.bg} ${kpi.color} uppercase tracking-widest`}>{kpi.trend}</span>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">{kpi.detail}</p>
              </div>
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-black text-gray-900 tracking-tighter">{kpi.value}</h3>
            </div>
          </div>
        ) : null)}
      </div>

      {/* Main Insights Grid */}
      <div className="grid grid-cols-12 gap-8">
        
        {/* Analytics Left Column */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Real-time Fleet Intelligence */}
          {(canViewWidget('fleetMap') || canViewWidget('orderChannels') || canViewWidget('paymentSplit')) && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {canViewWidget('fleetMap') && (
              <>
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-3 tracking-tighter uppercase">
                  <MapIcon size={20} className="text-emerald-500" />
                  Fleet Geo-Intelligence
                </h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Live Deployment & Real-time Distribution</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 shadow-inner">
                  <UserCheck size={18} className="text-emerald-600" />
                  <span className="text-xs font-black text-gray-700 uppercase tracking-widest">{stats?.activeAttendance || 0} Agents Live</span>
                </div>
              </div>
            </div>
            <div className="h-[450px] w-full bg-gray-50">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={12}
                  options={{ styles: mapStyles, disableDefaultUI: true, zoomControl: true }}
                >
                  {liveLocations.map(loc => (
                    <Marker 
                      key={loc.userId} 
                      position={{ lat: loc.lat, lng: loc.long }} 
                      title={loc.userName} 
                      icon={{
                        url: 'https://maps.google.com/mapfiles/ms/icons/emerald-dot.png',
                        scaledSize: { width: 32, height: 32 }
                      }}
                    />
                  ))}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-200" size={40} />
                </div>
              )}
            </div>
              </>
            )}
            
            {/* Visual Distribution Analytics */}
            {(canViewWidget('orderChannels') || canViewWidget('paymentSplit')) && (
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center bg-white">
              {canViewWidget('orderChannels') && (
              <div className="flex items-center gap-8">
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={orderSourceData}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {orderSourceData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Order Channels</h4>
                  {orderSourceData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{entry.name}</span>
                      <span className="text-xs font-black text-gray-900 ml-auto">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              )}
              {canViewWidget('paymentSplit') && (
              <div className={`flex items-center gap-8 ${canViewWidget('orderChannels') ? 'border-l border-gray-100 pl-12' : ''}`}>
                <div className="w-32 h-32">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentData}
                        innerRadius={35}
                        outerRadius={50}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-2">Revenue Split</h4>
                  {paymentData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[(index + 2) % COLORS.length] }} />
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{entry.name}</span>
                      <span className="text-xs font-black text-gray-900 ml-auto">₹{entry.value?.toLocaleString() || 0}</span>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
            )}
          </div>
          )}

          <div className="grid grid-cols-2 gap-8">
            {/* Velocity Bar Chart */}
            {canViewWidget('productVelocity') && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <TrendingUp size={18} className="text-emerald-500" />
                    Product Velocity
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Top performing SKUs by Volume</p>
                </div>
              </div>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData} layout="vertical" margin={{ left: 10, right: 30 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                      dataKey="name" 
                      type="category" 
                      tick={{ fontSize: 9, fontWeight: 900, fill: '#94a3b8' }} 
                      width={80} 
                    />
                    <ReTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="quantity" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            )}

            {/* Critical Alert Hub */}
            {canViewWidget('operationalCriticals') && (
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-50">
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                    <Target size={18} className="text-rose-500" />
                    Operational Criticals
                  </h3>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Safety Stocks & Performance Alerts</p>
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div className={`p-5 rounded-2xl border transition-all ${stats?.inventoryAlerts > 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${stats?.inventoryAlerts > 0 ? 'bg-white text-rose-500' : 'bg-white text-emerald-500'}`}>
                      {stats?.inventoryAlerts > 0 ? <AlertCircle size={24} /> : <UserCheck size={24} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Inventory Health</p>
                      <h4 className="text-lg font-black text-gray-900">{stats?.inventoryAlerts || 0} Critical SKUs</h4>
                    </div>
                  </div>
                  {stats?.inventoryAlerts > 0 && (
                    <Link to="/admin/inventory" className="mt-4 flex items-center justify-center w-full py-2 bg-rose-600 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] hover:bg-rose-700 transition-colors">
                      Trigger Resupply
                    </Link>
                  )}
                </div>
                <div className="p-5 rounded-2xl border bg-indigo-50 border-indigo-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-white text-indigo-600 flex items-center justify-center shadow-sm">
                      <RouteIcon size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Route Coverage</p>
                      <h4 className="text-lg font-black text-gray-900">{metrics.totalRoutes || 0} Active Zones</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </div>

        {/* Intelligence Right Column */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Enterprise Treasury Analytics */}
          {(canViewWidget('treasuryAnalytics') || canViewWidget('cashStatus')) && (
          <div className="bg-gray-900 p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full" />
            
            <div className="relative z-10 space-y-10">
              {canViewWidget('treasuryAnalytics') && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 flex items-center gap-2">
                    <Wallet size={16} />
                    Treasury Analytics
                  </h3>
                  <div className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-md text-[8px] font-black uppercase">Consolidated</div>
                </div>
                <div className="space-y-8">
                  <div>
                    <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">Total Vendor Liabilities</p>
                    <p className="text-4xl font-black text-white tracking-tighter">₹{stats?.outstandingPayments?.toLocaleString() || 0}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/5">
                    <div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1 text-rose-400/60">Daily Damage</p>
                      <p className="text-2xl font-black text-rose-400">{stats?.todayDamages || 0} <span className="text-[10px] text-white/20 font-bold uppercase ml-1">SKU</span></p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-white/40 uppercase tracking-widest mb-1 text-blue-400/60">Net Expenses</p>
                      <p className="text-2xl font-black text-blue-400">₹{metrics.todayExpenses?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
              )}

              {canViewWidget('cashStatus') && (
              <div className="space-y-5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-400/40 pb-3 border-b border-white/5">Operational Recon Feed</h4>
                {cashStats.slice(0, 4).map(summary => (
                  <div key={summary.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group">
                    <div>
                      <p className="text-xs font-black">{summary.vehicle?.vehicleNumber || 'Base Station'}</p>
                      <p className="text-[8px] font-bold text-white/30 uppercase mt-0.5">{summary.status} • {format(new Date(), 'HH:mm')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black">₹{summary.actualCash?.toLocaleString() || 0}</p>
                      <div className={`flex items-center justify-end gap-1 text-[8px] font-black ${summary.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {summary.difference === 0 ? <UserCheck size={8} /> : null}
                        {summary.difference === 0 ? 'VERIFIED' : `DELTA: ₹${summary.difference}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
          )}

          {/* Performance Stream */}
          {canViewWidget('topPerformers') && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white/50 backdrop-blur-xl">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-3 uppercase tracking-widest">
                <Trophy size={18} className="text-amber-500" />
                Elite Performance
              </h3>
              <Link to="/admin/sales" className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline">Full Audit</Link>
            </div>
            <div className="p-6 space-y-6">
              {vgeStats.slice(0, 5).map((agent, idx) => (
                <div key={agent.id} className="flex items-center gap-5 group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-transform group-hover:scale-110 shadow-sm ${
                    idx === 0 ? 'bg-amber-100 text-amber-700 shadow-amber-100' : 'bg-gray-50 text-gray-400 shadow-gray-50'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-black text-gray-900 truncate uppercase tracking-tight">{agent.user?.name}</p>
                      <span className="text-xs font-black text-gray-900 tracking-tighter">₹{agent.totalSales?.toLocaleString() || 0}</span>
                    </div>
                    <div className="h-1.5 bg-gray-50 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((agent.totalSales / (agent.dailyTarget || 1)) * 100, 100)}%` }}
                        className={`h-full rounded-full ${idx === 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Target Velocity</span>
                      <span className="text-[9px] font-black text-gray-900">{Math.round((agent.totalSales / (agent.dailyTarget || 1)) * 100)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          {/* Live Events Stream */}
          {canViewWidget('liveSales') && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm flex flex-col h-[400px]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-white">
              <h3 className="text-xs font-black text-gray-900 flex items-center gap-3 uppercase tracking-widest">
                <Activity size={16} className="text-emerald-500" />
                Live Sales stream
              </h3>
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded text-[8px] font-black text-emerald-600 uppercase">Live</div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-4 space-y-6">
              {stats?.recentOrders?.map(order => (
                <div key={order.id} className="relative pl-6 border-l-2 border-gray-50 group hover:border-emerald-500 transition-all">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-gray-200 group-hover:bg-emerald-500 transition-all" />
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Order {order.displayId}</span>
                    <span className="text-[10px] font-bold text-gray-400">{format(new Date(order.createdAt), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight group-hover:text-emerald-600 transition-colors">{order.customerName || 'Retail Client'}</p>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{order.paymentMode}</p>
                    </div>
                    <p className="text-sm font-black text-gray-900 tracking-tighter">₹{order.totalAmount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

        </div>
      </div>
    </motion.div>
  );
}

function RotateCcw({ size }) {
  return <RefreshCw size={size} />;
}
