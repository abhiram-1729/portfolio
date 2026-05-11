import React, { useState, useEffect } from 'react';
import { IndianRupee, Wallet, TrendingUp, Search, Loader2, ArrowRight, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';

export default function RouteCollectionSection({ storeId }) {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCollections();
  }, [storeId]);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getFinancialReport({ storeId, type: 'collections' });
      // Map dailySheet to collections format
      const data = (res.dailySheet || []).map(item => ({
        agentName: item.user?.name || 'Unknown Agent',
        vehicleNumber: item.vehicle?.vehicleNumber || 'N/A',
        route: item.villageName || 'Active Route',
        expectedCash: item.expectedCash,
        collectedCash: item.actualCash,
        variance: item.difference,
        status: item.status
      }));
      setCollections(data);
    } catch (error) {
      toast.error('Failed to load collection data');
    } finally {
      setLoading(false);
    }
  };

  const q = searchTerm.toLowerCase();
  const filtered = collections.filter(c => 
    c.agentName?.toLowerCase().includes(q) ||
    c.vehicleNumber?.toLowerCase().includes(q) ||
    c.route?.toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Loading Route Collections...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Route Cash Collection</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Daily Reconciliation & Cash Flow</p>
        </div>
        <div className="relative group w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 focus-within:text-emerald-500 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search by agent or route..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filtered.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <Wallet size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No collection records found</p>
          </div>
        ) : (
          filtered.map((record, idx) => (
            <div key={idx} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:border-emerald-200 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                  <IndianRupee size={28} />
                </div>
                <div className="flex flex-col">
                  <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none mb-1">{record.agentName}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded tracking-widest uppercase">{record.vehicleNumber}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">• {record.route || 'Local Route'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Expected Cash</span>
                   <span className="text-lg font-black text-gray-900">₹{record.expectedCash?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Collected</span>
                   <span className="text-lg font-black text-emerald-700">₹{record.collectedCash?.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Variance</span>
                   <span className={`text-lg font-black ${record.variance === 0 ? 'text-gray-400' : 'text-rose-600'}`}>
                      {record.variance > 0 ? `+₹${record.variance}` : `₹${record.variance}`}
                   </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                  <ArrowRight size={20} />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
