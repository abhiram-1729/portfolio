import React from 'react';
import { 
  X, Coins, CheckCircle2, Loader2, AlertTriangle, Pencil, Building2, 
  UploadCloud, Eye, Vault 
} from 'lucide-react';
import { createPortal } from 'react-dom';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export const OpenStoreModal = ({ 
  show, setShow, storeModalStep, setStoreModalStep, storeRegisterData, 
  storeDenomData, handleDenominationChange, handleOpenStoreRegister, isSubmitting 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Coins size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Initialize Store Safe</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Starting daily cash count</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        {storeModalStep === 'VERIFY' ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl space-y-3">
              <div className="flex items-center gap-3 text-emerald-700">
                <CheckCircle2 size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Verify Yesterday's Closing</span>
              </div>
              <p className="text-sm font-medium text-emerald-900 leading-relaxed">
                Yesterday's physical closing was verified at <span className="font-black">₹{storeRegisterData?.previousRegister?.actualClosingCash?.toLocaleString()}</span>. 
                Do you want to use this as today's starting balance?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setStoreModalStep('INPUT')}
                className="py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-white border border-emerald-100 hover:bg-emerald-50 transition-all"
              >
                Manual Input
              </button>
              <button
                onClick={handleOpenStoreRegister}
                disabled={isSubmitting}
                className="py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={14} /> : 'Yes, Confirm Match'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-3 gap-2 py-2">
              {denominationsList.map((denom) => (
                <div key={denom} className="flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-100 group hover:border-emerald-200 transition-all">
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200"
                    value={storeDenomData.denominations[denom] || ''}
                    onChange={(e) => handleDenominationChange(e.target.value, denom, 'store')}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-emerald-600 shadow-emerald-600/20">
              <div className="flex flex-col">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Calculated Opening</p>
                <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
              </div>
            </div>

            <button
              onClick={handleOpenStoreRegister}
              disabled={isSubmitting || storeDenomData.amount <= 0}
              className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Open Safe for Today</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export const CloseStoreModal = ({ 
  show, setShow, storeRegisterData, storeDenomData, setStoreDenomData, 
  handleDenominationChange, handleCloseStoreRegister, isSubmitting 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
              <Coins size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Close Store Safe</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Final physical end-of-day count</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Expected Counter Cash</p>
          <p className="text-lg font-black text-gray-900">₹{storeRegisterData?.liveMetrics?.availableCash?.toFixed(2)}</p>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Actual Physical Denominations</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
            {denominationsList.map((denom) => (
              <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm group hover:border-rose-200 transition-all">
                <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                  <span className="text-[10px] font-black text-gray-400 group-hover:text-rose-600">₹{denom}</span>
                  <span className="text-[9px] font-bold text-rose-600/40 uppercase">₹{(denom * (storeDenomData.denominations[denom] || 0)).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="text-[10px] text-gray-200">×</span>
                  <input
                    type="number"
                    placeholder="0"
                    min="0"
                    className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200 text-center"
                    value={storeDenomData.denominations[denom] || ''}
                    onChange={(e) => handleDenominationChange(e.target.value, denom, 'store')}
                    onWheel={(e) => e.target.blur()}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between pl-1">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Closing Remarks / Variance Reason</label>
            {Math.abs(storeDenomData.amount - (storeRegisterData?.liveMetrics?.availableCash || 0)) > 0.01 && (
              <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 italic animate-pulse">Required</span>
            )}
          </div>
          <textarea
            rows={2}
            className={`w-full bg-gray-50 border rounded-xl px-4 py-3 text-sm font-bold text-gray-700 transition-all outline-none resize-none placeholder:text-gray-300 ${Math.abs(storeDenomData.amount - (storeRegisterData?.liveMetrics?.availableCash || 0)) > 0.01 && !storeDenomData.remarks
              ? 'border-rose-200 focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500'
              : 'border-gray-100 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500'
            }`}
            placeholder="Enter reason for variance or closing notes..."
            value={storeDenomData.remarks}
            onChange={(e) => setStoreDenomData({ ...storeDenomData, remarks: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-rose-600 shadow-rose-600/20">
          <div className="flex flex-col">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Total Counted Value</p>
            <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
          </div>
          <div className="flex flex-col text-right">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Variance</p>
            {(() => {
              const expected = storeRegisterData?.liveMetrics?.availableCash || 0;
              const diff = storeDenomData.amount - expected;
              return (
                <span className={`text-sm font-black ${diff === 0 ? 'text-white' : 'text-rose-200'}`}>
                  {diff === 0 ? 'Matched' : diff > 0 ? `+₹${diff.toFixed(2)}` : `-₹${Math.abs(diff).toFixed(2)}`}
                </span>
              );
            })()}
          </div>
        </div>

        <button
          onClick={handleCloseStoreRegister}
          disabled={isSubmitting}
          className="w-full bg-rose-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-rose-700 disabled:opacity-50"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Close Safe</>}
        </button>
      </div>
    </div>
  );
};

export const EditStoreModal = ({ 
  show, setShow, storeDenomData, handleDenominationChange, 
  handleUpdateStoreRegister, isSubmitting 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Pencil size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Edit Opening Cash</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Correct the daily starting safe balance</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2 py-2">
            {denominationsList.map((denom) => (
              <div key={denom} className="flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-100 group hover:border-emerald-200 transition-all">
                <span className="text-[10px] font-black text-gray-400 group-hover:text-emerald-600">₹{denom}</span>
                <input
                  type="number"
                  placeholder="0"
                  min="0"
                  className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 placeholder:text-gray-200"
                  value={storeDenomData.denominations[denom] || ''}
                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'store')}
                  onWheel={(e) => e.target.blur()}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white bg-emerald-600 shadow-emerald-600/20">
            <div className="flex flex-col">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5">Corrected Total</p>
              <h4 className="text-2xl font-black tracking-tight">₹{(storeDenomData.amount || 0).toFixed(2)}</h4>
            </div>
          </div>

          <button
            onClick={handleUpdateStoreRegister}
            disabled={isSubmitting || storeDenomData.amount <= 0}
            className="w-full bg-emerald-600 text-white font-black text-base py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm Corrections</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export const SafeMovementModal = ({ 
  show, setShow, safeMovementData, setSafeMovementData, 
  handleDenominationChange, handleSafeMovement, isSubmitting, storeRegisterData 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
              <Vault size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Safe Movement</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Internal cash transfer</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setSafeMovementData({ ...safeMovementData, type: 'DEPOSIT' })}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${safeMovementData.type === 'DEPOSIT' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400'}`}
          >
            Move To Safe
          </button>
          <button
            onClick={() => setSafeMovementData({ ...safeMovementData, type: 'WITHDRAW' })}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${safeMovementData.type === 'WITHDRAW' ? 'bg-white text-sky-600 shadow-sm' : 'text-gray-400'}`}
          >
            Bring to Counter
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {denominationsList.map((denom) => (
              <div key={denom} className="flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                <input
                  type="number"
                  className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0"
                  value={safeMovementData.denominations[denom] || ''}
                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'safe')}
                  onWheel={(e) => e.target.blur()}
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Movement Reason</label>
            <input
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
              placeholder="e.g. End of day excess cash to safe"
              value={safeMovementData.description}
              onChange={(e) => setSafeMovementData({ ...safeMovementData, description: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-600/20">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Total Movement</p>
              <h4 className="text-2xl font-black">₹{(safeMovementData.amount || 0).toFixed(2)}</h4>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">
                {safeMovementData.type === 'DEPOSIT' ? 'Available:' : 'In Safe:'}
              </p>
              <p className="text-sm font-black">
                ₹{safeMovementData.type === 'DEPOSIT' 
                  ? (storeRegisterData?.liveMetrics?.availableCash || 0).toFixed(2)
                  : (storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {(() => {
            const available = safeMovementData.type === 'DEPOSIT' 
              ? (storeRegisterData?.liveMetrics?.availableCash || 0)
              : (storeRegisterData?.liveMetrics?.safeBalance || 0);
            
            if (safeMovementData.amount > available) {
              return (
                <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake duration-300">
                  <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                  <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tight">
                    Amount exceeds available {safeMovementData.type === 'DEPOSIT' ? 'counter cash' : 'safe balance'}
                  </p>
                </div>
              );
            }
            return null;
          })()}

          <button
            onClick={handleSafeMovement}
            disabled={
              isSubmitting || 
              safeMovementData.amount <= 0 || 
              safeMovementData.amount > (safeMovementData.type === 'DEPOSIT' 
                ? (storeRegisterData?.liveMetrics?.availableCash || 0)
                : (storeRegisterData?.liveMetrics?.safeBalance || 0))
            }
            className="w-full bg-sky-600 text-white font-black py-3.5 rounded-xl hover:bg-sky-700 transition-all shadow-lg shadow-sky-600/20 disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Confirm Movement'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const BankDepositModal = ({ 
  show, setShow, bankData, setBankData, storeRegisterData, user, 
  handleCreateBankDeposit, isSubmitting, setPreviewImage, adminAPI, toast 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600">
              <Building2 size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">Bank Deposit</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Transfer cash from safe to account</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><X size={20} /></button>
        </div>

        <form onSubmit={handleCreateBankDeposit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Amount to Transfer</label>
              <input
                type="number"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-lg font-black text-gray-900 focus:ring-4 focus:ring-sky-500/10 outline-none"
                placeholder="0.00"
                value={bankData.amount || ''}
                onChange={(e) => setBankData({ ...bankData, amount: parseFloat(e.target.value) || 0 })}
                onWheel={(e) => e.target.blur()}
              />
              <div className="flex flex-col gap-1.5">
                <p className="text-[9px] font-bold text-gray-400 uppercase pl-1">Available in Safe: ₹{Math.abs(storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)}</p>
                {(bankData.amount > (storeRegisterData?.liveMetrics?.safeBalance || 0)) && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-rose-500/10 border border-rose-500/20 rounded-xl animate-in shake duration-300">
                    <AlertTriangle size={12} className="text-rose-500 shrink-0" />
                    <p className="text-[9px] font-bold text-rose-500 uppercase tracking-tight">
                      Limit Exceeded (Max: ₹{Math.max(0, storeRegisterData?.liveMetrics?.safeBalance || 0).toFixed(2)})
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Branch Name</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-sky-500/10 outline-none"
                placeholder="E.g. HDFC Main Branch"
                value={bankData.branchName}
                onChange={(e) => setBankData({ ...bankData, branchName: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Deposited By</label>
              <input
                type="text"
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-sky-500/10 outline-none"
                value={bankData.depositedBy}
                onChange={(e) => setBankData({ ...bankData, depositedBy: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Admin (Verified By)</label>
              <div className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 text-sm font-black text-gray-500">
                {user?.name}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Deposit Receipt</label>
            <div className="relative group cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (file) {
                    const formData = new FormData();
                    formData.append('image', file);
                    try {
                      const { data } = await adminAPI.uploadProductImage(formData);
                      setBankData({ ...bankData, receiptImage: data.data.url });
                      toast.success('Receipt uploaded successfully');
                    } catch (err) {
                      toast.error('Scan upload failed');
                    }
                  }
                }}
              />
              <div className={`w-full py-8 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-3 transition-all ${bankData.receiptImage ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-400 group-hover:border-sky-300'}`}>
                {bankData.receiptImage ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <CheckCircle2 size={32} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPreviewImage(bankData.receiptImage);
                        }}
                        className="absolute -top-1 -right-1 bg-white p-1.5 rounded-full shadow-lg border border-emerald-100 hover:scale-110 active:scale-95 transition-all text-sky-600 z-20"
                      >
                        <Eye size={12} />
                      </button>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest block">Receipt Attached</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud size={32} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Click to upload deposit slip</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={
              isSubmitting ||
              bankData.amount <= 0 ||
              !bankData.branchName ||
              (bankData.amount > (storeRegisterData?.liveMetrics?.safeBalance || 0))
            }
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-sky-900/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><Building2 size={20} />Confirm Bank Transfer</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export const DepositConfirmModal = ({ 
  show, setShow, depositConfirmData, handleConfirmDeposit, isSubmitting 
}) => {
  if (!show || !depositConfirmData) return null;
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Coins size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 leading-tight">Confirm Deposit</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Shift {depositConfirmData.shift} Consolidated Cash</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-100 p-4 rounded-2xl">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Amount to Deposit</p>
            <p className="text-3xl font-black text-emerald-600">₹{depositConfirmData.amount.toLocaleString()}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Aggregated Denominations</label>
            <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
              {denominationsList.map((denom) => {
                const count = depositConfirmData.denominations[denom] || 0;
                if (count === 0) return null;
                return (
                  <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between border-b border-gray-50 pb-1 mb-1">
                      <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                      <span className="text-[9px] font-bold text-emerald-600/40 uppercase">₹{(denom * count).toLocaleString()}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-sm font-black text-gray-700">× {count}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl">
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Description</p>
            <p className="text-xs text-emerald-700 font-bold">{depositConfirmData.description}</p>
          </div>

          <button
            onClick={handleConfirmDeposit}
            disabled={isSubmitting}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <><CheckCircle2 size={20} />Confirm & Submit Deposit</>}
          </button>
        </div>
      </div>
    </div>
  );
};
