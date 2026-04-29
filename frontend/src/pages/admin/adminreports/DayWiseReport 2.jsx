import React, { useState, useEffect } from 'react';
import { Calendar, RotateCcw } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function DayWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getTrendsReport({ days: 30, storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load day-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Day-wise Sales" icon={Calendar} activeTab="day-wise" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
        <div className="p-6 border-b border-gray-50 flex justify-between items-center">
            <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Daily Revenue Audit</h3>
            <button onClick={fetchData} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all">
              <RotateCcw size={18} />
            </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Orders</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue</th>
                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.isArray(reportData) && reportData.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-black text-gray-800">{item.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-600">{item.orders}</td>
                  <td className="px-6 py-4 text-sm font-black text-emerald-600 italic">₹{(item.revenue || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-orange-600">₹{(item.profit || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ReportLayout>
  );
}
