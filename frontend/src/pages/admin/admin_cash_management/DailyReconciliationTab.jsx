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
    <div className="space-y-8">
      {/* Table Section */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-50">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Agent / Vehicle</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">S1 Open</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">S1 Close</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">S2 Open</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">S2 Close</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">S1 Status</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">S2 Status</th>
                <th className="px-4 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Day Exp.</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Scanning Records...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Coins size={40} className="text-gray-100" />
                      <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No matching records found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((summary) => {
                  const s1 = summary.shiftDetails?.shift1;
                  const s2 = summary.shiftDetails?.shift2;
                  const s1Open = s1?.opening?.totalOpeningCash || 0;
                  const s1Close = s1?.closing?.actualCash || 0;
                  const s2Open = s2?.opening?.totalOpeningCash || 0;
                  const s2Close = s2?.closing?.actualCash || 0;
                  const agent = summary.vehicle?.assignedUsers?.find(u => u.role === 'SALES_AGENT');

                  return (
                    <tr key={summary.id} className="hover:bg-gray-50/50 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                            <User size={18} strokeWidth={2.5} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                              {agent?.name || 'Unassigned'}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                              {summary.vehicle?.vehicleName || summary.vehicle?.vehicleNumber || 'Standard'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 font-bold text-gray-900">₹{s1Open.toLocaleString()}</td>
                      <td className="px-4 py-5 font-bold text-gray-900">₹{s1Close.toLocaleString()}</td>
                      <td className="px-4 py-5 font-bold text-gray-900">₹{s2Open.toLocaleString()}</td>
                      <td className="px-4 py-5 font-bold text-gray-900">₹{s2Close.toLocaleString()}</td>
                      <td className="px-4 py-5">
                        <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
                      </td>
                      <td className="px-4 py-5">
                        <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
                      </td>
                      <td className="px-4 py-5 font-black text-rose-500">
                        ₹{((s1?.live?.expenses || 0) + (s2?.live?.expenses || 0)).toLocaleString()}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => handleOpenView(summary)} className="p-2.5 hover:bg-white rounded-xl hover:text-emerald-600 shadow-sm transition-all" title="View Details"><Eye size={16} /></button>
                          {can('CASH', 'UPDATE', 'RECONCILIATION') && (
                            <button onClick={() => handleOpenEdit(summary)} className="p-2.5 hover:bg-white rounded-xl hover:text-amber-600 shadow-sm transition-all" title="Edit Float"><Pencil size={16} /></button>
                          )}
                          {can('CASH', 'DELETE', 'RECONCILIATION') && (
                            <button onClick={() => { setDeletingSummary(summary); setShowDeleteModal(true); }} className="p-2.5 hover:bg-white rounded-xl hover:text-rose-600 shadow-sm transition-all" title="Delete Record"><Trash2 size={16} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aggregate Sales Summary Section - Perfectly Matched to Screenshot */}
      {can('CASH', 'READ', 'AGGREGATE_SUMMARY') && (
        <div className="pt-10 border-t border-gray-100">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-[14px] font-black text-gray-900 uppercase tracking-tight">Aggregate Daily Sales Summary (POS)</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1">Consolidated revenue across all active vehicles Today</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {(() => {
              const totals = filteredSummaries.reduce((acc, s) => {
                const s1 = s.shiftDetails?.shift1?.live || {};
                const s2 = s.shiftDetails?.shift2?.live || {};

                acc.cash += (s1.cashSales || 0) + (s2.cashSales || 0);
                acc.upi += (s1.upiSales || 0) + (s2.upiSales || 0);
                acc.card += (s1.cardSales || 0) + (s2.cardSales || 0);
                acc.expenses += (s1.expenses || 0) + (s2.expenses || 0);
                return acc;
              }, { cash: 0, upi: 0, card: 0, expenses: 0 });

              const grandTotal = totals.cash + totals.upi + totals.card;

              return [
                { label: 'TOTAL POS CASH', value: totals.cash, icon: Coins, color: 'text-emerald-600' },
                { label: 'TOTAL POS UPI', value: totals.upi, icon: Smartphone, color: 'text-emerald-600' },
                { label: 'TOTAL POS CARD', value: totals.card, icon: CreditCard, color: 'text-emerald-600' },
                { label: 'GRAND TOTAL SALES', value: grandTotal, icon: Zap, color: 'text-emerald-600' },
                { label: 'EXPENSES', value: totals.expenses, icon: Coins, color: 'text-emerald-600' }
              ].map((stat, idx) => (
                <div key={idx} className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[1.5rem] transition-all hover:shadow-md cursor-default group">
                  <div className="flex items-center gap-2.5 mb-4">
                    <stat.icon size={16} className={stat.color} />
                    <p className="text-[10px] font-black tracking-widest uppercase text-emerald-700/70">{stat.label}</p>
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-2xl font-black text-gray-900 tabular-nums">
                      ₹{stat.value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyReconciliationTab;
