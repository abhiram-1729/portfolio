import React, { useState, useEffect } from 'react';
import { ShoppingBag, TrendingUp, Calendar, Search, IndianRupee, Loader2, ArrowUpRight, ArrowDownRight, Package, Map, Filter, PieChart as PieChartIcon } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';

export default function VehicleSalesSection({ storeId }) {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('ALL');

  useEffect(() => {
    fetchSales();
  }, [storeId]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getSales({ storeId });
      setSales(res.data);
    } catch (error) {
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const q = searchTerm.toLowerCase();
  const filtered = sales.filter(s => {
    const matchesSearch = 
      s.displayId?.toLowerCase().includes(q) ||
      s.orderNumber?.toLowerCase().includes(q) ||
      s.vehicle?.vehicleNumber?.toLowerCase().includes(q) ||
      s.user?.name?.toLowerCase().includes(q) ||
      s.customerName?.toLowerCase().includes(q) ||
      s.route?.routeName?.toLowerCase().includes(q) ||
      s.villageName?.toLowerCase().includes(q);
    
    const matchesRoute = routeFilter === 'ALL' || 
      (s.route?.routeName === routeFilter) || 
      (s.villageName === routeFilter);

    return matchesSearch && matchesRoute;
  });

  const routes = Array.from(new Set(sales.map(s => s.route?.routeName || s.villageName || 'Unassigned / Direct')));

  const routeData = Object.entries(filtered.reduce((acc, s) => {
    const routeName = s.route?.routeName || s.villageName || 'Unassigned / Direct';
    acc[routeName] = (acc[routeName] || 0) + (s.totalAmount || 0);
    return acc;
  }, {})).map(([name, value]) => ({ name, value }));

  const COLORS = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#ecfdf5'];

  const totalRevenue = filtered.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalInvoices = filtered.length;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Loading Route Sales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-emerald-600 p-6 rounded-[2rem] text-white shadow-xl shadow-emerald-600/20">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Today's Revenue</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black tracking-tight">₹{totalRevenue.toLocaleString('en-IN')}</span>
            <span className="text-[10px] font-bold opacity-70 mt-1">From {totalInvoices} Invoices</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <ShoppingBag size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Average Ticket</span>
          </div>
          <div className="flex flex-col">
            <span className="text-3xl font-black text-gray-900 tracking-tight">₹{(totalRevenue / (totalInvoices || 1)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            <div className="flex items-center gap-1.5 mt-1">
              <ArrowUpRight size={12} className="text-emerald-500" strokeWidth={3} />
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">+12% vs last shift</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Map size={20} />
            </div>
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales by Route</span>
          </div>
          <div className="space-y-2 max-h-[60px] overflow-y-auto scrollbar-none">
            {Object.entries(filtered.reduce((acc, s) => {
              const routeName = s.route?.routeName || s.villageName || 'Unassigned / Direct';
              if (!acc[routeName]) acc[routeName] = 0;
              acc[routeName] += s.totalAmount || 0;
              return acc;
            }, {})).map(([name, val]) => (
              <div key={name} className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-gray-500 uppercase">{name}</span>
                <span className="text-[10px] font-black text-gray-900">₹{val.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Route Sales Log</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Real-time transaction stream</p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
            <div className="relative group w-full md:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search invoices, agents..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all focus:bg-white"
              />
            </div>

            <div className="relative w-full md:w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <select
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-transparent rounded-2xl text-sm font-black text-gray-700 appearance-none focus:ring-2 focus:ring-emerald-500/20 outline-none cursor-pointer"
              >
                <option value="ALL">ALL ROUTES</option>
                {routes.map(r => (
                  <option key={r} value={r}>{r.toUpperCase()}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {routeData.length > 0 && (
          <div className="mb-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center bg-emerald-50/30 p-8 rounded-[2rem] border border-emerald-100/50">
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={routeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {routeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                    formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <PieChartIcon className="text-emerald-600" size={24} />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Route Distribution</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {routeData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter truncate w-32">{d.name}</span>
                      <span className="text-xs font-black text-gray-900">₹{d.value.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Invoice</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Agent / Vehicle</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Route</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest">Customer</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-right">Amount</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(sale => (
                <tr key={sale.id} className="group hover:bg-emerald-50/20 transition-all">
                  <td className="px-4 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-gray-900 group-hover:text-emerald-600 transition-colors">#{sale.displayId || sale.id?.slice(-6)}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase mt-0.5">{new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700">{sale.user?.name || 'System'}</span>
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-tighter">{sale.vehicle?.vehicleNumber || 'POS'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-gray-700">{sale.route?.routeName || sale.villageName || 'Direct'}</span>
                      <span className="text-[9px] font-black text-emerald-600/60 uppercase tracking-tighter">Route Cluster</span>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <span className="text-xs font-bold text-gray-600">{sale.customerName || sale.customer?.name || 'Walk-in'}</span>
                  </td>
                  <td className="px-4 py-5 text-right">
                    <span className="text-sm font-black text-gray-900">₹{sale.totalAmount.toLocaleString('en-IN')}</span>
                  </td>
                  <td className="px-4 py-5 text-center">
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-emerald-100">
                      Completed
                    </span>
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
