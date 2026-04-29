import React, { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function InvoiceReport() {
  const [reportData, setReportData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getInvoiceReport({ storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load invoice data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Invoice Report" icon={FileText} activeTab="invoices" reportData={reportData} isLoading={isLoading}>
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in duration-500">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Recent Invoices Audit</h3>
              <div className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest">Last 50 Entries</div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left">
                  <thead>
                      <tr className="bg-gray-50/50">
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Inv ID</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Amount</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode</th>
                          <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {Array.isArray(reportData) && reportData.map((ord, i) => (
                          <tr key={i} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-xs font-black text-gray-800 tracking-tighter">{ord.displayId}</td>
                              <td className="px-6 py-4 text-sm font-bold text-gray-600">{ord.customerName || 'Walk-in'}</td>
                              <td className="px-6 py-4 text-sm font-black text-gray-900 italic">₹{(ord.totalAmount || 0).toLocaleString()}</td>
                              <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ord.paymentMode === 'CASH' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>{ord.paymentMode}</span></td>
                              <td className="px-6 py-4"><span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${ord.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{ord.status}</span></td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>
    </ReportLayout>
  );
}
