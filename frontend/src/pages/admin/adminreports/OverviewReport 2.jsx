import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, ShoppingCart, Package } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import { StatCard } from './ReportUtils';

export default function OverviewReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = { storeId };
      const [trendRes, topRes, dailyRes] = await Promise.all([
        adminAPI.getTrendsReport({ days: 7, ...params }),
        adminAPI.getTopProducts(params),
        adminAPI.getDailyReport(params)
      ]);
      setReportData({ trends: trendRes.data, topProducts: topRes.data, daily: dailyRes.data });
    } catch (error) {
      toast.error('Failed to load overview data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Overview" activeTab="overview" reportData={reportData} isLoading={isLoading}>
      {reportData && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard label="Total Revenue" value={`₹${reportData.daily?.totalSales?.toLocaleString() || 0}`} icon={TrendingUp} colorClass="text-emerald-600 bg-emerald-50" />
            <StatCard label="Net Profit" value={`₹${reportData.daily?.totalProfit?.toLocaleString() || 0}`} icon={Target} colorClass="text-orange-600 bg-orange-50" />
            <StatCard label="Orders Today" value={reportData.daily?.totalOrders || 0} icon={ShoppingCart} colorClass="text-blue-600 bg-blue-50" />
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Performance Analytics</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">7-Day Revenue & Profit Distribution</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase">Revenue</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-orange-500 shadow-sm shadow-orange-200" />
                  <span className="text-[10px] font-black text-gray-400 uppercase">Profit</span>
                </div>
              </div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={reportData.trends}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#9ca3af'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 800, fill: '#9ca3af'}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '15px' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={4} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" stroke="#f97316" strokeWidth={4} fill="url(#colorProf)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6">Top Contributing Products</h3>
            <div className="space-y-4">
              {reportData.topProducts?.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center border border-gray-100">
                      {p.image ? <img src={p.image} className="w-full h-full object-cover rounded-xl" /> : <Package className="text-gray-300" />}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{p.name}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">{p.totalQty} Units Distributed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900 tracking-tighter italic">₹{(p.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-gray-400">Profit: ₹{(p.totalProfit || 0).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ReportLayout>
  );
}
