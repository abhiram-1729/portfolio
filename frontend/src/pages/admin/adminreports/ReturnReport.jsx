import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function ReturnReport() {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getReturnReport({ storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load return data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Return Report" icon={RotateCcw} activeTab="returns" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-6 border-b border-gray-50 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600"><RotateCcw size={20} /></div>
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Product Return Audit</h3>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Qty</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {Array.isArray(reportData) && reportData.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-sm font-black text-gray-800">{r.order?.displayId || 'N/A'}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-600">{r.product?.name}</td>
                              <td className="px-6 py-4 text-sm font-black text-red-600">-{r.quantity}</td>
                              <td className="px-6 py-4 text-sm font-black text-gray-900 italic">₹{r.amount?.toLocaleString()}</td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                  {r.createdAt ? format(new Date(r.createdAt), 'dd MMM yyyy') : 'N/A'}
                              </td>
                          </tr>
                      ))}
                      {reportData.length === 0 && <tr><td colSpan="5" className="py-20 text-center text-gray-300 font-bold uppercase text-[10px] tracking-widest">No Returns Recorded</td></tr>}
                  </tbody>
              </table>
          </div>
      </div>
    </ReportLayout>
  );
}
