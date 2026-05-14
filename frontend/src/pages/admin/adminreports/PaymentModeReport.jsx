import React, { useState, useEffect } from 'react';
import { CreditCard } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import { COLORS } from './ReportUtils';

export default function PaymentModeReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getPaymentReport({ storeId });
      setReportData(res.data.paymentSplits || {});
    } catch (error) {
      toast.error('Failed to load payment mode data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  const safeData = (reportData && typeof reportData === 'object' && !Array.isArray(reportData)) ? reportData : {};
  const pieData = Object.entries(safeData).map(([name, value]) => ({ name, value }));

  return (
    <ReportLayout title="Payment Mode" icon={CreditCard} activeTab="payment-mode" reportData={reportData} isLoading={isLoading}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col items-center">
              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8 self-start uppercase">Transaction Channels</h3>
              <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                          <Pie data={pieData} innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" animationDuration={1500}>
                              {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} />
                      </RePieChart>
                  </ResponsiveContainer>
              </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-4 uppercase">Channel Breakdown</h3>
              {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-sm font-black text-gray-700 uppercase tracking-widest">{d.name}</span>
                      </div>
                      <span className="text-lg font-black text-gray-900 italic">₹{(d.value || 0).toLocaleString()}</span>
                  </div>
              ))}
          </div>
      </div>
    </ReportLayout>
  );
}
