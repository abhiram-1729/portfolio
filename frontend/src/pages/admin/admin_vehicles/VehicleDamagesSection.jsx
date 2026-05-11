import React, { useState, useEffect } from 'react';
import { XCircle, AlertTriangle, Package, Search, Loader2, Camera, Calendar, User, Truck, Activity } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';

export default function VehicleDamagesSection({ storeId }) {
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDamages();
  }, [storeId]);

  const fetchDamages = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getDamageEntries({ storeId });
      setDamages(res.data || []);
    } catch (error) {
      toast.error('Failed to load damage reports');
    } finally {
      setLoading(false);
    }
  };

  const q = searchTerm.toLowerCase();
  const filtered = damages.filter(d => 
    d.product?.name?.toLowerCase().includes(q) ||
    d.vehicle?.vehicleNumber?.toLowerCase().includes(q) ||
    d.reportedBy?.name?.toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Loading Damage Reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Vehicle Damage Reports</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Track Stock Losses & Incidents</p>
        </div>
        <div className="relative group w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 focus-within:text-emerald-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search by product or vehicle..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <XCircle size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No damage reports found</p>
          </div>
        ) : (
          filtered.map((report, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-rose-200 transition-all flex flex-col gap-5 group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    {report.product?.image ? <img src={report.product.image} className="w-full h-full object-cover rounded-xl" /> : <Package size={20} />}
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 tracking-tight leading-none">{report.product?.name}</h4>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{report.product?.category?.name || 'General'}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="px-2 py-1 bg-rose-50 text-rose-600 text-[9px] font-black uppercase tracking-widest rounded-lg border border-rose-100">
                    {report.quantity} Units
                  </span>
                  <span className="text-[10px] font-black text-rose-700">₹{report.totalLoss?.toFixed(2)}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-transparent group-hover:border-rose-100 transition-all space-y-3">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                   <div className="flex items-center gap-2 text-gray-400">
                      <Truck size={12} /> <span>Vehicle</span>
                   </div>
                   <span className="text-gray-900">{report.vehicle?.vehicleNumber || 'Store Stock'}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                   <div className="flex items-center gap-2 text-gray-400">
                      <User size={12} /> <span>Reported By</span>
                   </div>
                   <span className="text-gray-900">{report.reportedBy?.name}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest pt-2 border-t border-gray-100">
                   <div className="flex items-center gap-2 text-gray-400">
                      <Activity size={12} /> <span>Status</span>
                   </div>
                   <span className={`px-2 py-0.5 rounded-md ${report.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : report.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                     {report.status}
                   </span>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                 <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">Reason / Description</span>
                 <p className="text-xs font-medium text-gray-600 line-clamp-2 bg-gray-50/50 p-3 rounded-xl border border-gray-50 italic">
                    "{report.description || 'No description provided'}"
                 </p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <button className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline transition-all">
                  <Camera size={12} /> View Photos
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
