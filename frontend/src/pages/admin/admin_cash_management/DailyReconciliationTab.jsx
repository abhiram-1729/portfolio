import React from 'react';
import { 
  User, Eye, Pencil, Trash2, Coins, Smartphone, CreditCard, Zap, BarChart3 
} from 'lucide-react';
import ShiftStatusBadge from './ShiftStatusBadge';

const DailyReconciliationTab = ({ 
  loading, filteredSummaries, storeRegisterData, 
  handleOpenView, handleOpenEdit, setDeletingSummary, setShowDeleteModal, 
  can, setViewingAgentDenoms
}) => {
  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Agent / Vehicle</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500">S1 Open</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-400">S1 Close</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">S2 Open</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-400">S2 Close</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-amber-500">S1 Status</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-indigo-500">S2 Status</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-rose-500">Day Exp.</th>
              <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center text-gray-400 font-bold italic">
                  Loading cash summaries...
                </td>
              </tr>
            ) : filteredSummaries.length === 0 ? (
              <tr>
                <td colSpan="9" className="px-6 py-12 text-center">
                  <Coins size={32} className="mx-auto text-gray-200 mb-2" />
                  <p className="text-sm font-bold text-gray-400">No matching cash records found</p>
                </td>
              </tr>
            ) : (
              filteredSummaries.map((summary) => {
                const s1 = summary.shiftDetails?.shift1;
                const s2 = summary.shiftDetails?.shift2;
                const s1Open = s1?.opening?.totalOpeningCash || 0;
                const s1Close = s1?.closing?.actualCash || s1?.live?.expected || 0;
                const s2Open = s2?.opening?.totalOpeningCash || 0;
                const s2Close = s2?.closing?.actualCash || s2?.live?.expected || 0;
                const agent = summary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');

                return (
                  <tr key={summary.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                          <User size={16} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-gray-900 leading-none">
                            {agent?.name || 'No Agent'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">
                            {summary.vehicle?.vehicleName || summary.vehicle?.vehicleNumber || 'Standard'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-bold ${s1Open > 0 ? 'text-amber-600' : 'text-gray-300'}`}>
                        ₹{s1Open.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {s1?.closing ? (
                        <span className="text-sm font-bold text-amber-700">₹{s1Close.toFixed(2)}</span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-300 uppercase">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-bold ${s2Open > 0 ? 'text-indigo-600' : 'text-gray-300'}`}>
                        ₹{s2Open.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {s2?.closing ? (
                        <span className="text-sm font-bold text-indigo-700">₹{s2Close.toFixed(2)}</span>
                      ) : (
                        <span className="text-[9px] font-bold text-gray-300 uppercase">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div 
                        className={s1?.closing ? "cursor-pointer hover:bg-emerald-50 p-1 rounded-lg transition-all" : ""}
                        onClick={() => s1?.closing && setViewingAgentDenoms({
                          agentName: agent?.name,
                          shift: 1,
                          vehicleInfo: summary.vehicle?.vehicleNumber,
                          denoms: s1?.closing?.denominations || {}
                        })}
                      >
                        <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div 
                        className={s2?.closing ? "cursor-pointer hover:bg-emerald-50 p-1 rounded-lg transition-all" : ""}
                        onClick={() => s2?.closing && setViewingAgentDenoms({
                          agentName: agent?.name,
                          shift: 2,
                          vehicleInfo: summary.vehicle?.vehicleNumber,
                          denoms: s2?.closing?.denominations || {}
                        })}
                      >
                        <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-bold text-rose-500">₹{((s1?.live?.expenses || 0) + (s2?.live?.expenses || 0)).toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-gray-400">
                        <button onClick={() => handleOpenView(summary)} className="p-2 hover:bg-emerald-50 rounded-xl hover:text-emerald-600 transition-all"><Eye size={18} /></button>
                        <>
                          {can('CASH', 'UPDATE', 'RECONCILIATION') && (
                            <button
                              onClick={() => {
                                if (!storeRegisterData?.storeRegister || storeRegisterData.storeRegister.status !== 'OPEN') {
                                  // This toast should be handled by the parent or passed as a prop
                                  handleOpenEdit(summary);
                                } else {
                                  handleOpenEdit(summary);
                                }
                              }}
                              className="p-2 hover:bg-orange-50 rounded-xl hover:text-orange-600 transition-all"
                            >
                              <Pencil size={18} />
                            </button>
                          )}
                          {can('CASH', 'DELETE', 'RECONCILIATION') && (
                            <button onClick={() => { setDeletingSummary(summary); setShowDeleteModal(true); }} className="p-2 hover:bg-rose-50 rounded-xl hover:text-rose-600 transition-all"><Trash2 size={18} /></button>
                          )}
                        </>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-slate-900 border-t border-slate-800">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
            <BarChart3 size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Aggregate Daily Sales Summary (POS)</h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Consolidated revenue across all active vehicles Today</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: 'Total POS Cash', value: filteredSummaries.reduce((sum, s) => sum + (s.dailySales?.totalCash || 0), 0), icon: Coins, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/10' },
            { label: 'Total POS UPI', value: filteredSummaries.reduce((sum, s) => sum + (s.dailySales?.totalUpi || 0), 0), icon: Smartphone, color: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/10' },
            { label: 'Total POS Card', value: filteredSummaries.reduce((sum, s) => sum + (s.dailySales?.totalCard || 0), 0), icon: CreditCard, color: 'text-blue-400', bg: 'bg-blue-500/5', border: 'border-blue-500/10' },
            { label: 'Grand Total Sales', value: filteredSummaries.reduce((sum, s) => sum + (s.dailySales?.grandTotal || 0), 0), icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/10' }
          ].map((stat, idx) => (
            <div key={idx} className={`${stat.bg} ${stat.border} border p-5 rounded-[2rem] transition-all hover:scale-[1.02] cursor-default group`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black tracking-widest uppercase text-slate-500 group-hover:text-slate-400 transition-colors">{stat.label}</p>
                <stat.icon size={16} className={`${stat.color} opacity-50 group-hover:opacity-100 transition-all`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-[12px] font-black ${stat.color} opacity-70`}>₹</span>
                <span className="text-2xl font-black text-white tracking-tight tabular-nums">
                  {stat.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DailyReconciliationTab;
