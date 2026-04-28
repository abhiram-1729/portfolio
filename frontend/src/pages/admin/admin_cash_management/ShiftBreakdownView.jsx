import React from 'react';
import { 
  ArrowLeft, Sun, Moon, Pencil, CheckCircle2, AlertTriangle, AlertCircle, X, 
  Smartphone, Building2, Check, Loader2, Clock 
} from 'lucide-react';
import ShiftStatusBadge from './ShiftStatusBadge';
import DenominationGrid from './DenominationGrid';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

const ShiftBreakdownView = ({
  viewingSummary,
  setViewingSummary,
  isReviewEditing,
  setIsReviewEditing,
  activeCorrectionTab,
  setActiveCorrectionTab,
  reviewEditData,
  setReviewEditData,
  appliedParts,
  setAppliedParts,
  handleDenominationChange,
  handleReviewClosing,
  isSubmitting,
  can
}) => {
  if (!viewingSummary) return null;

  const s1 = viewingSummary.shiftDetails?.shift1;
  const s2 = viewingSummary.shiftDetails?.shift2;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setViewingSummary(null)}
          className="p-2.5 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 shadow-sm transition-all hover:bg-emerald-50"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Shift Breakdown</h2>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
            {viewingSummary.vehicle.vehicleNumber} • {viewingSummary.date}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shift 1 Card */}
        <div className="rounded-[2.5rem] border-2 border-amber-200 overflow-hidden shadow-xl shadow-amber-900/5">
          <div className="bg-amber-50 px-6 py-4 flex items-center justify-between border-b border-amber-100">
            <div className="flex items-center gap-3">
              <Sun size={18} className="text-amber-600" />
              <span className="text-xs font-black text-amber-700 uppercase tracking-[0.1em]">Shift 1 — Morning</span>
            </div>
            <ShiftStatusBadge opening={s1?.opening} closing={s1?.closing} />
          </div>
          <div className="p-6 space-y-6 bg-white">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Float</span>
              <span className={`text-base font-black ${s1?.opening ? 'text-amber-700' : 'text-gray-300'}`}>
                ₹{(s1?.opening?.totalOpeningCash || 0).toFixed(2)}
              </span>
            </div>
            <DenominationGrid denominations={s1?.opening?.denominations} label="Float Denominations" />

            {s1?.closing ? (
              <div className="space-y-6 animate-in fade-in duration-300">
                {isReviewEditing === 1 ? (
                  <div className="bg-orange-50/50 p-5 rounded-[2rem] space-y-4 border border-orange-200 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Correction Mode</span>
                      <button onClick={() => setIsReviewEditing(null)} className="text-orange-400 hover:text-orange-600"><X size={16} /></button>
                    </div>

                    <div className="flex gap-1.5 bg-white/50 p-1 rounded-2xl border border-orange-100 shadow-sm">
                      {['CASH', 'UPI', 'CARD'].map(tab => (
                        <button
                          key={tab}
                          onClick={() => setActiveCorrectionTab(tab)}
                          className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCorrectionTab === tab ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'text-orange-400 hover:bg-orange-100'}`}
                        >
                          {tab}
                        </button>
                      ))}
                    </div>

                    {activeCorrectionTab === 'CASH' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-3 gap-2">
                          {denominationsList.map(denom => (
                            <div key={denom} className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-orange-100 shadow-sm">
                              <span className="text-[8px] font-black text-gray-400">₹{denom}</span>
                              <input
                                type="number"
                                className="w-full text-xs font-black text-orange-700 bg-transparent border-none p-0 focus:ring-0"
                                value={reviewEditData.denominations[denom] || ''}
                                onChange={(e) => handleDenominationChange(e.target.value, denom, 'review')}
                                placeholder="0"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white border border-orange-100 rounded-2xl shadow-sm">
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase block">Expected Cash: ₹{(s1?.closing?.expectedCash || 0).toFixed(2)}</span>
                            <span className="text-xs font-black text-orange-700 uppercase">Input Counted: ₹{reviewEditData.actualCash.toFixed(2)}</span>
                          </div>
                          <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${Math.abs(reviewEditData.actualCash - s1.closing.expectedCash) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                            {Math.abs(reviewEditData.actualCash - s1.closing.expectedCash) <= 0.01 ? 'MATCHED' : (reviewEditData.actualCash - s1.closing.expectedCash) > 0 ? `+₹${(reviewEditData.actualCash - s1.closing.expectedCash).toFixed(2)}` : `-₹${Math.abs(reviewEditData.actualCash - s1.closing.expectedCash).toFixed(2)}`}
                          </div>
                        </div>

                        <button
                          onClick={() => setAppliedParts({ ...appliedParts, CASH: true })}
                          className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${appliedParts.CASH ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                        >
                          {appliedParts.CASH ? <Check size={14} /> : null}
                          {appliedParts.CASH ? 'Applied' : 'Apply Cash Correction'}
                        </button>
                      </div>
                    )}

                    {activeCorrectionTab === 'UPI' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-white p-5 rounded-2xl border border-orange-100 shadow-sm space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
                              <Smartphone size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Correct UPI Sales</p>
                              <p className="text-[8px] font-bold text-gray-400">Current System Val: ₹{(s1?.closing?.upiSales || 0).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-orange-300">₹</span>
                            <input
                              type="number"
                              className="w-full bg-orange-50/50 border border-orange-100 pl-8 pr-4 py-3 text-lg font-black text-orange-700 rounded-xl focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 outline-none transition-all"
                              value={reviewEditData.upiSales}
                              onChange={(e) => {
                                setReviewEditData({ ...reviewEditData, upiSales: parseFloat(e.target.value) || 0 });
                                setAppliedParts({ ...appliedParts, UPI: false });
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white border border-orange-100 rounded-2xl shadow-sm">
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase block">Expected UPI: ₹{(s1?.closing?.upiSales || 0).toFixed(2)}</span>
                            <span className="text-xs font-black text-orange-700 uppercase">Input Adjusted: ₹{reviewEditData.upiSales.toFixed(2)}</span>
                          </div>
                          <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${Math.abs(reviewEditData.upiSales - s1.closing.upiSales) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                            {Math.abs(reviewEditData.upiSales - s1.closing.upiSales) <= 0.01 ? 'MATCHED' : (reviewEditData.upiSales - s1.closing.upiSales) > 0 ? `+₹${(reviewEditData.upiSales - s1.closing.upiSales).toFixed(2)}` : `-₹${Math.abs(reviewEditData.upiSales - s1.closing.upiSales).toFixed(2)}`}
                          </div>
                        </div>

                        <button
                          onClick={() => setAppliedParts({ ...appliedParts, UPI: true })}
                          className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${appliedParts.UPI ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                        >
                          {appliedParts.UPI ? <Check size={14} /> : null}
                          {appliedParts.UPI ? 'Applied' : 'Apply UPI Correction'}
                        </button>
                      </div>
                    )}

                    {activeCorrectionTab === 'CARD' && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                              <Building2 size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Correct Card Sales</p>
                              <p className="text-[8px] font-bold text-gray-400">Current System Val: ₹{(s1?.closing?.cardSales || 0).toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-300">₹</span>
                            <input
                              type="number"
                              className="w-full bg-blue-50/50 border border-blue-100 pl-8 pr-4 py-3 text-lg font-black text-blue-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                              value={reviewEditData.cardSales}
                              onChange={(e) => {
                                setReviewEditData({ ...reviewEditData, cardSales: parseFloat(e.target.value) || 0 });
                                setAppliedParts({ ...appliedParts, CARD: false });
                              }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-2xl shadow-sm">
                          <div>
                            <span className="text-[9px] font-black text-gray-400 uppercase block">Expected Card: ₹{(s1?.closing?.cardSales || 0).toFixed(2)}</span>
                            <span className="text-xs font-black text-blue-700 uppercase">Input Adjusted: ₹{reviewEditData.cardSales.toFixed(2)}</span>
                          </div>
                          <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${Math.abs(reviewEditData.cardSales - s1.closing.cardSales) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                            {Math.abs(reviewEditData.cardSales - s1.closing.cardSales) <= 0.01 ? 'MATCHED' : (reviewEditData.cardSales - s1.closing.cardSales) > 0 ? `+₹${(reviewEditData.cardSales - s1.closing.cardSales).toFixed(2)}` : `-₹${Math.abs(reviewEditData.cardSales - s1.closing.cardSales).toFixed(2)}`}
                          </div>
                        </div>

                        <button
                          onClick={() => setAppliedParts({ ...appliedParts, CARD: true })}
                          className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${appliedParts.CARD ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-600 text-white hover:bg-orange-700'}`}
                        >
                          {appliedParts.CARD ? <Check size={14} /> : null}
                          {appliedParts.CARD ? 'Applied' : 'Apply Card Correction'}
                        </button>
                      </div>
                    )}

                    <div className="space-y-3 pt-3 border-t border-orange-200">
                      <input
                        className="w-full bg-white border border-orange-100 p-3 text-sm rounded-xl outline-none focus:ring-2 focus:ring-orange-200"
                        placeholder="Admin reason for correction..."
                        value={reviewEditData.remark}
                        onChange={(e) => setReviewEditData({ ...reviewEditData, remark: e.target.value })}
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setIsReviewEditing(null)}
                          className="py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all font-bold"
                        >
                          Discard
                        </button>
                        <button
                          onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 1, 'APPROVED', {
                            actualCash: reviewEditData.actualCash,
                            upiSales: reviewEditData.upiSales,
                            cardSales: reviewEditData.cardSales,
                            denominations: reviewEditData.denominations,
                            remark: reviewEditData.remark
                          })}
                          disabled={isSubmitting}
                          className="bg-emerald-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                        >
                          {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : (
                            <>
                              <CheckCircle2 size={14} />
                              Approve Shift
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cash Sales</span>
                        <div className="flex items-center gap-2">
                          {Math.abs(s1.closing.actualCash - s1.closing.expectedCash) > 0.01 && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${s1.closing.actualCash > s1.closing.expectedCash ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                              {s1.closing.actualCash > s1.closing.expectedCash ? 'Extra' : 'Short'}: ₹{Math.abs(s1.closing.actualCash - s1.closing.expectedCash).toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm font-black text-emerald-600">₹{(s1.closing.cashSales || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI Sales</span>
                        <div className="flex items-center gap-2">
                          {Math.abs(s1.closing.upiSales - (viewingSummary.dailySales?.totalUpi || 0)) > 0.01 && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${s1.closing.upiSales > (viewingSummary.dailySales?.totalUpi || 0) ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                              {s1.closing.upiSales > (viewingSummary.dailySales?.totalUpi || 0) ? 'Extra' : 'Short'}: ₹{Math.abs(s1.closing.upiSales - (viewingSummary.dailySales?.totalUpi || 0)).toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm font-black text-orange-600">₹{(s1.closing.upiSales || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card Sales</span>
                        <div className="flex items-center gap-2">
                          {Math.abs(s1.closing.cardSales - (viewingSummary.dailySales?.totalCard || 0)) > 0.01 && (
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${s1.closing.cardSales > (viewingSummary.dailySales?.totalCard || 0) ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                              {s1.closing.cardSales > (viewingSummary.dailySales?.totalCard || 0) ? 'Extra' : 'Short'}: ₹{Math.abs(s1.closing.cardSales - (viewingSummary.dailySales?.totalCard || 0)).toFixed(2)}
                            </span>
                          )}
                          <span className="text-sm font-black text-blue-600">₹{(s1.closing.cardSales || 0).toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expenses</span>
                        <span className="text-sm font-black text-rose-500">-₹{(s1.closing.expenses || 0).toFixed(2)}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Submission</span>
                        <div className="flex flex-col items-end">
                          <span className="text-base font-black text-slate-900">₹{(s1.closing.actualCash || 0).toFixed(2)}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s1.closing.difference === 0 ? 'bg-emerald-50 text-emerald-600' : s1.closing.difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                            {s1.closing.difference === 0 ? 'MATCHED' : `${s1.closing.difference > 0 ? '+' : ''}₹${s1.closing.difference.toFixed(2)}`}
                          </span>
                        </div>
                      </div>
                    </div>
                    <DenominationGrid denominations={s1.closing.denominations} label="Submission Denominations" />

                    {s1.closing.remark && (
                      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 italic font-medium text-xs text-amber-900">
                        <span className="text-[8px] font-black text-amber-500 uppercase block not-italic mb-1 tracking-widest">Agent Note</span>
                        "{s1.closing.remark}"
                      </div>
                    )}

                    {can('CASH', 'UPDATE', 'RECONCILIATION') && (
                      <div className="flex gap-3 pt-2">
                        <button
                          onClick={() => {
                            setIsReviewEditing(1);
                            setActiveCorrectionTab('CASH');
                            setAppliedParts({ CASH: false, UPI: false, CARD: false });
                            setReviewEditData({
                              actualCash: s1.closing.actualCash,
                              upiSales: s1.closing.upiSales,
                              cardSales: s1.closing.cardSales,
                              denominations: s1.closing.denominations,
                              remark: s1.closing.remark || ''
                            });
                          }}
                          className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-gray-50 transition-all"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        {s1.closing.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 1, 'APPROVED')}
                              className="flex-[2] bg-emerald-600 text-white text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-600/20"
                            >
                              Quick Approve
                            </button>
                            <button
                              onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 1, 'REJECTED')}
                              className="flex-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-rose-100 transition-colors"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-8 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Closing Not Submitted</p>
              </div>
            )}
          </div>
        </div>

        {/* Shift 2 Card */}
        <div className="rounded-[2.5rem] border-2 border-indigo-200 overflow-hidden shadow-xl shadow-indigo-900/5">
          <div className="bg-indigo-50 px-6 py-4 flex items-center justify-between border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <Moon size={18} className="text-indigo-600" />
              <span className="text-xs font-black text-indigo-700 uppercase tracking-[0.1em]">Shift 2 — Afternoon</span>
            </div>
            <ShiftStatusBadge opening={s2?.opening} closing={s2?.closing} />
          </div>
          <div className="p-6 space-y-6 bg-white">
            {s2?.opening ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Initial Float</span>
                  <span className="text-base font-black text-indigo-700">
                    ₹{(s2.opening.totalOpeningCash || 0).toFixed(2)}
                  </span>
                </div>
                <DenominationGrid denominations={s2.opening.denominations} label="Float Denominations" />

                {s2?.closing ? (
                  <div className="space-y-6 animate-in fade-in duration-300">
                    {isReviewEditing === 2 ? (
                      <div className="bg-indigo-50/30 p-5 rounded-[2rem] space-y-4 border border-indigo-200 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Correction Mode</span>
                          <button onClick={() => setIsReviewEditing(null)} className="text-indigo-400 hover:text-indigo-600"><X size={16} /></button>
                        </div>

                        <div className="flex gap-1.5 bg-white/50 p-1 rounded-2xl border border-indigo-100 shadow-sm">
                          {['CASH', 'UPI', 'CARD'].map(tab => (
                            <button
                              key={tab}
                              onClick={() => setActiveCorrectionTab(tab)}
                              className={`flex-1 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeCorrectionTab === tab ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-indigo-400 hover:bg-indigo-100'}`}
                            >
                              {tab}
                            </button>
                          ))}
                        </div>

                        {activeCorrectionTab === 'CASH' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-3 gap-2">
                              {denominationsList.map(denom => (
                                <div key={denom} className="flex flex-col gap-1 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm">
                                  <span className="text-[8px] font-black text-gray-400">₹{denom}</span>
                                  <input
                                    type="number"
                                    className="w-full text-xs font-black text-indigo-700 bg-transparent border-none p-0 focus:ring-0"
                                    value={reviewEditData.denominations[denom] || ''}
                                    onChange={(e) => handleDenominationChange(e.target.value, denom, 'review')}
                                    placeholder="0"
                                  />
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-2xl shadow-sm">
                              <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase block">Expected Cash: ₹{(s2?.closing?.expectedCash || 0).toFixed(2)}</span>
                                <span className="text-xs font-black text-indigo-700 uppercase">Input Counted: ₹{reviewEditData.actualCash.toFixed(2)}</span>
                              </div>
                              <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${Math.abs(reviewEditData.actualCash - s2.closing.expectedCash) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                {Math.abs(reviewEditData.actualCash - s2.closing.expectedCash) <= 0.01 ? 'MATCHED' : (reviewEditData.actualCash - s2.closing.expectedCash) > 0 ? `+₹${(reviewEditData.actualCash - s2.closing.expectedCash).toFixed(2)}` : `-₹${Math.abs(reviewEditData.actualCash - s2.closing.expectedCash).toFixed(2)}`}
                              </div>
                            </div>

                            <button
                              onClick={() => setAppliedParts({ ...appliedParts, CASH: true })}
                              className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${appliedParts.CASH ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                            >
                              {appliedParts.CASH ? <Check size={14} /> : null}
                              {appliedParts.CASH ? 'Applied' : 'Apply Cash Correction'}
                            </button>
                          </div>
                        )}

                        {activeCorrectionTab === 'UPI' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
                                  <Smartphone size={20} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Correct UPI Sales</p>
                                  <p className="text-[8px] font-bold text-gray-400">Current System Val: ₹{(s2?.closing?.upiSales || 0).toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-indigo-300">₹</span>
                                <input
                                  type="number"
                                  className="w-full bg-indigo-50/50 border border-indigo-100 pl-8 pr-4 py-3 text-lg font-black text-indigo-700 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all"
                                  value={reviewEditData.upiSales}
                                  onChange={(e) => {
                                    setReviewEditData({ ...reviewEditData, upiSales: parseFloat(e.target.value) || 0 });
                                    setAppliedParts({ ...appliedParts, UPI: false });
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white border border-indigo-100 rounded-2xl shadow-sm">
                              <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase block">Expected UPI: ₹{(s2?.closing?.upiSales || 0).toFixed(2)}</span>
                                <span className="text-xs font-black text-indigo-700 uppercase">Input Adjusted: ₹{reviewEditData.upiSales.toFixed(2)}</span>
                              </div>
                              <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${Math.abs(reviewEditData.upiSales - s2.closing.upiSales) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                {Math.abs(reviewEditData.upiSales - s2.closing.upiSales) <= 0.01 ? 'MATCHED' : (reviewEditData.upiSales - s2.closing.upiSales) > 0 ? `+₹${(reviewEditData.upiSales - s2.closing.upiSales).toFixed(2)}` : `-₹${Math.abs(reviewEditData.upiSales - s2.closing.upiSales).toFixed(2)}`}
                              </div>
                            </div>

                            <button
                              onClick={() => setAppliedParts({ ...appliedParts, UPI: true })}
                              className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${appliedParts.UPI ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-orange-600 text-white hover:bg-orange-700'}`}
                            >
                              {appliedParts.UPI ? <Check size={14} /> : null}
                              {appliedParts.UPI ? 'Applied' : 'Apply UPI Correction'}
                            </button>
                          </div>
                        )}

                        {activeCorrectionTab === 'CARD' && (
                          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="bg-white p-5 rounded-2xl border border-blue-100 shadow-sm space-y-3">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                                  <Building2 size={20} />
                                </div>
                                <div>
                                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Correct Card Sales</p>
                                  <p className="text-[8px] font-bold text-gray-400">Current System Val: ₹{(s2?.closing?.cardSales || 0).toFixed(2)}</p>
                                </div>
                              </div>
                              <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-blue-300">₹</span>
                                <input
                                  type="number"
                                  className="w-full bg-blue-50/50 border border-blue-100 pl-8 pr-4 py-3 text-lg font-black text-blue-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                                  value={reviewEditData.cardSales}
                                  onChange={(e) => {
                                    setReviewEditData({ ...reviewEditData, cardSales: parseFloat(e.target.value) || 0 });
                                    setAppliedParts({ ...appliedParts, CARD: false });
                                  }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-white border border-blue-100 rounded-2xl shadow-sm">
                              <div>
                                <span className="text-[9px] font-black text-gray-400 uppercase block">Expected Card: ₹{(s2?.closing?.cardSales || 0).toFixed(2)}</span>
                                <span className="text-xs font-black text-blue-700 uppercase">Input Adjusted: ₹{reviewEditData.cardSales.toFixed(2)}</span>
                              </div>
                              <div className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter ${Math.abs(reviewEditData.cardSales - s2.closing.cardSales) <= 0.01 ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'}`}>
                                {Math.abs(reviewEditData.cardSales - s2.closing.cardSales) <= 0.01 ? 'MATCHED' : (reviewEditData.cardSales - s2.closing.cardSales) > 0 ? `+₹${(reviewEditData.cardSales - s2.closing.cardSales).toFixed(2)}` : `-₹${Math.abs(reviewEditData.cardSales - s2.closing.cardSales).toFixed(2)}`}
                              </div>
                            </div>

                            <button
                              onClick={() => setAppliedParts({ ...appliedParts, CARD: true })}
                              className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${appliedParts.CARD ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                              {appliedParts.CARD ? <Check size={14} /> : null}
                              {appliedParts.CARD ? 'Applied' : 'Apply Card Correction'}
                            </button>
                          </div>
                        )}

                        <div className="space-y-3 pt-3 border-t border-indigo-200">
                          <input
                            className="w-full bg-white border border-indigo-100 p-3 text-sm rounded-xl outline-none focus:ring-2 focus:ring-indigo-200"
                            placeholder="Admin reason for correction..."
                            value={reviewEditData.remark}
                            onChange={(e) => setReviewEditData({ ...reviewEditData, remark: e.target.value })}
                          />

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => setIsReviewEditing(null)}
                              className="py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all font-bold"
                            >
                              Discard
                            </button>
                            <button
                              onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 2, 'APPROVED', {
                                actualCash: reviewEditData.actualCash,
                                upiSales: reviewEditData.upiSales,
                                cardSales: reviewEditData.cardSales,
                                denominations: reviewEditData.denominations,
                                remark: reviewEditData.remark
                              })}
                              disabled={isSubmitting}
                              className="bg-emerald-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                            >
                              {isSubmitting ? <Loader2 className="animate-spin" size={14} /> : (
                                <>
                                  <CheckCircle2 size={14} />
                                  Approve Shift
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-gray-50/50 p-5 rounded-[2rem] border border-gray-100 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cash Sales</span>
                            <div className="flex items-center gap-2">
                              {Math.abs(s2.closing.actualCash - s2.closing.expectedCash) > 0.01 && (
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${s2.closing.actualCash > s2.closing.expectedCash ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {s2.closing.actualCash > s2.closing.expectedCash ? 'Extra' : 'Short'}: ₹{Math.abs(s2.closing.actualCash - s2.closing.expectedCash).toFixed(2)}
                                </span>
                              )}
                              <span className="text-sm font-black text-emerald-600">₹{(s2.closing.cashSales || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">UPI Sales</span>
                            <div className="flex items-center gap-2">
                              {Math.abs(s2.closing.upiSales - ((viewingSummary.dailySales?.totalUpi || 0) - (s1?.closing?.upiSales || 0))) > 0.01 && (
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${s2.closing.upiSales > ((viewingSummary.dailySales?.totalUpi || 0) - (s1?.closing?.upiSales || 0)) ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {s2.closing.upiSales > ((viewingSummary.dailySales?.totalUpi || 0) - (s1?.closing?.upiSales || 0)) ? 'Extra' : 'Short'}: ₹{Math.abs(s2.closing.upiSales - ((viewingSummary.dailySales?.totalUpi || 0) - (s1?.closing?.upiSales || 0))).toFixed(2)}
                                </span>
                              )}
                              <span className="text-sm font-black text-orange-600">₹{(s2.closing.upiSales || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Card Sales</span>
                            <div className="flex items-center gap-2">
                              {Math.abs(s2.closing.cardSales - ((viewingSummary.dailySales?.totalCard || 0) - (s1?.closing?.cardSales || 0))) > 0.01 && (
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${s2.closing.cardSales > ((viewingSummary.dailySales?.totalCard || 0) - (s1?.closing?.cardSales || 0)) ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                  {s2.closing.cardSales > ((viewingSummary.dailySales?.totalCard || 0) - (s1?.closing?.cardSales || 0)) ? 'Extra' : 'Short'}: ₹{Math.abs(s2.closing.cardSales - ((viewingSummary.dailySales?.totalCard || 0) - (s1?.closing?.cardSales || 0))).toFixed(2)}
                                </span>
                              )}
                              <span className="text-sm font-black text-blue-600">₹{(s2.closing.cardSales || 0).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expenses</span>
                            <span className="text-sm font-black text-rose-500">-₹{(s2.closing.expenses || 0).toFixed(2)}</span>
                          </div>
                          <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Submission</span>
                            <div className="flex flex-col items-end">
                              <span className="text-base font-black text-slate-900">₹{(s2.closing.actualCash || 0).toFixed(2)}</span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${s2.closing.difference === 0 ? 'bg-emerald-50 text-emerald-600' : s2.closing.difference > 0 ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-600'}`}>
                                {s2.closing.difference === 0 ? 'MATCHED' : `${s2.closing.difference > 0 ? '+' : ''}₹${s2.closing.difference.toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                        </div>
                        <DenominationGrid denominations={s2.closing.denominations} label="Submission Denominations" />

                        {s2.closing.remark && (
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 italic font-medium text-xs text-indigo-900">
                            <span className="text-[8px] font-black text-indigo-500 uppercase block not-italic mb-1 tracking-widest">Agent Note</span>
                            "{s2.closing.remark}"
                          </div>
                        )}

                        {can('CASH', 'UPDATE', 'RECONCILIATION') && (
                          <div className="flex gap-3 pt-2">
                            <button
                              onClick={() => {
                                setIsReviewEditing(2);
                                setActiveCorrectionTab('CASH');
                                setAppliedParts({ CASH: false, UPI: false, CARD: false });
                                setReviewEditData({
                                  actualCash: s2.closing.actualCash,
                                  upiSales: s2.closing.upiSales,
                                  cardSales: s2.closing.cardSales,
                                  denominations: s2.closing.denominations,
                                  remark: s2.closing.remark || ''
                                });
                              }}
                              className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-gray-50 transition-all"
                            >
                              <Pencil size={12} /> Edit
                            </button>
                            {s2.closing.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 2, 'APPROVED')}
                                  className="flex-[2] bg-emerald-600 text-white text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-emerald-700 transition-shadow shadow-lg shadow-emerald-600/20"
                                >
                                  Quick Approve
                                </button>
                                <button
                                  onClick={() => handleReviewClosing(viewingSummary.vehicleId, viewingSummary.date, 2, 'REJECTED')}
                                  className="flex-1 bg-rose-50 text-rose-600 text-[10px] font-black uppercase py-3.5 rounded-2xl hover:bg-rose-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <Clock size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Closing Not Submitted</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-gray-50/30 rounded-[3rem] border border-dashed border-gray-100">
                <Moon size={32} className="text-gray-200" />
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Shift 2 Not Operational</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShiftBreakdownView;
