import React from 'react';
import { 
  X, Coins, AlertTriangle, Sun, Moon, CheckCircle2, Loader2, Pencil, 
  Trash2, ExternalLink 
} from 'lucide-react';
import { createPortal } from 'react-dom';
import ShiftSelector from './ShiftSelector';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export const AssignFloatModal = ({ 
  show, setShow, assignmentData, setAssignmentData, vehicles, summaries, 
  handleDenominationChange, handleAssignFloat, isSubmitting 
}) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <Coins size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Assign Float</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Daily Opening Cash</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <form onSubmit={handleAssignFloat} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Select Shift</label>
            <ShiftSelector
              value={assignmentData.shift}
              onChange={(s) => setAssignmentData({ ...assignmentData, shift: s })}
              disabledShifts={(() => {
                if (!assignmentData.vehicleId) return [];
                const summary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                const s1Closed = summary?.shiftDetails?.shift1?.closing;
                return !s1Closed ? [2] : [];
              })()}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Target Vehicle / Agent</label>
            <select
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:ring-4 focus:ring-emerald-500/10 outline-none"
              value={assignmentData.vehicleId}
              onChange={(e) => setAssignmentData({ ...assignmentData, vehicleId: e.target.value })}
            >
              <option value="">Select a vehicle...</option>
              {vehicles.map((v) => {
                const agent = v.assignedUsers?.find(u => u.role === 'SALES_AGENT');
                if (!agent) return null;
                return <option key={v.id} value={v.id}>{agent.name} ({v.vehicleNumber})</option>;
              }).filter(Boolean)}
            </select>
          </div>

          {assignmentData.vehicleId && (
            (() => {
              const existingSummary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
              const shiftKey = `shift${assignmentData.shift}`;
              const existingShiftData = existingSummary?.shiftDetails?.[shiftKey];
              const isAlreadyAssigned = !!existingShiftData?.opening;

              return (
                <>
                  {isAlreadyAssigned && (
                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-3 text-amber-700 mb-2">
                        <CheckCircle2 size={18} className="shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Already Assigned</span>
                      </div>
                      <p className="text-xs font-bold text-amber-900/60 leading-relaxed">
                        This vehicle was already assigned <span className="text-amber-700">₹{(existingShiftData.opening.totalOpeningCash || 0).toFixed(2)}</span> for Shift {assignmentData.shift} today.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                         <span className="text-[9px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md uppercase tracking-tighter">Status: Active Shift</span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100/50 group cursor-pointer" onClick={() => setAssignmentData({ ...assignmentData, isNoService: !assignmentData.isNoService })}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${assignmentData.isNoService ? 'bg-rose-500 text-white' : 'bg-white text-rose-300'}`}>
                      <AlertTriangle size={20} />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-1">Vehicle Damage / Service</span>
                      <span className="text-xs font-bold text-rose-900 opacity-70">Mark as "No Service"</span>
                    </div>
                    <input type="checkbox" checked={assignmentData.isNoService || false} readOnly className="w-5 h-5 rounded-lg border-rose-200 text-rose-500" />
                  </div>

                  {!assignmentData.isNoService && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Denominations</label>
                      <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
                        {denominationsList.map((denom) => (
                          <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                            <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                            <input
                              type="number"
                              placeholder="0"
                              className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 text-center"
                              value={assignmentData.denominations[denom] || ''}
                              onChange={(e) => handleDenominationChange(e.target.value, denom, 'assign')}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={`flex items-center justify-between px-5 py-4 rounded-2xl shadow-lg text-white ${assignmentData.isNoService ? 'bg-rose-600' : (assignmentData.shift === 1 ? 'bg-amber-600' : 'bg-indigo-600')}`}>
                    <div>
                      <p className="text-[9px] font-black uppercase opacity-60">Total Value</p>
                      <h4 className="text-2xl font-black">₹{assignmentData.isNoService ? '0.00' : (assignmentData.amount || 0).toFixed(2)}</h4>
                    </div>
                    {assignmentData.isNoService ? <AlertTriangle size={20} /> : assignmentData.shift === 1 ? <Sun size={20} /> : <Moon size={20} />}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full font-black py-4 rounded-2xl transition-all shadow-xl ${isAlreadyAssigned ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20'}`}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : (isAlreadyAssigned ? 'Update Assignment' : 'Confirm Assignment')}
                  </button>
                </>
              );
            })()
          )}
        </form>
      </div>
    </div>
  );
};

export const EditReconciliationModal = ({ 
  show, setShow, editData, setEditData, editingSummary, handleDenominationChange, 
  handleUpdateReconciliation, isSubmitting 
}) => {
  if (!show || !editingSummary) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600">
              <Pencil size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900 leading-tight">Edit Opening Cash</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-tight">Shift {editData.shift} • {editingSummary.vehicle?.vehicleNumber}</p>
            </div>
          </div>
          <button onClick={() => setShow(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={18} /></button>
        </div>

        <form onSubmit={handleUpdateReconciliation} className="space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Denominations</label>
            <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-2 rounded-2xl border border-gray-100">
              {denominationsList.map((denom) => (
                <div key={denom} className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                  <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                  <input
                    type="number"
                    placeholder="0"
                    className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 text-center"
                    value={editData.denominations[denom] || ''}
                    onChange={(e) => handleDenominationChange(e.target.value, denom, 'edit')}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">Correction Reason</label>
            <input
              required
              className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 outline-none"
              value={editData.remark}
              onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-orange-600 text-white shadow-lg shadow-orange-600/20">
            <div>
              <p className="text-[9px] font-black uppercase opacity-60">Corrected Value</p>
              <h4 className="text-2xl font-black">₹{(editData.openingCash || 0).toFixed(2)}</h4>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl hover:bg-orange-700 transition-all"
          >
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Update Opening Cash'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const DeleteModal = ({ show, setShow, deletingSummary, handleDelete, isDeleting }) => {
  if (!show || !deletingSummary) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-rose-50 rounded-3xl flex items-center justify-center text-rose-500">
          <Trash2 size={32} />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900 mb-2">Are you sure?</h3>
          <p className="text-sm font-medium text-gray-500 leading-relaxed">
            Deleting the reconciliation for <span className="font-black text-gray-900">{deletingSummary.vehicle?.vehicleNumber}</span> will remove all associated shift data for today.
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={() => setShow(false)} className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-2xl transition-all">Cancel</button>
          <button onClick={handleDelete} disabled={isDeleting} className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-2xl transition-all shadow-lg shadow-rose-600/20">
            {isDeleting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const UnapprovedWarningModal = ({ show, setShow, unapprovedInfo, depositData, setDepositData, handleInitiateDeposit, isSubmitting, toast }) => {
  if (!show) return null;
  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl flex flex-col items-center text-center gap-6 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 shadow-inner">
          <AlertTriangle size={40} strokeWidth={2.5} className="animate-bounce" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-gray-900 leading-tight">Wait! Unapproved Collections Found</h3>
          <p className="text-sm font-medium text-gray-500 leading-relaxed">
            There are <span className="text-amber-600 font-black">{unapprovedInfo.count} vehicle collection(s)</span> in Shift {unapprovedInfo.shift} that are not yet approved by you.
          </p>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          if (!depositData.description) return toast.error('Mandatory description is required to override.');
          setShow(false);
          handleInitiateDeposit(null, true);
        }} className="flex flex-col w-full gap-4 mt-2">
          <textarea
            required
            rows={2}
            className="w-full bg-gray-50 border border-amber-100 rounded-xl px-4 py-3 text-sm font-bold outline-none"
            placeholder="Explain why you are depositing unapproved cash..."
            value={depositData.description}
            onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
          />
          <button type="submit" disabled={!depositData.description || isSubmitting} className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl">
            Yes, Override & Submit Deposit
          </button>
          <button type="button" onClick={() => setShow(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-4 rounded-2xl">
            No, Let Me Review Agents
          </button>
        </form>
      </div>
    </div>,
    document.body
  );
};

export const ViewAgentDenomsModal = ({ viewingAgentDenoms, setViewingAgentDenoms }) => {
  if (!viewingAgentDenoms) return null;
  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600"><Coins size={20} /></div>
            <div>
              <h3 className="text-sm font-black text-gray-900">{viewingAgentDenoms.agentName}</h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Shift {viewingAgentDenoms.shift} • {viewingAgentDenoms.vehicleInfo}</p>
            </div>
          </div>
          <button onClick={() => setViewingAgentDenoms(null)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {denominationsList.map((denom) => {
            const count = viewingAgentDenoms.denoms[denom] || 0;
            if (count === 0) return null;
            return (
              <div key={denom} className="flex flex-col gap-1 bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-500">₹{denom} × {count}</span>
                <span className="text-[9px] font-bold text-gray-400">₹{(denom * count).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const EditDepositModal = ({ show, setShow, depositData, setDepositData, handleDenominationChange, handleUpdateDeposit, isSubmitting }) => {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2rem] p-6 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <h3 className="text-lg font-black text-gray-900">Edit Shift {depositData.shift} Deposit</h3>
        <form onSubmit={handleUpdateDeposit} className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {denominationsList.map((denom) => (
              <div key={denom} className="flex flex-col gap-1 bg-gray-50 p-2 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                <input
                  type="number"
                  className="w-full bg-transparent border-none p-0 text-sm font-black text-gray-700 focus:ring-0 text-center"
                  value={depositData.denominations[denom] || ''}
                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'deposit')}
                />
              </div>
            ))}
          </div>
          <textarea
            required
            rows={2}
            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-bold"
            placeholder="Reason for editing this deposit..."
            value={depositData.description}
            onChange={(e) => setDepositData({ ...depositData, description: e.target.value })}
          />
          <div className="flex items-center justify-between px-5 py-4 rounded-2xl bg-sky-600 text-white font-black">
            <span>Total: ₹{(depositData.amount || 0).toFixed(2)}</span>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full bg-orange-500 text-white font-black py-3.5 rounded-xl">
            {isSubmitting ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export const ImagePreviewModal = ({ previewImage, setPreviewImage }) => {
  if (!previewImage) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={() => setPreviewImage(null)}>
      <div className="relative max-w-4xl w-full flex flex-col items-center animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="absolute -top-12 right-0 flex gap-4">
          <a href={previewImage} target="_blank" rel="noreferrer" className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase flex items-center gap-2 backdrop-blur-md">
            Open Original <ExternalLink size={14} />
          </a>
          <button onClick={() => setPreviewImage(null)} className="bg-white/10 text-white px-4 py-2 rounded-xl text-xs font-black uppercase backdrop-blur-md">Close</button>
        </div>
        <img src={previewImage} alt="Receipt Preview" className="max-h-[85vh] w-auto rounded-3xl shadow-2xl border-4 border-white/10 object-contain bg-white/5" />
      </div>
    </div>
  );
};
