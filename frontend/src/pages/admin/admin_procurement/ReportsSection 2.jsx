import React, { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, AlertTriangle, DollarSign, Clock, BarChart3, Loader2, CheckCircle2
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ReportsSection = () => {
  const [activeReport, setActiveReport] = useState('overview');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reports = [
    { key: 'overview', label: 'Overview', icon: TrendingUp },
    { key: 'low-stock', label: 'Low Stock', icon: AlertTriangle },
    { key: 'outstanding', label: 'Outstanding', icon: DollarSign },
    { key: 'aging', label: 'Aging', icon: Clock },
    { key: 'profitability', label: 'Profitability', icon: TrendingUp },
  ];

  const loadReport = useCallback(async (type) => {
    setLoading(true);
    try {
      let data;
      switch (type) {
        case 'overview': {
          const [v, p] = await Promise.all([
            procurementAPI.getVendorReport(),
            procurementAPI.getProfitabilityReport()
          ]);
          data = { vendors: v.data, profitability: p.data };
          break;
        }
        case 'low-stock': {
          const r = await procurementAPI.getLowStockAlert();
          data = r.data;
          break;
        }
        case 'outstanding': {
          const r = await procurementAPI.getOutstandingPayables();
          data = r.data;
          break;
        }
        case 'aging': {
          const r = await procurementAPI.getAgingReport();
          data = r.data;
          break;
        }
        case 'profitability': {
          const r = await procurementAPI.getProfitabilityReport();
          data = r.data;
          break;
        }
        default: break;
      }
      setReportData(data);
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadReport(activeReport); }, [activeReport, loadReport]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {reports.map(r => (
          <button key={r.key} onClick={() => setActiveReport(r.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeReport === r.key ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-100'
            }`}>
            <r.icon size={12} /> {r.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : !reportData ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <BarChart3 size={48} className="mx-auto text-gray-200 mb-3" />
          <h3 className="text-lg font-black text-gray-300">No Data Available</h3>
        </div>
      ) : (
        <>
          {/* Overview Report */}
          {activeReport === 'overview' && reportData.profitability && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Total Purchases', value: `₹${(reportData.profitability.totalPurchases || 0).toLocaleString()}`, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: 'Total Sales', value: `₹${(reportData.profitability.totalSales || 0).toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'Gross Profit', value: `₹${(reportData.profitability.grossProfit || 0).toLocaleString()}`, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Margin %', value: `${reportData.profitability.marginPercent || 0}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
                ].map((stat, i) => (
                  <div key={i} className={`${stat.bg} rounded-2xl p-4 border border-gray-100`}>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{stat.label}</p>
                    <p className={`text-xl font-black ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {reportData.vendors?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Vendors</p>
                    <p className="text-xl font-black text-gray-900">{reportData.vendors.summary.totalVendors}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Active Vendors</p>
                    <p className="text-xl font-black text-emerald-600">{reportData.vendors.summary.activeVendors}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Outstanding</p>
                    <p className="text-xl font-black text-red-600">₹{(reportData.vendors.summary.totalOutstanding || 0).toLocaleString()}</p>
                  </div>
                  <div className="bg-white rounded-2xl p-4 border border-gray-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Advance</p>
                    <p className="text-xl font-black text-blue-600">₹{(reportData.vendors.summary.totalAdvance || 0).toLocaleString()}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Low Stock Report */}
          {activeReport === 'low-stock' && Array.isArray(reportData) && (
            reportData.length === 0 ? (
              <div className="bg-emerald-50 rounded-2xl p-8 text-center border border-emerald-100">
                <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-3" />
                <h3 className="text-lg font-black text-emerald-600">All Stock Levels Healthy</h3>
              </div>
            ) : (
              <div className="space-y-2">
                {reportData.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-red-100 p-4 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-black text-gray-900">{item.product?.name}</span>
                      <p className="text-[10px] font-bold text-gray-400">{item.warehouse?.name}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-red-600">{item.quantity}</span>
                      <p className="text-[9px] font-bold text-red-400">Min: {item.product?.minStockAlert}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Outstanding Report */}
          {activeReport === 'outstanding' && reportData.invoices && (
            <div className="space-y-4">
              {reportData.summary && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Outstanding</p>
                    <p className="text-xl font-black text-red-600">₹{reportData.summary.totalOutstanding.toLocaleString()}</p>
                  </div>
                  <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Overdue Count</p>
                    <p className="text-xl font-black text-orange-600">{reportData.summary.overdueCount}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-2xl p-4 border border-yellow-100">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Overdue Amount</p>
                    <p className="text-xl font-black text-yellow-600">₹{reportData.summary.overdueAmount.toLocaleString()}</p>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {reportData.invoices.map((inv, i) => (
                  <div key={i} className={`bg-white rounded-2xl border ${inv.isOverdue ? 'border-red-200' : 'border-gray-100'} p-4 flex items-center justify-between`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-gray-900">#{inv.invoiceNumber}</span>
                        {inv.isOverdue && <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-red-50 text-red-600">Overdue {inv.daysOverdue}d</span>}
                      </div>
                      <p className="text-[10px] text-gray-400 font-bold">{inv.vendor?.vendorName} • Due: {format(new Date(inv.dueDate), 'dd MMM yyyy')}</p>
                    </div>
                    <span className="text-base font-black text-red-600">₹{inv.outstanding.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Aging Report */}
          {activeReport === 'aging' && typeof reportData === 'object' && !Array.isArray(reportData) && !reportData.invoices && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {Object.entries(reportData).map(([bucket, data]) => (
                <div key={bucket} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{bucket === 'current' ? 'Current' : `${bucket} Days`}</p>
                  <p className="text-xl font-black text-gray-900">₹{(data.amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-gray-400">{data.count || 0} invoices</p>
                </div>
              ))}
            </div>
          )}

          {/* Profitability Report */}
          {activeReport === 'profitability' && reportData.totalSales !== undefined && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Purchases</p>
                <p className="text-2xl font-black text-red-600">₹{reportData.totalPurchases.toLocaleString()}</p>
              </div>
              <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Total Sales</p>
                <p className="text-2xl font-black text-emerald-600">₹{reportData.totalSales.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Gross Profit</p>
                <p className={`text-2xl font-black ${reportData.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>₹{reportData.grossProfit.toLocaleString()}</p>
              </div>
              <div className="bg-purple-50 rounded-2xl p-5 border border-purple-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Margin %</p>
                <p className="text-2xl font-black text-purple-600">{reportData.marginPercent}%</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ReportsSection;
