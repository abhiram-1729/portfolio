import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, Zap, ChevronLeft, Building2, ChevronRight, RotateCcw } from 'lucide-react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import { generateReportPDF, exportReportToExcel } from './ReportUtils';
import { useUserStore } from '../../../store/userStore';

import StoreSelector from '../StoreSelector';

export default function ReportLayout({ title, icon: Icon = BarChart3, children, activeTab, reportData, isLoading, onRefresh }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState([]);
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const navigate = useNavigate();
  const user = useUserStore(s => s.user);
  const isGlobalRole = user?.role === 'TENANT_OWNER' || user?.role === 'SUPER_ADMIN' || (user?.role === 'ADMIN' && !user?.customRoleId) || user?.portalType === 'ADMIN';
  const hasStore = storeFilterId && storeFilterId !== 'null' && storeFilterId !== 'undefined';

  useEffect(() => {
    const loadStores = async () => {
      try {
        const { data } = await adminAPI.getStores();
        if (data?.success) setStores(data.data);
      } catch (err) {}
    };
    loadStores();
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFDFD] pb-20">
      <div className="bg-white border-b border-gray-100 sticky top-[64px] z-40 backdrop-blur-md bg-opacity-80">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (hasStore && stores.length > 1) {
                    setSearchParams({});
                  } else {
                    navigate('/admin/reports');
                  }
                }}
                className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-90"
                title={hasStore && stores.length > 1 ? "Back to Branch Selection" : "Back to Reports Hub"}
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-3">
                 <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200"><Icon size={20} strokeWidth={2.5} /></div>
                 <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{title} <span className="text-emerald-600">REPORT</span></h1>
              </div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-14">Enterprise Analytics & Sales Audit Suite</p>
          </div>
           <div className="flex flex-wrap items-center gap-3">
              {stores.length > 1 && (
                <select
                  value={storeFilterId || ''}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSearchParams({ storeId: e.target.value });
                    } else {
                      setSearchParams({});
                    }
                  }}
                  className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest pl-3 pr-7 py-2 rounded-xl border-none outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer shadow-sm"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23047857' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M5.25 7.5L10 12.25L14.75 7.5'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.35rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.1rem'
                  }}
                >
                  <option value="">All Branches</option>
                  {stores.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
              <button onClick={() => exportReportToExcel(activeTab, reportData)} disabled={!reportData || isLoading} className="bg-white text-emerald-600 border border-emerald-100 px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-50 hover:bg-emerald-50 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"><Download size={16} /> Excel</button>
              <button onClick={() => generateReportPDF(activeTab, reportData, false)} disabled={!reportData || isLoading} className="bg-gray-900 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"><Download size={16} /> PDF</button>
              <button onClick={() => generateReportPDF(activeTab, reportData, true)} disabled={!reportData || isLoading} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"><Printer size={16} /> Print</button>
           </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 pt-32 pb-10">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase mb-2">{title}</h2>
            <div className="h-1.5 w-20 bg-emerald-600 rounded-full" />
          </div>
        </div>

        {isGlobalRole && !hasStore ? (
          <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col gap-1">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Organizational Analytics</h2>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-widest italic">Select a branch to view detailed {title.toLowerCase()} reports</p>
            </div>

            <div className="grid grid-cols-1 gap-4 max-w-5xl">
              {stores.map(store => (
                <div 
                  key={store.id}
                  onClick={() => setSearchParams({ storeId: store.id })}
                  className="group bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:shadow-emerald-500/10 hover:border-emerald-100 transition-all cursor-pointer relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Icon size={120} />
                  </div>

                  <div className="relative z-10 flex items-center justify-between gap-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500 shrink-0">
                        <Building2 size={32} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight group-hover:text-emerald-600 transition-colors">{store.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black px-2.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md uppercase tracking-widest">
                            {store.code || 'BRANCH'}
                          </span>
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-tighter flex items-center gap-1.5">
                            • {store.address || 'Location Unspecified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-12">
                      <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center opacity-40 group-hover:opacity-100 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <ChevronRight size={24} strokeWidth={3} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={24} className="text-emerald-600 animate-pulse" />
              </div>
            </div>
            <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing Audit Stream...</p>
          </div>
        ) : (
          <div key={storeFilterId} className="animate-in fade-in duration-500">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
