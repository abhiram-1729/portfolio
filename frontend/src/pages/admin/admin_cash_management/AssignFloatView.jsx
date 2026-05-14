import React from 'react';
import { 
  X, Coins, AlertTriangle, Sun, Moon, CheckCircle2, Loader2, ArrowLeft 
} from 'lucide-react';

const denominationsList = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function AssignFloatView({ 
  onClose, assignmentData, setAssignmentData, vehicles, summaries, 
  handleDenominationChange, handleAssignFloat, isSubmitting 
}) {
  return (
    <div className="h-[calc(100vh-140px)] flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-500 overflow-hidden">
      {/* Header - Compact */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 transition-all flex items-center justify-center group"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Coins className="text-emerald-500" size={20} /> Assign Float
            </h1>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">Daily Opening Cash</p>
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left Column: Config - 4/12 */}
        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">1. Shift</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 1, label: 'Shift 1', icon: Sun, color: 'text-amber-500' },
                  { id: 2, label: 'Shift 2', icon: Moon, color: 'text-indigo-500' }
                ].map((s) => {
                  const isDisabled = (() => {
                    if (!assignmentData.vehicleId) return false;
                    const summary = summaries.find(sum => sum.vehicleId === assignmentData.vehicleId);
                    const s1Closed = summary?.shiftDetails?.shift1?.closing;
                    return s.id === 2 && !s1Closed;
                  })();
                  const active = assignmentData.shift === s.id;
                  return (
                    <button
                      key={s.id} type="button" disabled={isDisabled}
                      onClick={() => setAssignmentData({ ...assignmentData, shift: s.id })}
                      className={`flex flex-col items-center p-3 rounded-2xl border-2 transition-all ${
                        isDisabled ? 'opacity-30 cursor-not-allowed' :
                        active ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-50 hover:border-emerald-100 bg-white'
                      }`}
                    >
                      <s.icon size={18} className={active ? 'text-emerald-600' : s.color} />
                      <span className={`text-[11px] font-black mt-1 ${active ? 'text-emerald-900' : 'text-gray-900'}`}>{s.label}</span>
                      {isDisabled && <span className="text-[7px] font-bold text-gray-400 uppercase leading-none mt-0.5">Close S1</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">2. Vehicle / Agent</label>
              <select
                required
                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:border-emerald-500 outline-none"
                value={assignmentData.vehicleId}
                onChange={(e) => setAssignmentData({ ...assignmentData, vehicleId: e.target.value })}
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => {
                  const agent = v.assignedUsers?.find(u => u.role === 'SALES_AGENT');
                  if (!agent) return null;
                  return <option key={v.id} value={v.id}>{agent.name} ({v.vehicleNumber})</option>;
                }).filter(Boolean)}
              </select>
            </div>

            {assignmentData.vehicleId && (
              <div 
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  assignmentData.isNoService ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-100'
                }`}
                onClick={() => setAssignmentData({ ...assignmentData, isNoService: !assignmentData.isNoService })}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${assignmentData.isNoService ? 'bg-rose-500 text-white' : 'bg-white text-rose-300'}`}>
                  <AlertTriangle size={16} />
                </div>
                <div className="flex-1">
                  <span className={`text-[9px] font-black uppercase block ${assignmentData.isNoService ? 'text-rose-600' : 'text-gray-400'}`}>No Service</span>
                </div>
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${assignmentData.isNoService ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-200 bg-white'}`}>
                  {assignmentData.isNoService && <CheckCircle2 size={10} strokeWidth={3} />}
                </div>
              </div>
            )}
          </div>

          {assignmentData.vehicleId && (
            (() => {
              const existingSummary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
              const shiftKey = `shift${assignmentData.shift}`;
              const existingShiftData = existingSummary?.shiftDetails?.[shiftKey];
              const isAlreadyAssigned = !!existingShiftData?.opening;
              if (!isAlreadyAssigned) return null;
              return (
                <div className="bg-amber-50 p-4 rounded-3xl border border-amber-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center"><CheckCircle2 size={16} /></div>
                    <h4 className="text-xs font-black text-amber-900 uppercase">Already Assigned</h4>
                  </div>
                  <p className="text-[11px] font-medium text-amber-900/70 leading-relaxed">
                    Assigned <span className="text-amber-700 font-black">₹{(existingShiftData.opening.totalOpeningCash || 0).toFixed(2)}</span> for Shift {assignmentData.shift}.
                  </p>
                </div>
              );
            })()
          )}
        </div>

        {/* Right Column: Denoms - 8/12 */}
        <div className="col-span-8 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-3">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">3. Denominations</label>
            {assignmentData.isNoService && <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full uppercase tracking-widest">No Service</span>}
          </div>

          <div className={`flex-1 grid grid-cols-3 gap-3 overflow-y-auto pr-2 ${assignmentData.isNoService ? 'opacity-20 pointer-events-none' : ''}`}>
            {denominationsList.map((denom) => (
              <div key={denom} className="flex flex-col gap-1 bg-gray-50/50 p-3 rounded-2xl border border-transparent hover:border-emerald-100 hover:bg-white transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-gray-400">₹{denom}</span>
                  {assignmentData.denominations[denom] > 0 && <div className="w-1 h-1 rounded-full bg-emerald-500" />}
                </div>
                <input
                  type="number" placeholder="0"
                  className="w-full bg-transparent border-none p-0 text-lg font-black text-gray-900 focus:ring-0"
                  value={assignmentData.denominations[denom] || ''}
                  onChange={(e) => handleDenominationChange(e.target.value, denom, 'assign')}
                />
                <div className="text-[8px] font-bold text-gray-400 tabular-nums">₹{((assignmentData.denominations[denom] || 0) * denom).toLocaleString()}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
            <div className={`px-6 py-3 rounded-2xl flex items-center justify-between text-white ${
              assignmentData.isNoService ? 'bg-rose-600' : (assignmentData.shift === 1 ? 'bg-amber-600' : 'bg-indigo-600')
            }`}>
              <div>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-70">Total Float</p>
                <h4 className="text-xl font-black tabular-nums">₹{assignmentData.isNoService ? '0.00' : (assignmentData.amount || 0).toFixed(2)}</h4>
              </div>
              {assignmentData.isNoService ? <AlertTriangle size={20} /> : assignmentData.shift === 1 ? <Sun size={20} /> : <Moon size={20} />}
            </div>

            <button
              onClick={handleAssignFloat}
              disabled={isSubmitting || !assignmentData.vehicleId}
              className={`font-black rounded-2xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                (() => {
                  const existingSummary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                  const isAlreadyAssigned = !!existingSummary?.shiftDetails?.[`shift${assignmentData.shift}`]?.opening;
                  return isAlreadyAssigned ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white';
                })()
              }`}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  <Coins size={16} strokeWidth={2.5} />
                  {(() => {
                    const existingSummary = summaries.find(s => s.vehicleId === assignmentData.vehicleId);
                    const isAlreadyAssigned = !!existingSummary?.shiftDetails?.[`shift${assignmentData.shift}`]?.opening;
                    return isAlreadyAssigned ? 'Update Assignment' : 'Confirm Assignment';
                  })()}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
