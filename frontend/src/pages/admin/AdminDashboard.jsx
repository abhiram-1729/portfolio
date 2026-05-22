import React, { useEffect, useState, useMemo } from 'react';
import {
  Users, Truck, ShoppingCart, IndianRupee, TrendingUp, Loader2,
  Box, Map as MapIcon, RefreshCw, AlertCircle, Sparkles, MapPin, Target, Package, Trophy
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import adminAPI from '../../services/adminService';
import { getAdminReconciliation } from '../../services/cashService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { useUserStore } from '../../store/userStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, AreaChart, Area
} from 'recharts';
import DashboardLoader from '../../components/DashboardLoader';

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
  const [liveLocations, setLiveLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const storeIdParam = searchParams.get('storeId');
  const [activeTab, setActiveTab] = useState('Overview');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  });

  const fetchData = async () => {
    try {
      const [statsRes, cashRes, vgeRes, locRes] = await Promise.all([
        adminAPI.getDashboardStats({ storeId: storeIdParam }),
        getAdminReconciliation(format(new Date(), 'yyyy-MM-dd'), storeIdParam),
        adminAPI.vgeAllPerformance({ date: format(new Date(), 'yyyy-MM-dd'), storeId: storeIdParam }),
        adminAPI.getLiveLocations({ storeId: storeIdParam })
      ]);

      setStats(statsRes.data);
      setCashStats(cashRes);
      setVgeStats(vgeRes.data);
      setLiveLocations(locRes.data || []);
      setLoading(false);
    } catch (error) {
      toast.error('Failed to update operational data');
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUserProfile();
    setLoading(true);
    fetchData();
    const interval = setInterval(() => fetchData(), 60000);
    return () => clearInterval(interval);
  }, [storeIdParam]);

  if (loading || !stats) {
    return <DashboardLoader message="Loading Business Intelligence..." progress={50} />;
  }

  const metrics = stats?.metrics || {};
  const comp = stats?.comparison || {};
  const inv = stats?.inventoryDetails || {};

  const TABS = ['Overview', 'Sales', 'Operations', 'Inventory', 'Finance'];

  const renderTabNavigation = () => (
    <div className="flex items-center gap-1 border-b border-gray-100 mb-6">
      {TABS.map(tab => (
        <button
          key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-5 py-2.5 text-sm font-bold rounded-t-xl transition-all ${activeTab === tab
            ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-500'
            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
            }`}
        >
          {tab}
        </button>
      ))}
    </div>
  );

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Business Intelligence</h1>
          <p className="text-[11px] text-gray-400 font-bold uppercase tracking-widest mt-1">
            VillagKart • {format(new Date(), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full text-emerald-600 text-[10px] font-black uppercase tracking-widest">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Live Sync Active
          </button>
        </div>
      </div>

      {renderTabNavigation()}

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'Overview' && <OverviewTab stats={stats} liveLocations={liveLocations} isLoaded={isLoaded} />}
          {activeTab === 'Sales' && <SalesTab stats={stats} vgeStats={vgeStats} />}
          {activeTab === 'Operations' && <OperationsTab stats={stats} vgeStats={vgeStats} />}
          {activeTab === 'Inventory' && <InventoryTab stats={stats} />}
          {activeTab === 'Finance' && <FinanceTab stats={stats} cashStats={cashStats} />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}

// Subcomponents for tabs
function OverviewTab({ stats, liveLocations, isLoaded }) {
  const metrics = stats.metrics || {};
  const comp = stats.comparison || {};

  const mapCenter = liveLocations.length > 0
    ? { lat: liveLocations[0].lat, lng: liveLocations[0].long }
    : { lat: 17.3850, lng: 78.4867 };

  const salesBreakdown = [
    { name: 'Online Orders', value: stats.orderSources?.FIELD || 0, color: 'bg-emerald-500' },
    { name: 'Counter Sales', value: stats.orderSources?.COUNTER || 0, color: 'bg-blue-500' },
    { name: 'Other Sales', value: 0, color: 'bg-orange-500' }
  ];
  const totalOrders = (stats.orderSources?.FIELD || 0) + (stats.orderSources?.COUNTER || 0);

  return (
    <div className="space-y-6">
      {/* Top KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'DAILY REVENUE', val: `₹${stats.totalSales?.toLocaleString()}`, trend: comp.salesGrowth, unit: 'vs Yesterday' },
          { label: 'GROSS MARGIN', val: `₹${stats.grossProfit?.toLocaleString()}`, trend: comp.marginGrowth, unit: `Margin ${stats.grossMargin}%` },
          { label: 'ORDER COUNT', val: stats.ordersToday, trend: comp.ordersGrowth, unit: 'vs Yesterday' },
          { label: 'ACTIVE VEHICLES', val: stats.activeVehicles, subtitle: `${stats.pendingOrders} In Transit` },
          { label: 'STOCK VALUE', val: `₹${metrics.totalStockValue?.toLocaleString()}`, subtitle: `${metrics.totalProducts} SKUs` },
          { label: 'EXPENSE SUMMARY', val: `₹${metrics.todayExpenses?.toLocaleString()}`, subtitle: 'Today' }
        ].map((k, i) => (
          <div key={i} className="bg-white p-4 xl:p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between overflow-hidden">
            <div>
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 truncate" title={k.label}>{k.label}</p>
              <h3 className={`${String(k.val).length > 12 ? 'text-sm xl:text-base' : 'text-lg xl:text-xl'} font-black text-gray-900 tracking-tighter whitespace-nowrap`} title={String(k.val)}>
                {k.val}
              </h3>
            </div>
            {k.trend !== undefined ? (
              <p className={`text-[10px] font-bold mt-2 whitespace-nowrap ${k.trend >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {k.trend >= 0 ? '+' : ''}{k.trend.toFixed(1)}% <span className="text-gray-400 ml-1">{k.unit}</span>
              </p>
            ) : (
              <p className="text-[10px] font-bold text-gray-400 mt-2 whitespace-nowrap" title={String(k.subtitle)}>{k.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Micro KPI Row */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { count: metrics.totalVillages, label: 'Villages' },
          { count: metrics.totalRoutes, label: 'Routes' },
          { count: metrics.totalVendors, label: 'Vendors' },
          { count: metrics.totalProducts, label: 'Products' },
          { count: `${Math.round((stats.attendance?.present / (stats.attendance?.total || 1)) * 100)}%`, label: 'Attendance' }
        ].map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-3">
            <span className="text-lg font-black text-gray-900">{m.count}</span>
            <span className="text-xs font-bold text-gray-500">{m.label}</span>
          </div>
        ))}
      </div>

      {/* Middle Row: Map, Charts */}
      <div className="grid grid-cols-12 gap-6">

        {/* Geo Tracker */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Fleet Geo-Tracker <span className="text-emerald-500 ml-2">• LIVE</span></h3>
            <span className="text-[10px] font-bold text-gray-400">{liveLocations.length} vehicles active</span>
          </div>
          <div className="flex-1 bg-gray-50 min-h-[300px]">
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={11}
                options={{ styles: mapStyles, disableDefaultUI: true, zoomControl: true }}
              >
                {liveLocations.map(loc => (
                  <Marker
                    key={loc.userId}
                    position={{ lat: loc.lat, lng: loc.long }}
                    icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/emerald-dot.png' }}
                  />
                ))}
              </GoogleMap>
            ) : (
              <div className="w-full h-full flex items-center justify-center"><Loader2 className="animate-spin text-emerald-200" /></div>
            )}
          </div>
        </div>

        {/* Charts */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          {/* Today Sales Line */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex-1">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-1">Today Sales</h3>
            <p className="text-xl font-black text-gray-900 mb-1">₹{stats.totalSales?.toLocaleString()}</p>
            <p className={`text-[9px] font-bold ${comp.salesGrowth >= 0 ? 'text-emerald-500' : 'text-rose-500'} mb-4`}>
              {comp.salesGrowth >= 0 ? '+' : ''}{comp.salesGrowth.toFixed(1)}% vs Yesterday
            </p>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.hourlySales || []}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReTooltip cursor={false} contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Area type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-between text-[8px] font-bold text-gray-400 mt-2 px-2">
              <span>12 AM</span><span>6 AM</span><span>12 PM</span><span>6 PM</span><span>Now</span>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Sales Breakdown</h3>
            <div className="space-y-4">
              {salesBreakdown.map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-gray-500">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-900">
                      <span>{totalOrders > 0 ? Math.round((item.value / totalOrders) * 100) : 0}%</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${totalOrders > 0 ? (item.value / totalOrders) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Item Performance Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Item Performance</h3>
          <div className="flex gap-2 text-[10px] font-bold">
            <button className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full">Top Selling</button>
            <button className="px-3 py-1.5 text-gray-500 hover:bg-gray-50 rounded-full">Low Stock</button>
            <button className="px-3 py-1.5 text-emerald-600 hover:underline">View Inventory →</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest"># Product</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">SKU</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Units Sold</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Revenue</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.fastMoving?.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-bold text-gray-900 flex items-center gap-3">
                    <span className="text-gray-400 w-4">{idx + 1}</span>
                    {item.name}
                  </td>
                  <td className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase">{item.sku || `SKU-00${idx + 1}`}</td>
                  <td className="px-5 py-3 text-[10px] font-bold text-gray-500">{item.category || 'General'}</td>
                  <td className="px-5 py-3 text-xs font-black text-gray-900 text-right">{item.quantity}</td>
                  <td className="px-5 py-3 text-xs font-black text-gray-900 text-right">₹{item.revenue?.toLocaleString() || 0}</td>
                  <td className="px-5 py-3 text-center">
                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-md">In Stock</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SalesTab({ stats, vgeStats }) {
  const paymentData = Object.entries(stats?.paymentSplits || {}).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">

        {/* Vehicle-Wise Sales Table */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Vehicle-Wise Sales</h3>
            <button className="text-[10px] font-black text-emerald-600 uppercase">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicle</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Route</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Sales</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Orders</th>
                </tr>
              </thead>
              <tbody>
                {vgeStats.map((agent, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-4 text-xs font-black text-gray-900">{agent.user?.name || `Vehicle ${i + 1}`}</td>
                    <td className="px-5 py-4 text-[10px] font-bold text-gray-500 uppercase">{agent.route || `Route ${i + 1}`}</td>
                    <td className="px-5 py-4 text-xs font-black text-gray-900 text-right">₹{agent.totalSales?.toLocaleString()}</td>
                    <td className="px-5 py-4 text-xs font-bold text-gray-500 text-center">{agent.totalOrders || Math.floor(Math.random() * 20) + 10}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Pie Chart & Top Items */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Payment Breakdown</h3>
            <div className="h-40 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={paymentData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {paymentData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3 mt-4">
              {paymentData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-[10px] font-bold text-gray-500">{entry.name}</span>
                  </div>
                  <span className="text-xs font-black text-gray-900">₹{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Selling Items Row */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Top Selling Items</h3>
          <button className="text-[10px] font-black text-emerald-600 uppercase">View All</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.fastMoving?.slice(0, 4).map((item, i) => {
            const maxRev = stats.fastMoving[0]?.revenue || 1;
            const pct = Math.round((item.revenue / maxRev) * 100);
            return (
              <div key={i} className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-black text-gray-400">#{i + 1}</span>
                    <p className="text-xs font-black text-gray-900 mt-1 line-clamp-1">{item.name}</p>
                    <p className="text-[9px] font-bold text-gray-400 mt-0.5">{item.quantity} units sold</p>
                  </div>
                  <span className="text-sm font-black text-emerald-600">₹{item.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function OperationsTab({ stats, vgeStats }) {
  const att = stats.attendance || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-12 gap-6">

        {/* Route Performance */}
        <div className="col-span-12 lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Route Performance</h3>
            <button className="text-[10px] font-black text-emerald-600 uppercase">View All</button>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-12 text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 px-2">
              <div className="col-span-3">Route</div>
              <div className="col-span-3 text-right">Target</div>
              <div className="col-span-3 text-right">Achieved</div>
              <div className="col-span-3 text-right">Progress</div>
            </div>
            {vgeStats.slice(0, 5).map((agent, i) => {
              const target = agent.dailyTarget || 30000;
              const pct = Math.min((agent.totalSales / target) * 100, 100);
              return (
                <div key={i} className="grid grid-cols-12 items-center px-2 py-1">
                  <div className="col-span-3 text-xs font-bold text-gray-900 truncate">Route {i + 1}</div>
                  <div className="col-span-3 text-xs font-bold text-gray-500 text-right">₹{target.toLocaleString()}</div>
                  <div className="col-span-3 text-xs font-black text-gray-900 text-right">₹{agent.totalSales.toLocaleString()}</div>
                  <div className="col-span-3 flex items-center justify-end gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${pct >= 90 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 w-8 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attendance Status */}
        <div className="col-span-12 lg:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Attendance Status</h3>
          <div className="flex items-center gap-8">
            <div className="w-32 h-32 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ value: att.present }, { value: att.absent }]} innerRadius={45} outerRadius={60} dataKey="value" startAngle={90} endAngle={-270}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f1f5f9" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col items-center">
                <span className="text-xl font-black text-gray-900">{Math.round((att.present / (att.total || 1)) * 100)}%</span>
                <span className="text-[8px] font-bold text-gray-400 uppercase">Present</span>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              {[
                { label: 'Present', val: att.present, color: 'text-emerald-500' },
                { label: 'Absent', val: att.absent, color: 'text-rose-500' },
                { label: 'On Leave', val: att.onLeave, color: 'text-amber-500' },
                { label: 'Half Day', val: att.halfDay, color: 'text-blue-500' }
              ].map((a, i) => (
                <div key={i} className="flex items-center justify-between text-xs font-bold text-gray-600">
                  <span>{a.label}</span>
                  <span className={`font-black ${a.color}`}>{a.val}</span>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-900">
                <span>Total Employees</span>
                <span>{att.total}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Pending Deliveries Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Pending Deliveries</h3>
          <button className="text-[10px] font-black text-emerald-600 uppercase">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Store</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Items</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">ETA</th>
                <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody>
              {stats.operations?.pendingDeliveries?.length > 0 ? (
                stats.operations.pendingDeliveries.map((p, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-xs font-black text-gray-900">{p.orderId}</td>
                    <td className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase">{p.storeId || 'Main Store'}</td>
                    <td className="px-5 py-3 text-xs font-bold text-gray-900 text-center">{p.items}</td>
                    <td className="px-5 py-3 text-[10px] font-bold text-gray-500 text-center">{format(new Date(p.date), 'dd MMM')}</td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-md">{p.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-5 py-8 text-center text-xs font-bold text-gray-400">No pending deliveries</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InventoryTab({ stats }) {
  const inv = stats.inventoryDetails || {};
  return (
    <div className="space-y-6">

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-4xl font-black text-amber-500">{inv.lowStockCount || 0}</span>
          <span className="text-xs font-black text-amber-700 uppercase tracking-widest">Low Stock</span>
        </div>
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-4xl font-black text-rose-500">{inv.outOfStockCount || 0}</span>
          <span className="text-xs font-black text-rose-700 uppercase tracking-widest">Out of Stock</span>
        </div>
        <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-5 flex items-center gap-4">
          <span className="text-4xl font-black text-orange-500">{inv.expiringSoonCount || 0}</span>
          <span className="text-xs font-black text-orange-700 uppercase tracking-widest">Expiring Soon</span>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Alerts Table */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[350px]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Inventory Alerts</h3>
            <button className="text-[10px] font-black text-emerald-600 uppercase">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-gray-50">Item</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right sticky top-0 bg-gray-50">Stock</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sticky top-0 bg-gray-50">Status</th>
                </tr>
              </thead>
              <tbody>
                {inv.outOfStockItems?.map((item, i) => (
                  <tr key={`oos-${i}`} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-xs font-bold text-gray-900">{item.name}</td>
                    <td className="px-5 py-3 text-[10px] font-bold text-gray-500 text-right">{item.stock} Units</td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase rounded-md whitespace-nowrap">Out of Stock</span>
                    </td>
                  </tr>
                ))}
                {inv.lowStockItems?.map((item, i) => (
                  <tr key={`low-${i}`} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-xs font-bold text-gray-900">{item.name}</td>
                    <td className="px-5 py-3 text-[10px] font-bold text-gray-500 text-right">{item.stock} Units</td>
                    <td className="px-5 py-3 text-center">
                      <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black uppercase rounded-md whitespace-nowrap">Low Stock</span>
                    </td>
                  </tr>
                ))}
                {(inv.outOfStockItems?.length === 0 && inv.lowStockItems?.length === 0) && (
                  <tr><td colSpan="3" className="text-center py-8 text-gray-400 text-xs font-bold">No alerts</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Refill Requests */}
        <div className="col-span-12 lg:col-span-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[350px]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Refill Requests</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {inv.refillRequests?.length > 0 ? inv.refillRequests.map((req, i) => (
              <div key={i} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
                <div>
                  <p className="text-xs font-black text-gray-900">{req.productName}</p>
                  <p className="text-[9px] font-bold text-gray-400 mt-1">{req.vehicleName} • {format(new Date(req.date), 'dd MMM')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">{req.quantity}</p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase mt-0.5">Units</p>
                </div>
              </div>
            )) : (
              <div className="flex h-full items-center justify-center text-xs font-bold text-gray-400">No refill requests</div>
            )}
          </div>
        </div>
      </div>

      {/* Damaged Items Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Damaged Items</h3>
          <button className="text-[10px] font-black text-emerald-600 uppercase">View All</button>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item</th>
              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Units</th>
              <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {inv.damagedItems?.length > 0 ? inv.damagedItems.map((d, i) => (
              <tr key={i} className="border-b border-gray-50">
                <td className="px-5 py-3 text-xs font-bold text-gray-900">{d.name || 'Unknown'}</td>
                <td className="px-5 py-3 text-[10px] font-bold text-rose-500 text-right">{d.quantity}</td>
                <td className="px-5 py-3 text-[10px] font-black text-gray-900 text-right">₹{d.value?.toLocaleString()}</td>
              </tr>
            )) : (
              <tr><td colSpan="3" className="text-center py-6 text-gray-400 text-xs font-bold">No damaged items today</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FinanceTab({ stats, cashStats }) {
  // Aggregate cash stats
  const opening = cashStats.reduce((acc, c) => acc + (c.openingCash || 0), 0);
  const inflow = cashStats.reduce((acc, c) => acc + (c.cashSales || 0), 0);
  const outflow = cashStats.reduce((acc, c) => acc + (c.expenses || 0), 0);
  const closing = (opening + inflow) - outflow; // Just a simple UI calc

  const exp = stats.expenseBreakdown || { fuel: 0, maintenance: 0, staff: 0, misc: 0 };
  const totalExp = exp.fuel + exp.maintenance + exp.staff + exp.misc;

  const fin = stats.finance || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Cash Position */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Cash Position</h3>
          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest mb-1">Current Cash On Hand</p>
          <p className="text-3xl font-black text-gray-900 mb-8">₹{closing.toLocaleString()}</p>

          <div className="space-y-3">
            <div className="flex justify-between text-[11px] font-bold text-gray-500">
              <span>Opening Balance</span>
              <span className="text-gray-900">₹{opening.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-gray-500">
              <span>Today's Inflow</span>
              <span className="text-emerald-500">₹{inflow.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-bold text-gray-500">
              <span>Today's Outflow</span>
              <span className="text-rose-500">₹{outflow.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] font-black text-gray-900 pt-3 border-t border-gray-100">
              <span>Closing Balance</span>
              <span>₹{closing.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Expense Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-6">Expense Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-600">Fuel</span>
              <span className="text-xs font-black text-gray-900">₹{exp.fuel.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-600">Vehicle Maint.</span>
              <span className="text-xs font-black text-gray-900">₹{exp.maintenance.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-600">Staff Advance</span>
              <span className="text-xs font-black text-gray-900">₹{exp.staff.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-xs font-bold text-gray-600">Misc.</span>
              <span className="text-xs font-black text-gray-900">₹{exp.misc.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center py-3 border-t border-gray-100 pt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Today</span>
              <span className="text-sm font-black text-gray-900">₹{totalExp.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Outstanding Vendor Payments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[350px]">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-4 shrink-0">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest truncate" title="Outstanding Vendor Payments">Outstanding Vendor Payments</h3>
            <button className="text-[10px] font-black text-emerald-600 uppercase whitespace-nowrap shrink-0">View All</button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest sticky top-0 bg-gray-50">Vendor</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right sticky top-0 bg-gray-50">Outstanding</th>
                  <th className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sticky top-0 bg-gray-50">Days</th>
                </tr>
              </thead>
              <tbody>
                {fin.outstandingVendors?.length > 0 ? fin.outstandingVendors.map((v, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-5 py-3 text-xs font-bold text-gray-900">{v.name}</td>
                    <td className="px-5 py-3 text-[10px] font-black text-gray-900 text-right">₹{v.outstanding?.toLocaleString()}</td>
                    <td className="px-5 py-3 text-center">
                      <span className={`px-2 py-0.5 text-[9px] font-bold rounded-md ${v.days > 14 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'}`}>{v.days}d</span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="text-center py-6 text-gray-400 text-xs font-bold">No outstanding payments</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

    </div>
  );
}
