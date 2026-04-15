import React, { useState, useEffect } from 'react';
import { 
  History, 
  Loader2, 
  ShoppingCart, 
  RefreshCcw, 
  Banknote, 
  CreditCard, 
  Scale, 
  Layout,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ClipboardList,
  CheckCircle,
  XCircle,
  Trophy,
  Truck,
  Package,
  Route,
  Box
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const ACTION_ICONS = {
  'SALE_COMPLETED': <ShoppingCart size={20} className="text-emerald-500" />,
  'REFILL_REQUESTED': <RefreshCcw size={20} className="text-blue-500" />,
  'REFILL_APPROVED': <RefreshCcw size={20} className="text-emerald-600" />,
  'OPENING_CASH_SUBMITTED': <Banknote size={20} className="text-amber-500" />,
  'CLOSING_CASH_SUBMITTED': <Banknote size={20} className="text-indigo-500" />,
  'EXPENSE_REQUESTED': <CreditCard size={20} className="text-rose-500" />,
  'EXPENSE_APPROVED': <CreditCard size={20} className="text-emerald-500" />,
  'EXPENSE_REJECTED': <CreditCard size={20} className="text-gray-400" />,
  'CASH_TO_CHEST_SUBMITTED': <Scale size={20} className="text-cyan-600" />,
  'ASSET_ASSIGNED': <Box size={20} className="text-emerald-500" />,
  'ASSET_RETURNED': <Box size={20} className="text-amber-500" />,
  'ASSET_ISSUE_REPORTED': <AlertCircle size={20} className="text-rose-500" />,
  'ASSET_REQUEST_SUBMITTED': <ClipboardList size={20} className="text-blue-500" />,
  'ASSET_REQ_APPROVED': <CheckCircle size={20} className="text-emerald-600" />,
  'ASSET_REQ_REJECTED': <XCircle size={20} className="text-gray-400" />,
  'LEVEL_UP': <Trophy size={20} className="text-yellow-500" />,
  'STOCK_LOADING': <Truck size={20} className="text-orange-500" />,
  'STOCK_RETURNED': <Package size={20} className="text-blue-400" />,
  'STOCK_AUDITED': <History size={20} className="text-fuchsia-500" />,
  'ROUTE_ASSIGNED': <Route size={20} className="text-indigo-500" />,
  'ROUTE_UPDATED': <Route size={20} className="text-blue-500" />,
  'ROUTE_REMOVED': <Route size={20} className="text-rose-400" />,
  'DEFAULT': <Layout size={20} className="text-gray-400" />
};

export default function AgentActivityLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skip, setSkip] = useState(0);
  const LIMIT = 20;

  const fetchMyLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/activities/my?limit=${LIMIT}&skip=${skip}`);
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (error) {
      toast.error('Failed to load your activity logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLogs();
  }, [skip]);

  return (
    <div className="p-4 space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <History size={28} className="text-emerald-600" />
          My Activities
        </h2>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">A record of your operational history</p>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="animate-spin text-emerald-600" size={32} />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Syncing History...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-100">
            <History size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No activities recorded yet</p>
          </div>
        ) : (
          <>
            {logs.map((log) => (
              <div key={log.id} className="bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm flex items-start gap-4 hover:border-emerald-100 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-50">
                  {ACTION_ICONS[log.action] || ACTION_ICONS.DEFAULT}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      {format(new Date(log.createdAt), 'hh:mm a')}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-700 leading-snug mb-2 whitespace-normal">{log.details}</p>
                  <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider">
                     {format(new Date(log.createdAt), 'EEEE, do MMMM yyyy')}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between pt-4">
              <button 
                onClick={() => setSkip(prev => Math.max(0, prev - LIMIT))}
                disabled={skip === 0}
                className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-600 disabled:opacity-30 transition-all hover:bg-slate-50"
              >
                <ChevronLeft size={16} />
                Prev
              </button>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Page {Math.floor(skip / LIMIT) + 1}
              </span>
              <button 
                onClick={() => setSkip(prev => prev + LIMIT)}
                disabled={logs.length < LIMIT}
                className="flex items-center gap-1.5 px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-black uppercase text-slate-600 disabled:opacity-30 transition-all hover:bg-slate-50"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
