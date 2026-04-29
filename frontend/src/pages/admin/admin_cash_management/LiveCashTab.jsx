import React from 'react';
import { Truck, ArrowRight } from 'lucide-react';

const LiveCashTab = ({ filteredSummaries, handleOpenView }) => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-emerald-50/50 border-b border-emerald-100">
              <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Vehicle / Agent</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600">Active Status</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-600 font-bold">Total Sales</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-500">Cash Sales</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-orange-500">UPI Sales</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-blue-500">Card Sales</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-rose-500">Live Exp.</th>
              <th className="px-4 py-5 text-[10px] font-black uppercase tracking-widest text-emerald-700">In-Hand Cash</th>
              <th className="px-5 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredSummaries.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-400 font-bold">No active vehicles found</td>
              </tr>
            ) : (
              filteredSummaries.map((summary) => {
                const s1 = summary.shiftDetails?.shift1;
                const s2 = summary.shiftDetails?.shift2;
                const activeShift = s2?.opening && !s2?.closing ? 2 : (s1?.opening && !s1?.closing ? 1 : null);
                const metrics = activeShift === 2 ? s2.live : (activeShift === 1 ? s1.live : null);
                const agent = summary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');

                return (
                  <tr key={summary.id} className="hover:bg-emerald-50/20 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:shadow-sm transition-all">
                          <Truck size={18} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 leading-none">{summary.vehicle.vehicleNumber}</span>
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 group-hover:text-emerald-600 transition-colors">{agent?.name || 'No Agent'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {activeShift ? (
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                          </div>
                          <span className="text-[10px] font-black text-emerald-700 uppercase">Live — Shift {activeShift}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-gray-400 uppercase">Closed / Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-black text-gray-900 leading-none">₹{summary.dailySales.grandTotal.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-emerald-600">₹{summary.dailySales.totalCash.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-orange-600">₹{summary.dailySales.totalUpi.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-blue-600">₹{summary.dailySales.totalCard.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-rose-500">₹{(metrics?.expenses || 0).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="bg-emerald-100/50 px-3 py-1.5 rounded-lg w-fit border border-emerald-200/50">
                        <span className="text-sm font-black text-emerald-700">₹{(metrics?.expected || 0).toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => handleOpenView(summary)}
                        className="p-2 hover:bg-white hover:shadow-sm rounded-xl text-gray-400 hover:text-emerald-600 transition-all"
                      >
                        <ArrowRight size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LiveCashTab;
