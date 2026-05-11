import React from 'react';
import {
  Loader2, BookOpen, Building2, Vault, Coins, ArrowUpRight, ArrowDownLeft,
  ShoppingCart, Lock, ExternalLink, Shield, Package
} from 'lucide-react';
import { format } from 'date-fns';

const AuditLedgerTab = ({
  ledgerLoading, ledgerData, ledgerFilter, setLedgerFilter,
  date, setViewingOrder, setPreviewImage
}) => {
  if (ledgerLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (!ledgerData || ledgerData.ledger.length === 0) {
    return (
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-16 text-center">
        <BookOpen size={48} className="mx-auto text-gray-200 mb-4" />
        <h3 className="text-lg font-black text-gray-300 uppercase tracking-widest">No Ledger Entries</h3>
        <p className="text-sm font-medium text-gray-400 mt-2">Initialize the Store Safe to start recording transactions</p>
      </div>
    );
  }

  const filteredLedger = ledgerData.ledger.filter(entry => {
    if (ledgerFilter === 'BANK') return entry.type === 'BANK_TRANSFER';
    if (ledgerFilter === 'SAFE') return entry.type === 'SAFE_MOVEMENT';
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                Immutable Cash Ledger
              </h3>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                {filteredLedger.length} entries • {date} • {ledgerData.summary.status}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
            {[
              { id: 'ALL', label: 'All', icon: BookOpen, color: 'text-emerald-600' },
              { id: 'BANK', label: 'Bank', icon: Building2, color: 'text-rose-600' },
              { id: 'SAFE', label: 'Safe', icon: Vault, color: 'text-slate-600' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setLedgerFilter(f.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${ledgerFilter === f.id ? `bg-white ${f.color} shadow-sm` : 'text-gray-400 hover:text-gray-600'}`}
              >
                <f.icon size={12} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest w-[80px]">Time</th>
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Reference</th>
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Performed By</th>
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                <th className="px-5 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Store Balance</th>
                <th className="px-4 py-3.5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Docs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLedger.map((entry) => {
                const typeConfig = {
                  'OPENING': { icon: Coins, bg: 'bg-emerald-50', text: 'text-emerald-600', badge: 'INIT' },
                  'AGENT_OUTFLOW': { icon: ArrowUpRight, bg: 'bg-amber-50', text: 'text-amber-600', badge: 'OUT' },
                  'AGENT_INFLOW': { icon: ArrowDownLeft, bg: 'bg-sky-50', text: 'text-sky-600', badge: 'IN' },
                  'BANK_TRANSFER': { icon: Building2, bg: 'bg-rose-50', text: 'text-rose-600', badge: 'BANK' },
                  'SAFE_MOVEMENT': { icon: Vault, bg: 'bg-slate-100', text: 'text-slate-600', badge: 'INTERNAL' },
                  'STORE_SALE': { icon: ShoppingCart, bg: 'bg-sky-50', text: 'text-sky-600', badge: 'POS' },
                  'EXPENSE_OUTFLOW': { icon: Package, bg: 'bg-rose-50', text: 'text-rose-600', badge: 'EXPENSE' },
                  'CLOSING': { icon: Lock, bg: 'bg-slate-100', text: 'text-slate-600', badge: 'CLOSE' },
                };
                const cfg = typeConfig[entry.type] || typeConfig['OPENING'];
                const Icon = cfg.icon;

                return (
                  <tr
                    key={entry.id}
                    onClick={() => entry.type === 'STORE_SALE' && setViewingOrder(entry)}
                    className={`transition-colors ${['CLOSING', 'SAFE_MOVEMENT'].includes(entry.type) ? 'bg-slate-50/30' : ''} ${entry.type === 'STORE_SALE' ? 'hover:bg-sky-50/50 cursor-pointer group' : 'hover:bg-gray-50/80'}`}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-bold text-gray-500 tabular-nums">
                        {format(new Date(entry.timestamp), 'hh:mm a')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center ${cfg.text}`}>
                          <Icon size={16} strokeWidth={2.5} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-800 block leading-tight">{entry.label}</span>
                          {entry.type === 'CLOSING' && entry.metadata?.closingRemarks && (
                            <span className="text-[9px] font-bold text-rose-500 mt-1.5 block italic leading-tight bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/50">
                              " {entry.metadata.closingRemarks} "
                            </span>
                          )}
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest ${cfg.text} opacity-70`}>{cfg.badge}</span>
                            {entry.type === 'STORE_SALE' && entry.metadata?.paymentMode && (
                              <span className={`text-[7px] font-black px-1.5 py-0.5 rounded-md uppercase tracking-widest border shadow-sm ${entry.metadata.paymentMode === 'CASH' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                entry.metadata.paymentMode === 'UPI' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                  entry.metadata.paymentMode === 'CARD' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                    'bg-amber-50 text-amber-600 border-amber-100'
                                }`}>
                                {entry.metadata.paymentMode === 'CASH_UPI' ? 'Hybrid (Split)' : entry.metadata.paymentMode}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-bold text-gray-400 leading-relaxed block max-w-[220px] truncate" title={entry.referenceName}>
                        {entry.referenceName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{entry.userName}</span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`text-sm font-black tabular-nums ${entry.direction === 'IN' || entry.direction === 'IN_FROM_SAFE' ? 'text-emerald-600' :
                        entry.direction === 'OUT' || entry.direction === 'OUT_TO_SAFE' ? 'text-rose-600' : 'text-gray-600'
                        }`}>
                        {['IN', 'IN_FROM_SAFE'].includes(entry.direction) ? '+' : ['OUT', 'OUT_TO_SAFE'].includes(entry.direction) ? '−' : ''}₹{Math.abs(entry.amount || 0).toFixed(2)}
                        {entry.type === 'SAFE_MOVEMENT' && (
                          <span className="text-[8px] font-black block text-gray-400 uppercase tracking-tighter">
                            {entry.direction === 'OUT_TO_SAFE' ? 'MOVE TO SAFE' : 'MOVE TO AVAILABLE'}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-[11px] font-black text-gray-700 tabular-nums">₹{Math.abs(entry.balanceAfter || 0).toFixed(2)}</span>
                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">Total Store</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {entry.metadata?.receiptImage ? (
                        <button
                          onClick={() => setPreviewImage(entry.metadata.receiptImage)}
                          className="p-1.5 hover:bg-white hover:shadow-sm rounded-lg text-sky-600 transition-all border border-transparent hover:border-gray-100"
                          title="View Receipt"
                        >
                          <ExternalLink size={14} />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-200 uppercase tracking-widest">NA</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Inflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500"></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Outflow</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">System</span>
            </div>
          </div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Shield size={10} /> All entries are immutable after creation
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuditLedgerTab;
