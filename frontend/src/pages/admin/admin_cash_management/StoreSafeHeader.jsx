import React, { useState } from 'react';
import { 
  Coins, AlertTriangle, User, CheckCircle2, Plus, Vault, Building2, Moon, 
  Pencil, ShoppingCart, Clock, Smartphone, Zap, ArrowRight, AlertCircle,
  FileText, Download, Printer, Loader2, Calendar, ArrowLeft
} from 'lucide-react';

const StoreSafeHeader = ({ 
  storeRegisterData, summaries, user, storeLoading, posHistory,
  handleExportPDF,
  setShowOpenStoreModal, setShowDepositModal, setShowSafeMovementModal, 
  setShowBankModal, setShowCloseStoreModal, setShowEditStoreModal,
  setSafeMovementData, setBankData, setStoreDenomData,
  isShiftDeposited, setActiveTab,
  setEditingDeposit, setDepositData, setShowEditDepositModal,
  handleDeleteDeposit, toast, can, canViewCashSection,
  headerTab, setHeaderTab, availableHeaderTabs
}) => {
  const [showFullReport, setShowFullReport] = useState(false);

  if (storeLoading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm animate-pulse mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gray-100" />
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-100 rounded" />
              <div className="h-3 w-48 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-40 bg-gray-100 rounded-2xl" />
            <div className="h-12 w-40 bg-gray-100 rounded-2xl" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-50 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm mb-8 relative overflow-hidden group">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#459675] flex items-center justify-center text-white shadow-lg shadow-[#459675]/20">
            <Coins size={32} strokeWidth={2} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tight">Store Cash</h2>
            <div className="flex items-center gap-3 mt-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">
                  {storeRegisterData?.storeRegister?.status === 'OPEN' ? 'Active' : 'Closed'}
                </span>
              </div>
              <span className="text-gray-200">•</span>
              {storeRegisterData?.storeRegister?.openedBy && (
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  Opened by {storeRegisterData.storeRegister.openedBy.name}
                  <span className="text-gray-200 mx-1">•</span>
                  Opening: ₹{storeRegisterData.storeRegister.openingCash?.toLocaleString()}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {storeRegisterData?.storeRegister?.status === 'OPEN' && (
            <>
              {canViewCashSection('SHIFT_DEPOSITS') && (
                <button
                  onClick={() => setShowDepositModal(true)}
                  className="min-w-[220px] bg-[#f3c455] hover:bg-[#e6b84d] text-[#1a1a1a] px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/10 active:scale-95 flex items-center justify-center text-center"
                >
                  Deposit Shift Cash
                </button>
              )}
              {canViewCashSection('STORE_CLOSURE') && (
                <button
                  onClick={() => setShowCloseStoreModal(true)}
                  className="min-w-[220px] bg-[#d74453] hover:bg-[#c53a47] text-white px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-rose-500/10 active:scale-95 flex items-center justify-center text-center"
                >
                  Closing Store
                </button>
              )}
            </>
          )}
          {storeRegisterData?.storeRegister?.status !== 'OPEN' && canViewCashSection('CASH_OPENING') && (
             <button
                onClick={() => setShowOpenStoreModal(true)}
                className="min-w-[220px] bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-95 flex items-center justify-center text-center"
              >
                Open Store Register
              </button>
          )}
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="flex gap-2 bg-gray-100/50 p-1.5 rounded-2xl w-fit mb-12 border border-gray-100">
        {availableHeaderTabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setHeaderTab(t.key)}
            className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${headerTab === t.key ? 'bg-white text-[#459675] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {t.key}
          </button>
        ))}
      </div>

      {/* Main Content Area based on Tab */}
      <div className="space-y-0">
        {headerTab === 'OPENING' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-emerald-50/20 border border-emerald-100 p-8 rounded-[2.5rem] group relative">
              <p className="text-[11px] font-black tracking-widest uppercase text-emerald-600/60 mb-4">Opening Cash</p>
              <p className="text-4xl font-black text-gray-900">₹{Math.abs(storeRegisterData?.storeRegister?.openingCash || 0).toLocaleString()}</p>
            </div>
            <div className="bg-sky-50/20 border border-sky-100 p-8 rounded-[2.5rem]">
              <p className="text-[11px] font-black tracking-widest uppercase text-sky-600/60 mb-4">Counter Cash (Available)</p>
              <p className="text-4xl font-black text-gray-900">₹{Math.abs(storeRegisterData?.liveMetrics?.availableCash || 0).toLocaleString()}</p>
            </div>
            <div className="bg-rose-50/20 border border-rose-100 p-8 rounded-[2.5rem]">
              <p className="text-[11px] font-black tracking-widest uppercase text-rose-600/60 mb-4">Bank Transfer</p>
              <p className="text-4xl font-black text-gray-900">₹{Math.abs(storeRegisterData?.liveMetrics?.bankTransferred || 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {headerTab === 'AGENT' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-amber-50/30 border border-amber-100 p-10 rounded-[2.5rem]">
              <p className="text-[11px] font-black tracking-widest uppercase text-amber-600/60 mb-4">Agent Outflow</p>
              <p className="text-4xl font-black text-gray-900">-₹{Math.abs(storeRegisterData?.liveMetrics?.assignedOut || 0).toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50/30 border border-emerald-100 p-10 rounded-[2.5rem]">
              <p className="text-[11px] font-black tracking-widest uppercase text-emerald-600/60 mb-4">Agent Inflow</p>
              <p className="text-4xl font-black text-gray-900">+₹{Math.abs(storeRegisterData?.liveMetrics?.receivedIn || 0).toLocaleString()}</p>
            </div>
          </div>
        )}

        {headerTab === 'SAFE' && (
          <div className="animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#459675] text-white flex items-center justify-center">
                  <Vault size={20} strokeWidth={2} />
                </div>
                <h3 className="text-[13px] font-black text-[#459675] uppercase tracking-[0.1em]">Store Chest(Safe)</h3>
              </div>
              <span className="bg-[#f2f7f5] text-[#459675] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-emerald-50">Secure</span>
            </div>

            <div className="space-y-0 mb-10">
              <div className="flex items-center justify-between py-6 border-b border-gray-100">
                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Safe Balance</span>
                <span className="text-[16px] font-black text-gray-900 tabular-nums">₹{Math.abs(storeRegisterData?.liveMetrics?.safeBalance || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center justify-between py-6 border-b border-gray-100">
                <span className="text-[12px] font-black text-gray-400 uppercase tracking-widest">Counter Cash (Available)</span>
                <span className="text-[16px] font-black text-gray-900 tabular-nums">₹{Math.abs(storeRegisterData?.liveMetrics?.availableCash || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
              <div className="flex items-center justify-between py-6">
                <span className="text-[14px] font-black text-[#459675] uppercase tracking-[0.1em]">Total Cash</span>
                <span className="text-[18px] font-black text-[#459675] tabular-nums">₹{( (storeRegisterData?.liveMetrics?.safeBalance || 0) + (storeRegisterData?.liveMetrics?.availableCash || 0) ).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {can('CASH', 'CREATE', 'SAFE_CONTROL') && (
                <button 
                  onClick={() => {
                    setSafeMovementData({ amount: '', type: 'DEPOSIT', description: '', denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 } });
                    setShowSafeMovementModal(true);
                  }}
                  className="bg-[#459675] hover:bg-[#3b8064] text-white py-6 rounded-2xl text-[14px] font-black uppercase tracking-[0.1em] transition-all shadow-xl shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-3"
                >
                  Move to Safe
                </button>
              )}
              {can('CASH', 'CREATE', 'SAFE_CONTROL') && (
                <button 
                  onClick={() => {
                    setBankData(prev => ({ ...prev, adminId: user?.id, depositedBy: user?.name || '' }));
                    setShowBankModal(true);
                  }}
                  className="bg-[#459675] hover:bg-[#3b8064] text-white py-6 rounded-2xl text-[14px] font-black uppercase tracking-[0.1em] transition-all shadow-xl shadow-emerald-500/10 active:scale-95 flex items-center justify-center gap-3"
                >
                  Account Transfer
                </button>
              )}
            </div>
          </div>
        )}

        {headerTab === 'POS HISTORY' && (
          <div className="animate-in fade-in duration-500 space-y-8">
            {!showFullReport ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">History Tracking</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-1 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all focus-within:ring-4 focus-within:ring-emerald-500/5">
                      <Calendar size={16} className="text-emerald-500" />
                      <input 
                        type="date" 
                        className="bg-transparent border-none p-0 py-2 text-xs font-black text-gray-700 outline-none cursor-pointer uppercase tracking-widest"
                      />
                    </div>
                    <button 
                      onClick={() => setShowFullReport(true)}
                      className="text-emerald-600 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 hover:gap-2 transition-all"
                    >
                      View full report <ArrowRight size={14} />
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-50">
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Date</th>
                          <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total POS Cash</th>
                          <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total POS UPI</th>
                          <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total POS Card</th>
                          <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Grand Total Sales</th>
                          <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Comments</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {posHistory.length > 0 ? (
                          posHistory.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                              <td className="px-8 py-6 text-sm font-black text-gray-900">{format(new Date(row.date), 'dd-MM-yyyy')}</td>
                              <td className="px-6 py-6 text-sm font-bold text-gray-700">₹{(row.totalCash || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="px-6 py-6 text-sm font-bold text-gray-700">₹{(row.totalUpi || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="px-6 py-6 text-sm font-bold text-gray-700">₹{(row.totalCard || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="px-6 py-6 text-sm font-black text-emerald-600">₹{(row.grandTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                              <td className="px-8 py-6 text-xs font-bold text-gray-400 italic">“{row.remark || 'No comments'}”</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-8 py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                              No history available for this period
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-in slide-in-from-right-8 duration-500 space-y-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <button 
                      onClick={() => setShowFullReport(false)}
                      className="p-3 bg-gray-100 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-2xl transition-all"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    <div>
                      <h1 className="text-4xl font-black text-gray-900 tracking-tight">Full Report</h1>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-2">Billing Operator View</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-6 py-3.5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                      <Calendar size={18} className="text-emerald-500" />
                      <span className="text-xs font-black text-gray-700 uppercase tracking-widest">Date</span>
                    </div>
                    <button 
                      onClick={() => handleExportPDF && handleExportPDF()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/10 active:scale-95"
                    >
                      Download Report
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Date</th>
                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Total POS Cash</th>
                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Total POS UPI</th>
                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Total POS Card</th>
                        <th className="px-8 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Grand Total Sales</th>
                        <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.2em] text-gray-400">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {posHistory.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-10 py-8 text-sm font-black text-gray-900">{format(new Date(row.date), 'dd-MM-yyyy')}</td>
                          <td className="px-8 py-8 text-sm font-bold text-gray-700">₹{(row.totalCash || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-8 py-8 text-sm font-bold text-gray-700">₹{(row.totalUpi || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-8 py-8 text-sm font-bold text-gray-700">₹{(row.totalCard || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-8 py-8 text-sm font-black text-emerald-600">₹{(row.grandTotal || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="px-10 py-8 text-xs font-bold text-gray-400 italic">“{row.remark || 'All clear'}”</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Today's Shift Safekeeping Section */}
      {canViewCashSection('SHIFT_SAFEKEEPING') && (
        <div className="pt-8 border-t border-gray-50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
              <Clock size={14} className="text-gray-300" /> Today's Shift Safekeeping
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2].map(shiftNum => {
              const depositRecord = storeRegisterData.storeDeposits?.find(d => d.shift === shiftNum);
              const expectedAmount = storeRegisterData.shiftCollections?.find(c => c.shift === shiftNum)?._sum.actualCash || 0;
              const isMismatched = depositRecord && Math.abs(depositRecord.amount - expectedAmount) > 0.1;

              return (
                <div 
                  key={shiftNum} 
                  className={`p-6 rounded-[2rem] border transition-all flex items-center justify-between group ${depositRecord
                    ? (isMismatched ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100')
                    : (expectedAmount > 0 ? 'bg-gray-50 border-gray-100 border-dashed border-2' : 'bg-gray-50 border-gray-100 opacity-40')
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg ${depositRecord ? 'bg-white text-emerald-600 shadow-sm' : 'bg-white/50 text-gray-400'}`}>
                      S{shiftNum}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-black text-gray-900">₹{(depositRecord?.amount || expectedAmount).toLocaleString()}</p>
                        {isMismatched && <span className="bg-rose-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Mismatch</span>}
                      </div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">
                        {depositRecord ? (depositRecord.description || `Consolidated deposit S${shiftNum}`) : (expectedAmount > 0 ? 'Pending Deposit' : 'No collection report')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {depositRecord ? (
                      <div className="bg-emerald-100 text-emerald-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <CheckCircle2 size={12} /> Deposited
                      </div>
                    ) : expectedAmount > 0 ? (
                      <div className="bg-amber-100 text-amber-600 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Clock size={12} /> Pending
                      </div>
                    ) : null}
                    
                    <div className="flex opacity-0 group-hover:opacity-100 transition-all">
                      {depositRecord && can('CASH', 'UPDATE', 'SHIFT_DEPOSITS') && (
                        <button 
                          onClick={() => {
                            setEditingDeposit(depositRecord);
                            setDepositData({
                              shift: depositRecord.shift,
                              description: depositRecord.description,
                              amount: depositRecord.amount,
                              denominations: depositRecord.denominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                            });
                            setShowEditDepositModal(true);
                          }}
                          className="p-2.5 text-gray-400 hover:text-emerald-600 transition-all"
                        >
                          <Pencil size={16} />
                        </button>
                      )}
                      {depositRecord && can('CASH', 'DELETE', 'SHIFT_DEPOSITS') && (
                        <button onClick={() => handleDeleteDeposit(depositRecord.id)} className="p-2.5 text-gray-400 hover:text-rose-600 transition-all">
                          <AlertCircle size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreSafeHeader;
