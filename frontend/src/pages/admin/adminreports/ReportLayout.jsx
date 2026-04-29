import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Printer, Zap } from 'lucide-react';
import { useSearchParams, useLocation } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import StoreSelector from '../StoreSelector';
import { generateReportPDF } from './ReportUtils';

export default function ReportLayout({ title, icon: Icon = BarChart3, children, activeTab, reportData, isLoading, onRefresh }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [stores, setStores] = useState([]);
  const storeFilterId = searchParams.get('storeId');
  const location = useLocation();
  const isTenantRoute = location.pathname.includes('/tenant/');

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
          <div>
            <div className="flex items-center gap-3 mb-1">
               <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-lg shadow-emerald-200"><Icon size={20} strokeWidth={2.5} /></div>
               <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase">{title} <span className="text-emerald-600">REPORT</span></h1>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-1">Enterprise Analytics & Sales Audit Suite</p>
          </div>
          <div className="flex items-center gap-3">
             {isTenantRoute && <div className="w-64"><StoreSelector onSelect={(id) => setSearchParams({ storeId: id })} currentStoreId={storeFilterId} stores={stores} /></div>}
             <button onClick={() => generateReportPDF(activeTab, reportData, false)} disabled={!reportData || isLoading} className="bg-gray-900 text-white px-5 py-3 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"><Download size={16} /> Download</button>
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

        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Zap size={24} className="text-emerald-600 animate-pulse" />
              </div>
            </div>
            <p className="text-emerald-900/40 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Syncing Audit Stream...</p>
          </div>
        ) : children}
      </div>
    </div>
  );
}
