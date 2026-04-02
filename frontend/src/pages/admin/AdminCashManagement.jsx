import React, { useState, useEffect } from 'react';
import { Coins, Truck, Search, Calendar, CheckCircle2, AlertCircle, Clock, ArrowRight, Eye } from 'lucide-react';
import { getAdminReconciliation } from '../../services/cashService';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function AdminCashManagement() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchSummaries = async () => {
    setLoading(true);
    try {
      const data = await getAdminReconciliation(date);
      setSummaries(data);
    } catch (error) {
      toast.error('Failed to fetch cash summaries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaries();
  }, [date]);

  const stats = {
    totalExpected: summaries.reduce((sum, s) => sum + s.expectedCash, 0),
    totalActual: summaries.reduce((sum, s) => sum + s.actualCash, 0),
    totalDifference: summaries.reduce((sum, s) => sum + s.difference, 0),
    matchedCount: summaries.filter(s => s.status === 'MATCHED').length,
    mismatchCount: summaries.filter(s => s.status === 'MISMATCHED').length,
    pendingCount: summaries.filter(s => s.status === 'PENDING').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900">Cash Management</h2>
          <p className="text-sm text-gray-500">Track and reconcile daily vehicle cash movement</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
          <Calendar size={18} className="text-emerald-500 ml-2" />
          <input 
            type="date" 
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-transparent border-none focus:outline-none text-sm font-bold text-gray-700 pr-2"
          />
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Expected Total', value: `₹${stats.totalExpected.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-white' },
          { label: 'Actual Collected', value: `₹${stats.totalActual.toLocaleString()}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total Diff', value: `₹${stats.totalDifference.toLocaleString()}`, color: stats.totalDifference === 0 ? 'text-gray-400' : 'text-rose-600', bg: 'bg-white' },
          { label: 'Status', value: `${stats.matchedCount} Match / ${stats.mismatchCount} Diff`, color: 'text-orange-600', bg: 'bg-orange-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-4 rounded-2xl border border-gray-100 shadow-sm`}>
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-1">{stat.label}</span>
            <span className={`text-lg font-black ${stat.color}`}>{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'reconciliation' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
        >
          Daily Reconciliation
        </button>
        <button
          onClick={() => setActiveTab('live')}
          className={`px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'live' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
        >
          Live Cash Status
        </button>
      </div>

      {/* Reconciliation Table */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vehicle</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Opening</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Sales</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Expected</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Actual</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Difference</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                    Loading cash summaries...
                  </td>
                </tr>
              ) : summaries.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <Coins size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm font-bold text-gray-400">No cash records found for this date</p>
                  </td>
                </tr>
              ) : (
                summaries.map((summary) => (
                  <tr key={summary.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <Truck size={16} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 leading-none">{summary.vehicle.vehicleNumber}</span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">{summary.vehicle.vehicleName || 'Standard'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-600">₹{summary.openingCash.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">₹{summary.cashSales.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-gray-900 underline decoration-emerald-200 decoration-2 underline-offset-4">₹{summary.expectedCash.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800">₹{summary.actualCash.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      {summary.difference === 0 ? (
                        <span className="text-xs font-bold text-gray-400">-</span>
                      ) : (
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${summary.difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                          {summary.difference > 0 ? `+₹${summary.difference}` : `-₹${Math.abs(summary.difference)}`}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {summary.status === 'MATCHED' ? (
                          <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : summary.status === 'MISMATCHED' ? (
                          <AlertCircle size={14} className="text-rose-500" />
                        ) : (
                          <Clock size={14} className="text-orange-500" />
                        )}
                        <span className={`text-[10px] font-black uppercase tracking-widest ${
                          summary.status === 'MATCHED' ? 'text-emerald-600' : 
                          summary.status === 'MISMATCHED' ? 'text-rose-600' : 'text-orange-600'
                        }`}>
                          {summary.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 transition-all">
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
