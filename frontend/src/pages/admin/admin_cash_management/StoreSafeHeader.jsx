import React from 'react';
import { 
  Coins, AlertTriangle, User, CheckCircle2, Plus, Vault, Building2, Moon, 
  Pencil, ShoppingCart, Clock, Smartphone, Zap, ArrowRight, AlertCircle 
} from 'lucide-react';

const StoreSafeHeader = ({ 
  storeRegisterData, summaries, user, 
  setShowOpenStoreModal, setShowDepositModal, setShowSafeMovementModal, 
  setShowBankModal, setShowCloseStoreModal, setShowEditStoreModal,
  setSafeMovementData, setBankData, setStoreDenomData,
  isShiftDeposited, setActiveTab,
  setEditingDeposit, setDepositData, setShowEditDepositModal,
  handleDeleteDeposit, toast, can
}) => {
  return (
    <div className="bg-emerald-900 rounded-[2.5rem] p-6 shadow-xl mb-6 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
        <Coins size={120} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white ${storeRegisterData?.storeRegister?.status === 'OPEN' ? 'bg-emerald-600 shadow-lg shadow-emerald-900/50' : 'bg-gray-800'}`}>
            <Coins size={28} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">Store Cash</h2>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                {storeRegisterData?.storeRegister?.status === 'OPEN'
                  ? (
                    <div className="flex flex-col gap-2">
                      <span className="flex items-center gap-2">
                        <span className="bg-emerald-500 w-1.5 h-1.5 rounded-full animate-pulse" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Active • Opening: ₹{storeRegisterData.storeRegister.openingCash?.toLocaleString()}</span>
                      </span>

                      {storeRegisterData.previousRegister && Math.abs(storeRegisterData.storeRegister.openingCash - storeRegisterData.previousRegister.actualClosingCash) > 0.01 && (
                        <div className="px-3 py-2 bg-rose-500/20 border border-rose-500/40 rounded-xl flex items-center gap-2.5 animate-pulse">
                          <AlertTriangle size={14} className="text-rose-400" />
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-rose-300 uppercase tracking-widest">Opening Mismatch Alert</span>
                            <span className="text-[10px] font-bold text-white leading-tight">
                              Started with ₹{(storeRegisterData.storeRegister.openingCash - storeRegisterData.previousRegister.actualClosingCash).toFixed(2)} {storeRegisterData.storeRegister.openingCash < storeRegisterData.previousRegister.actualClosingCash ? 'less' : 'more'} than yesterday's close
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                  : storeRegisterData?.storeRegister?.status === 'CLOSED'
                    ? (
                      <div className="flex flex-col gap-1.5 mt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Closed on {storeRegisterData.storeRegister.date}</span>
                          {storeRegisterData.storeRegister.closingDifference === 0 ? (
                            <span className="bg-emerald-400/20 text-emerald-300 text-[8px] font-black px-2 py-0.5 rounded border border-emerald-400/30 uppercase">Status: Balanced</span>
                          ) : (
                            <span className={`${storeRegisterData.storeRegister.closingDifference < 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/50' : 'bg-amber-500/20 text-amber-300 border-amber-500/50'} text-[8px] font-black px-2 py-0.5 rounded border uppercase`}>
                              Status: {storeRegisterData.storeRegister.closingDifference < 0 ? 'Shortage' : 'Surplus'}
                            </span>
                          )}
                        </div>

                        {storeRegisterData.storeRegister.closingDifference !== 0 && (
                          <div className={`mt-1 px-4 py-3 rounded-2xl flex items-center gap-4 border shadow-2xl animate-bounce ${storeRegisterData.storeRegister.closingDifference < 0
                            ? 'bg-rose-600 border-rose-400 text-white'
                            : 'bg-amber-500 border-amber-300 text-white'
                            }`}>
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <AlertTriangle size={24} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-[0.1em] opacity-80">Variance Detected</p>
                              <p className="text-lg font-black leading-none">
                                {storeRegisterData.storeRegister.closingDifference < 0 ? '-' : '+'} ₹{Math.abs(storeRegisterData.storeRegister.closingDifference).toFixed(2)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                    : 'Awaiting Daily Initialization'}
              </div>
              {storeRegisterData?.storeRegister?.openedBy && (
                <p className="text-[8px] font-black text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                  <User size={8} /> Opened By {storeRegisterData.storeRegister.openedBy.name}
                  {storeRegisterData?.storeRegister?.closedBy && (
                    <>
                      <span className="opacity-20">|</span>
                      <CheckCircle2 size={8} /> Closed By {storeRegisterData.storeRegister.closedBy.name}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!storeRegisterData?.storeRegister ? (
            can('CASH', 'CREATE') && (
              <button
                onClick={() => setShowOpenStoreModal(true)}
                className="bg-white hover:bg-emerald-50 text-emerald-950 px-8 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95 border-b-4 border-emerald-100"
              >
                Initialize Store Safe
              </button>
            )
          ) : storeRegisterData.storeRegister.status === 'OPEN' ? (
            <div className="flex items-center gap-3">
              {can('CASH', 'UPDATE') && (
                <div className="flex flex-col gap-1.5">
                  <button
                    onClick={() => {
                      const hasSubmissions = summaries.some(s => s.shiftDetails?.shift1?.closing || s.shiftDetails?.shift2?.closing);
                      if (!hasSubmissions) {
                        return toast.error('No agent has completed their shift yet. Shifts must be closed by agents before depositing cash.');
                      }
                      setShowDepositModal(true);
                    }}
                    className="bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-amber-950 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-950/20 active:scale-95 flex items-center gap-2"
                  >
                    <Plus size={16} strokeWidth={3} />
                    Deposit Shift Cash
                  </button>
                  <div className="flex items-center justify-around px-2">
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isShiftDeposited(1) ? 'bg-emerald-500' : 'bg-white/20'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${isShiftDeposited(1) ? 'text-emerald-400' : 'text-white/40'}`}>S1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${isShiftDeposited(2) ? 'bg-emerald-500' : 'bg-white/20'}`} />
                      <span className={`text-[8px] font-black uppercase tracking-widest ${isShiftDeposited(2) ? 'text-emerald-400' : 'text-white/40'}`}>S2</span>
                    </div>
                  </div>
                </div>
              )}

              {can('CASH', 'UPDATE') && (
                <button
                  onClick={() => {
                    setSafeMovementData(prev => ({ ...prev, type: 'DEPOSIT', amount: 0, denominations: { 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 } }));
                    setShowSafeMovementModal(true);
                  }}
                  className="bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm"
                >
                  <Vault size={16} strokeWidth={3} />
                  Move to Safe
                </button>
              )}

              {can('CASH', 'UPDATE') && (
                <button
                  onClick={() => {
                    setBankData(prev => ({ ...prev, adminId: user?.id, depositedBy: user?.name || '' }));
                    setShowBankModal(true);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white border border-white/10 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 backdrop-blur-sm"
                >
                  <Building2 size={16} strokeWidth={3} />
                  Account Transfer
                </button>
              )}

              {can('CASH', 'UPDATE') && (
                <button
                  onClick={() => setShowCloseStoreModal(true)}
                  className="bg-white hover:bg-rose-50 text-rose-600 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center gap-2"
                >
                  <Moon size={16} strokeWidth={3} />
                  Closing Store
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="px-6 py-3 bg-emerald-950/50 rounded-2xl border border-emerald-800 text-emerald-300 text-xs font-black uppercase tracking-widest flex items-center gap-3">
                Safe Closed: Diff ₹{storeRegisterData.storeRegister.closingDifference?.toFixed(2)}
                {can('CASH', 'UPDATE') && (
                  <button
                    onClick={() => {
                      setStoreDenomData({
                        amount: storeRegisterData.storeRegister.actualClosingCash,
                        denominations: storeRegisterData.storeRegister.closingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                      });
                      setShowCloseStoreModal(true);
                    }}
                    className="p-1 px-2 bg-emerald-800/50 hover:bg-emerald-700 text-emerald-400 hover:text-white rounded-lg transition-all text-[10px]"
                  >
                    Edit Closing
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {storeRegisterData?.storeRegister && (
        <div className="space-y-6 mt-6">
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 relative z-10">
            <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50 group relative">
              <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500 mb-1">Opening Cash</p>
              <div className="flex items-center justify-between">
                <p className="text-xl font-black text-white">₹{Math.abs(storeRegisterData.storeRegister.openingCash || 0).toFixed(2)}</p>
                {can('CASH', 'UPDATE') && (
                  <button
                    onClick={() => {
                      setStoreDenomData({
                        amount: storeRegisterData.storeRegister.openingCash,
                        denominations: storeRegisterData.storeRegister.openingDenominations || { "500": 0, "200": 0, "100": 0, "50": 0, "20": 0, "10": 0, "5": 0, "2": 0, "1": 0 }
                      });
                      setShowEditStoreModal(true);
                    }}
                    className="p-1.5 bg-emerald-800/50 text-emerald-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Pencil size={12} />
                  </button>
                )}
              </div>
            </div>
            <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50">
              <p className="text-[10px] font-black tracking-widest uppercase text-amber-500 mb-1">Agent Outflow</p>
              <p className="text-xl font-black text-amber-400">-₹{Math.abs(storeRegisterData?.liveMetrics?.assignedOut || 0).toFixed(2)}</p>
            </div>
            <div className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-800/50">
              <p className="text-[10px] font-black tracking-widest uppercase text-emerald-500 mb-1">Agent Inflow</p>
              <p className="text-xl font-black text-emerald-400">+₹{Math.abs(storeRegisterData?.liveMetrics?.receivedIn || 0).toFixed(2)}</p>
            </div>
            <div className="bg-white/5 border border-white/10 p-4 rounded-2xl backdrop-blur-sm">
              <p className="text-[10px] font-black tracking-widest uppercase text-rose-500 mb-1">Bank Transfer</p>
              <p className="text-xl font-black text-rose-400">₹{Math.abs(storeRegisterData?.liveMetrics?.bankTransferred || 0).toFixed(2)}</p>
            </div>

            <div className="bg-sky-500/10 border border-sky-500/20 p-4 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-5">
                <ShoppingCart size={40} className="text-sky-400" />
              </div>
              <p className="text-[10px] font-black tracking-widest uppercase text-sky-400 mb-1">Counter Cash (Available)</p>
              <p className="text-xl font-black text-sky-400">₹{Math.abs(storeRegisterData?.liveMetrics?.availableCash || 0).toFixed(2)}</p>
            </div>
            <div className="bg-emerald-900 rounded-2xl p-4 shadow-xl border-b-4 border-emerald-950 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                <Vault size={40} className="text-white" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black tracking-widest uppercase text-emerald-400">Store Chest (Safe)</p>
                  <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-500/30">Secure</span>
                </div>
                <p className="text-xl font-black text-white tabular-nums">
                  ₹{Math.abs(storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)}
                </p>
                <div className="mt-2 pt-2 border-t border-emerald-800/50 flex items-center justify-between">
                  <span className="text-[8px] font-bold text-emerald-500 uppercase">Total Cash</span>
                  <span className="text-[10px] font-black text-emerald-300">₹{Math.abs(storeRegisterData?.liveMetrics?.totalStoreCash || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-emerald-950/30 rounded-3xl p-5 border border-emerald-800/30 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                <Clock size={12} /> Today's Shift Safekeeping
              </h3>
              <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-tighter">Reflecting from Collections Report</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[1, 2].map(shiftNum => {
                const depositRecord = storeRegisterData.storeDeposits?.find(d => d.shift === shiftNum);
                const expectedAmount = storeRegisterData.shiftCollections?.find(c => c.shift === shiftNum)?._sum.actualCash || 0;
                const isMismatched = depositRecord && Math.abs(depositRecord.amount - expectedAmount) > 0.1;

                return (
                  <div key={shiftNum} className={`p-4 rounded-2xl border transition-all ${depositRecord
                    ? (isMismatched ? 'bg-amber-950/40 border-amber-800/50' : 'bg-emerald-900/50 border-emerald-800/50')
                    : (expectedAmount > 0 ? 'bg-emerald-950/10 border-emerald-900/20 border-dashed border-2' : 'bg-gray-900/10 border-gray-800/20 opacity-30')
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0 ${depositRecord ? 'bg-emerald-800/50 text-emerald-400' : 'bg-gray-800/30 text-gray-600'
                          }`}>
                          S{shiftNum}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2">
                            <p className="text-sm font-black text-white">
                              ₹{(depositRecord?.amount || expectedAmount).toLocaleString()}
                            </p>
                            {isMismatched && (
                              <div className="flex items-center gap-1 text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                                <AlertTriangle size={8} /> Mismatch
                              </div>
                            )}
                            {!depositRecord && expectedAmount > 0 && (
                              <span className="text-[8px] bg-sky-500/20 text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded-full uppercase font-black tracking-tighter">Draft</span>
                            )}
                          </div>
                          <p className="text-[9px] font-medium text-emerald-500/60 uppercase tracking-wider mt-1 leading-relaxed">
                            {depositRecord ? depositRecord.description : (expectedAmount > 0 ? 'Pending Safe Deposit' : 'No collections reported')}
                          </p>
                          {isMismatched && (
                            <p className="text-[8px] font-bold text-rose-400 mt-1 flex items-center gap-1">
                              <AlertCircle size={8} /> Needs Refresh: Expected ₹{expectedAmount.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {depositRecord && (
                        <div className="flex items-center gap-1">
                          {can('CASH', 'UPDATE') && (
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
                              className="p-1.5 text-emerald-500/50 hover:text-sky-400 hover:bg-sky-400/10 rounded-lg transition-all"
                            >
                              <Pencil size={13} />
                            </button>
                          )}
                          {can('CASH', 'DELETE') && (
                            <button
                              onClick={() => handleDeleteDeposit(depositRecord.id)}
                              className="p-1.5 text-emerald-500/50 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                            >
                              <AlertCircle size={13} />
                            </button>
                          )}
                        </div>
                      )}
                      {!depositRecord && expectedAmount > 0 && (
                        <button
                          onClick={() => setActiveTab('reconciliation')}
                          className="bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 p-1.5 rounded-xl transition-all"
                          title="Go to Deposit"
                        >
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {(storeRegisterData?.liveMetrics?.totalStoreSalesUPI > 0 || storeRegisterData?.liveMetrics?.totalStoreSalesCard > 0 || storeRegisterData?.liveMetrics?.totalStoreSalesCount?.HYBRID > 0) && (
            <div className="bg-emerald-950/30 rounded-3xl p-5 border border-emerald-800/30 relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                  <Smartphone size={12} /> Today's Digital Collections
                </h3>
                <p className="text-[9px] font-bold text-emerald-500/40 uppercase tracking-tighter">From In-Store POS</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {storeRegisterData.liveMetrics.totalStoreSalesUPI > 0 && (
                  <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-xl flex items-center justify-center">
                        <Smartphone size={14} className="text-orange-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider">UPI</p>
                        <p className="text-[8px] font-bold text-emerald-500/40">{storeRegisterData.liveMetrics.totalStoreSalesCount?.UPI || 0} transaction(s)</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-white tabular-nums">₹{storeRegisterData.liveMetrics.totalStoreSalesUPI.toFixed(2)}</p>
                  </div>
                )}

                {storeRegisterData.liveMetrics.totalStoreSalesCard > 0 && (
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Building2 size={14} className="text-blue-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Card</p>
                        <p className="text-[8px] font-bold text-emerald-500/40">{storeRegisterData.liveMetrics.totalStoreSalesCount?.CARD || 0} transaction(s)</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-white tabular-nums">₹{storeRegisterData.liveMetrics.totalStoreSalesCard.toFixed(2)}</p>
                  </div>
                )}

                {storeRegisterData.liveMetrics.totalStoreSalesCount?.HYBRID > 0 && (
                  <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-amber-500/20 rounded-xl flex items-center justify-center">
                        <Zap size={14} className="text-amber-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider">Hybrid (Split)</p>
                        <p className="text-[8px] font-bold text-emerald-500/40">{storeRegisterData.liveMetrics.totalStoreSalesCount.HYBRID} transaction(s)</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-white tabular-nums">₹{(storeRegisterData.liveMetrics.totalStoreSalesHybrid || 0).toFixed(2)}</p>
                      <p className="text-[7px] font-bold text-emerald-500/40">Cash + UPI split</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StoreSafeHeader;
