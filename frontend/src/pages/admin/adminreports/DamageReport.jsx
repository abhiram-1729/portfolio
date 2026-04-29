import React, { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function DamageReport() {
  const [reportData, setReportData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getDamageReports({ storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load damage data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Damage Report" icon={AlertTriangle} activeTab="damages" reportData={reportData} isLoading={isLoading}>
      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-amber-500">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Loss (Approved)</p>
                  <h3 className="text-2xl font-black text-amber-600 italic">₹{reportData.summary?.totalLoss?.toLocaleString() || 0}</h3>
              </div>
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm border-l-4 border-l-emerald-500">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Deductions Applied</p>
                  <h3 className="text-2xl font-black text-emerald-600 italic">₹{reportData.summary?.totalDeductions?.toLocaleString() || 0}</h3>
              </div>
          </div>
          <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
              <h3 className="text-lg font-black text-gray-900 tracking-tight mb-6 uppercase">Damages by Category</h3>
              <div className="space-y-4">
                  {Object.entries(reportData.lossByType || {}).map(([type, data]) => (
                      <div key={type} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex justify-between items-center">
                          <div>
                              <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">{type.replace('_', ' ')}</p>
                              <p className="text-[10px] font-bold text-gray-400">{data.count} Incidents</p>
                          </div>
                          <div className="text-right">
                              <p className="text-md font-black text-amber-600 italic">₹{(data.loss || 0).toLocaleString()}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      </div>
    </ReportLayout>
  );
}
