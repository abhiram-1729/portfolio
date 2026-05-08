import React, { useEffect, useState } from 'react';
import {
  Users,
  Truck,
  ShoppingCart,
  DollarSign,
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
  RefreshCw
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import adminAPI from '../../services/adminService';
import { getAdminReconciliation } from '../../services/cashService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const itemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: { y: 0, opacity: 1 }
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

export default function AdminDashboard() {
  const { user: currentUser } = useUserStore();
  const [stats, setStats] = useState(null);
  const [cashStats, setCashStats] = useState([]);
  const [vgeStats, setVgeStats] = useState([]);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const storeIdParam = searchParams.get('storeId');

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

      // Auto-select if only one store exists
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

  const isGlobalRole = (currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'ADMIN' || currentUser?.portalType === 'ADMIN' || currentUser?.portalType === 'SUPERVISOR');
  
  if (!storeIdParam && isGlobalRole) {
    const staffByStore = users.reduce((acc, u) => {
      if (u.storeId) acc[u.storeId] = (acc[u.storeId] || 0) + 1;
      return acc;
    }, {});

    return (
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Operational Network</h1>
          <p className="text-gray-500">Select a branch to monitor real-time distribution and logistics performance.</p>
        </div>
        <div className="grid gap-4">
          {stores.map(store => (
            <button
              key={store.id}
              onClick={() => setSearchParams({ storeId: store.id })}
              className="flex items-center justify-between p-6 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group text-left"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                  <Building2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{store.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded uppercase tracking-wider">{store.code}</span>
                    <span className="text-xs text-gray-400 font-medium tracking-wide">• {store.stateCode || 'Active'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-8">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Personnel</p>
                  <p className="text-lg font-bold text-gray-900">{staffByStore[store.id] || 0} <span className="text-sm font-medium text-gray-400 ml-1">Staff</span></p>
                </div>
                <ArrowRight size={20} className="text-gray-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
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

  return (
    <motion.div initial="hidden" animate="visible" variants={containerVariants} className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {isGlobalRole && stores.length > 1 && (
            <button onClick={() => setSearchParams({})} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all">
              <ChevronLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Business Intelligence</h1>
            <div className="flex items-center gap-2 mt-1">
              <Activity size={14} className="text-emerald-500" />
              <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {currentUser?.tenantName || 'System'} Dashboard {storeIdParam && `• ${stores.find(s => s.id === storeIdParam)?.name}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Live Sync Active</span>
          </div>
          <button onClick={() => fetchData()} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (12-column layout) */}
      <div className="grid grid-cols-12 gap-6">
        {[
          { label: 'Revenue Today', value: `₹${stats?.totalSales?.toLocaleString() || 0}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12.5%' },
          { label: 'Active Vehicles', value: stats?.activeVehicles || 0, icon: Truck, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'In-Transit' },
          { label: 'Orders Completed', value: stats?.ordersToday || 0, icon: ShoppingCart, color: 'text-orange-600', bg: 'bg-orange-50', trend: 'Processed' },
          { label: 'Stock Valuation', value: `₹${(metrics.totalStockValue || 0).toLocaleString()}`, icon: Box, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Estimated' }
        ].map((kpi, idx) => (
          <div key={idx} className="col-span-12 md:col-span-6 lg:col-span-3 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                <kpi.icon size={20} />
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${kpi.bg} ${kpi.color} uppercase tracking-wider`}>{kpi.trend}</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{kpi.label}</p>
              <h3 className="text-2xl font-bold text-gray-900">{kpi.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Summary Row */}
      <div className="grid grid-cols-12 gap-6">
        {[
          { label: 'Villages', value: metrics.totalVillages, icon: MapPin },
          { label: 'Routes', value: metrics.totalRoutes, icon: RouteIcon },
          { label: 'Vendors', value: metrics.totalVendors, icon: UserCheck },
          { label: 'Products', value: metrics.totalProducts, icon: Package }
        ].map(item => (
          <div key={item.label} className="col-span-6 md:col-span-3 bg-white px-5 py-4 rounded-xl border border-gray-100 flex items-center gap-4">
            <div className="text-gray-400"><item.icon size={18} /></div>
            <div>
              <p className="text-lg font-bold text-gray-900 leading-none mb-1">{item.value || 0}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Layout (Map + Feed) */}
      <div className="grid grid-cols-12 gap-8 items-start">
        
        {/* Left Section: Map & Insights */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          
          {/* Map Section */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                <MapIcon size={16} className="text-emerald-500" />
                Fleet Geo-Tracker
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span className="text-[10px] font-bold text-gray-400 uppercase">Live Distribution</span>
              </div>
            </div>
            <div className="h-[480px] w-full bg-gray-50">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={12}
                  options={{ styles: mapStyles, disableDefaultUI: true, zoomControl: true }}
                >
                  {liveLocations.map(loc => (
                    <Marker key={loc.userId} position={{ lat: loc.lat, lng: loc.long }} title={loc.userName} />
                  ))}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-gray-300" />
                </div>
              )}
            </div>
          </div>

          {/* Velocity & Assets (Nested 12-col grid) */}
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 md:col-span-7 bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                  <TrendingUp size={18} className="text-emerald-500" />
                  Velocity Insights
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded">30D Matrix</span>
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">Fast Moving</p>
                  {stats?.fastMoving?.map((p, i) => (
                    <div key={i} className="flex flex-col gap-1 pb-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-semibold text-gray-800 truncate">{p.name}</span>
                      <span className="text-[10px] font-bold text-emerald-600">{p.quantity} Units Sold</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-4">
                  <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">Slow Moving</p>
                  {stats?.slowMoving?.map((p, i) => (
                    <div key={i} className="flex flex-col gap-1 pb-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-semibold text-gray-800 truncate">{p.name}</span>
                      <span className="text-[10px] font-bold text-rose-500">{p.quantity || 0} Units Sold</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-12 md:col-span-5 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-50">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                  <Wallet size={18} className="text-emerald-500" />
                  Asset Portfolio
                </h3>
                <span className="text-[10px] font-bold text-gray-400 uppercase">Equity</span>
              </div>
              <div className="flex-1 space-y-6">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Estimated Valuation</p>
                  <p className="text-3xl font-bold text-gray-900">₹{metrics.assetValue?.toLocaleString() || 0}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Inventory</p>
                    <p className="text-lg font-bold text-gray-900">{metrics.assetQty || 0} <span className="text-[10px] text-gray-400 font-medium">Units</span></p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Utilization</p>
                    <p className="text-lg font-bold text-gray-900">82%</p>
                  </div>
                </div>
                <Link to="/admin/assets" className="mt-auto block w-full py-3 bg-gray-900 text-white text-center font-bold rounded-lg text-[10px] uppercase tracking-[0.2em] hover:bg-gray-800 transition-colors shadow-lg shadow-gray-200">
                  Enterprise Asset Manager
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Live Feed & Performance */}
        <div className="col-span-12 lg:col-span-4 space-y-8">
          
          {/* Live Sales Feed */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col h-[520px]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                <Activity size={16} className="text-emerald-500" />
                Sales stream
              </h3>
              <Link to="/admin/sales" className="text-[10px] font-bold text-emerald-600 hover:underline uppercase tracking-wider">Historical Logs</Link>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {stats?.recentOrders?.map(order => (
                <div key={order.id} className="pb-4 border-b border-gray-50 last:border-0 last:pb-0 group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-bold text-gray-400 uppercase">Order #{order.displayId}</span>
                    <span className="text-[10px] font-medium text-gray-400">{format(new Date(order.createdAt), 'hh:mm a')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">{order.customerName || 'Walk-in Transaction'}</p>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mt-0.5">{order.paymentMode}</p>
                    </div>
                    <p className="text-base font-bold text-gray-900">₹{order.totalAmount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {(!stats?.recentOrders || stats?.recentOrders?.length === 0) && (
                <div className="flex flex-col items-center justify-center h-full opacity-25 grayscale">
                  <Clock size={32} className="text-gray-300 mb-2" />
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Awaiting Transactions</p>
                </div>
              )}
            </div>
            <div className="p-6 bg-gray-50/50 border-t border-gray-100 grid grid-cols-2 gap-6">
              <div>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Expenses</p>
                <p className="text-lg font-bold text-rose-500">₹{metrics.todayExpenses?.toLocaleString() || 0}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Net Position</p>
                <p className="text-lg font-bold text-emerald-600">₹{((stats?.totalSales || 0) - (metrics?.todayExpenses || 0)).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* VGE Performance */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8 pb-3 border-b border-gray-50">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-widest">
                <Trophy size={16} className="text-amber-500" />
                Performance Leaderboard
              </h3>
              <Target size={14} className="text-gray-300" />
            </div>
            <div className="space-y-5">
              {vgeStats.slice(0, 5).map((agent, idx) => (
                <div key={agent.id} className="flex items-center gap-4">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                    idx === 0 ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate uppercase tracking-wide">{agent.user?.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min((agent.totalSales / (agent.dailyTarget || 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-[9px] font-bold text-gray-400 uppercase">{Math.round((agent.totalSales / (agent.dailyTarget || 1)) * 100)}%</span>
                    </div>
                  </div>
                  <div className="text-right ml-2">
                    <p className="text-xs font-bold text-gray-900">₹{agent.totalSales.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reconciliation Summary */}
          <div className="bg-gray-900 p-6 rounded-xl text-white shadow-xl">
            <div className="flex items-center justify-between mb-8 pb-3 border-b border-white/10">
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-2">
                <Coins size={14} />
                Treasury Recon
              </h3>
              <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest">Today</span>
            </div>
            <div className="space-y-5">
              {cashStats.slice(0, 3).map(summary => (
                <div key={summary.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold">{summary.vehicle?.vehicleNumber || 'Branch'}</p>
                    <p className="text-[9px] font-bold text-white/40 uppercase mt-0.5 tracking-tighter">{summary.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">₹{summary.actualCash.toLocaleString()}</p>
                    <p className={`text-[9px] font-bold tracking-widest ${summary.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {summary.difference === 0 ? 'MATCHED' : `${summary.difference > 0 ? '+' : ''}₹${summary.difference}`}
                    </p>
                  </div>
                </div>
              ))}
              {cashStats.length === 0 && (
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] py-4 text-center">No reports submitted</p>
              )}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}
function RotateCcw({ size }) {
  return <RefreshCw size={size} />;
}
