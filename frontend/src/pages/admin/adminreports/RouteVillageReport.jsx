import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function RouteVillageReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = { storeId };
      const [rRes, vRes] = await Promise.all([
        adminAPI.getRouteWiseReport(params),
        adminAPI.getVillageWiseReport(params)
      ]);
      setReportData({ routes: rRes.data, villages: vRes.data });
    } catch (error) {
      toast.error('Failed to load route & village data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Route & Village" icon={MapPin} activeTab="route-village" reportData={reportData} isLoading={isLoading}>
      {reportData && (
        <div className="space-y-10 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8 uppercase">Route Leaderboard</h3>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.routes} layout="vertical" margin={{ left: 10, right: 30 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="routeName" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#374151' }} width={120} />
                          <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="totalSales" radius={[0, 10, 10, 0]} barSize={20}>
                              {reportData.routes?.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#f97316'} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-50">
                  <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Village Sales Matrix</h3>
              </div>
              <div className="overflow-x-auto">
                  <table className="w-full text-left">
                      <thead>
                          <tr className="bg-gray-50/50">
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Village</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Session</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Orders</th>
                              <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Sales</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                          {reportData.villages?.map((v, i) => (
                              <tr key={i} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-4 text-sm font-black text-gray-800">{v.villageName}</td>
                                  <td className="px-6 py-4">
                                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${v.coverageType === 'MORNING' ? 'bg-orange-100 text-orange-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                          {v.coverageType}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-sm font-bold text-gray-600">{v.orderCount}</td>
                                  <td className="px-6 py-4 text-sm font-black text-indigo-600 italic">₹{(v.totalSales || 0).toLocaleString()}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          </div>
        </div>
      )}
    </ReportLayout>
  );
}
