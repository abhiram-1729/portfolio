import React, { useState, useEffect } from 'react';
import { Building2, ChevronRight, Wallet, Users, Clock, AlertCircle, Loader2 } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import { getAdminReconciliation } from '../../../services/cashService';
import { format } from 'date-fns';

export default function BranchCashOverview({ onSelect }) {
  const [stores, setStores] = useState([]);
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const date = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [storesRes, summariesRes] = await Promise.all([
          adminAPI.getStores(),
          getAdminReconciliation(date)
        ]);

        if (storesRes.data?.success) {
          setStores(storesRes.data.data);
        } else {
          setStores(storesRes.data || []);
        }
        setSummaries(summariesRes || []);
      } catch (error) {
        console.error('Error fetching overview data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={32} />
        <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-widest mt-2">Initializing Cash Dashboard...</p>
      </div>
    );
  }

  const statsByStore = summaries.branchStats || {};

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
          <Wallet size={30} strokeWidth={2.5} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Cash Management</h2>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-0.5 italic">Multi-branch financial operations & safe reconciliations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 max-w-5xl">
        <div className="mb-2">
          <h3 className="text-xl font-black tracking-tight text-gray-900">Branch Cash Overview</h3>
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase mt-1 italic">Real-time safe status and shift monitoring across all retail branches</p>
        </div>

        {stores.map(store => {
          const stats = statsByStore[store.id] || { active: 0, pending: 0, total: 0 };
          
          return (
            <button
              key={store.id}
              onClick={() => onSelect(store.id)}
              className="group w-full bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all duration-500 flex items-center justify-between gap-6 relative overflow-hidden"
            >
              <div className="absolute left-0 top-0 w-2 h-full bg-emerald-500/10 group-hover:bg-emerald-600 transition-all duration-500" />
              
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shrink-0">
                  <Building2 size={32} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col text-left">
                  <h4 className="text-xl font-black text-gray-900 tracking-tight leading-none mb-2">{store.name}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md tracking-widest uppercase">{store.code || 'Branch'}</span>
                    {store.address && <span className="text-xs font-bold text-gray-400 truncate max-w-[200px]">• {store.address}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-12">
                <div className="hidden md:flex items-center gap-10">
                  <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Active Shifts</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black ${stats.active > 0 ? 'text-blue-600' : 'text-gray-400'}`}>{stats.active}</span>
                      <Users size={16} className={stats.active > 0 ? 'text-blue-400' : 'text-gray-200'} />
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end border-l border-gray-100 pl-10">
                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Pending Review</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xl font-black ${stats.pending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{stats.pending}</span>
                      <Clock size={16} className={stats.pending > 0 ? 'text-amber-400' : 'text-gray-200'} />
                    </div>
                  </div>
                </div>

                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:scale-110 transition-all duration-500 shadow-inner shrink-0">
                  <ChevronRight size={24} strokeWidth={3} />
                </div>
              </div>
            </button>
          );
        })}

        {stores.length === 0 && (
          <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
            <AlertCircle size={48} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-xl font-black text-gray-900">No Branches Found</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Initialize your first store branch in settings</p>
          </div>
        )}
      </div>
    </div>
  );
}
