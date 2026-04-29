import React, { useState, useEffect } from 'react';
import { Truck } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';

export default function VehicleWiseReport() {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await adminAPI.getVehicleReport({ storeId });
      setReportData(res.data);
    } catch (error) {
      toast.error('Failed to load vehicle-wise data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Substore (Vehicle)" icon={Truck} activeTab="vehicle-wise" reportData={reportData} isLoading={isLoading}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-500">
          {Array.isArray(reportData) && reportData.map((vh, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group border-b-4 border-b-slate-200">
                  <div className="flex justify-between items-start mb-6">
                      <div className="p-3 rounded-2xl bg-slate-50 text-slate-600"><Truck size={24} /></div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vh.displayId || 'VH-LOG'}</div>
                  </div>
                  <h4 className="text-xl font-black text-gray-900 tracking-tighter mb-4">{vh.vehicleNumber}</h4>
                  <div className="space-y-3">
                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-400 uppercase">Revenue Generated</span><span className="text-md font-black text-emerald-600 italic">₹{(vh.totalSales || 0).toLocaleString()}</span></div>
                      <div className="flex justify-between items-center"><span className="text-[10px] font-bold text-gray-400 uppercase">Total Orders</span><span className="text-md font-black text-gray-800">{(vh.orderCount || 0).toLocaleString()}</span></div>
                  </div>
                  <button className="w-full mt-6 py-3 rounded-xl bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest group-hover:bg-slate-600 group-hover:text-white transition-all">Detailed Audit</button>
              </div>
          ))}
      </div>
    </ReportLayout>
  );
}
