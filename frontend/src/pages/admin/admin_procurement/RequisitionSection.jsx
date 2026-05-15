import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, MoreVertical, 
  Eye, CheckCircle2, XCircle, Trash2,
  AlertCircle, Clock, ShoppingCart, ArrowRight
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { useUserStore } from '../../../store/userStore';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function RequisitionSection({ can, setHeaderExtra, storeId }) {
  const [requisitions, setRequisitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchRequisitions();
  }, [storeId, statusFilter]);

  useEffect(() => {
    setHeaderExtra(
      <button
        onClick={() => setShowAddModal(true)}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
      >
        <Plus size={20} />
        NEW REQUISITION
      </button>
    );
    return () => setHeaderExtra(null);
  }, [setHeaderExtra]);

  const fetchRequisitions = async () => {
    setLoading(true);
    try {
      const res = await procurementAPI.getRequisitions({ 
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        storeId 
      });
      setRequisitions(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch requisitions');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING': return 'bg-amber-50 text-amber-600 border-amber-100';
      case 'APPROVED': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'PO_CREATED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'REJECTED': return 'bg-rose-50 text-rose-600 border-rose-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 flex-1 w-full">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search requisitions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
            {['ALL', 'PENDING', 'APPROVED', 'PO_CREATED'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  statusFilter === status 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Requisitions...</p>
          </div>
        ) : requisitions.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
              <ShoppingCart size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">No Requisitions Found</h3>
              <p className="text-sm font-bold text-gray-400 max-w-xs mx-auto">Start by creating an internal stock request for this branch.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {requisitions.map((req) => (
              <div 
                key={req.id}
                className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-100 transition-all"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${getStatusColor(req.status)}`}>
                      <Clock size={28} strokeWidth={2.5} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">REQ #{req.reqNumber}</h3>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${getStatusColor(req.status)}`}>
                          {req.status.replace('_', ' ')}
                        </span>
                        {req.priority === 'HIGH' && (
                          <span className="text-[10px] font-black px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md border border-rose-100 flex items-center gap-1">
                            <AlertCircle size={10} />
                            URGENT
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Clock size={12} /> {format(new Date(req.reqDate), 'dd MMM yyyy')}</span>
                        <span className="flex items-center gap-1.5"><ShoppingCart size={12} /> {req.items?.length || 0} ITEMS</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all group-hover:scale-105 active:scale-95">
                      <Eye size={20} strokeWidth={2.5} />
                    </button>
                    {req.status === 'PENDING' && (
                      <button className="flex items-center gap-2 px-5 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all active:scale-95">
                        <CheckCircle2 size={16} />
                        APPROVE
                      </button>
                    )}
                    {req.status === 'APPROVED' && (
                      <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                        <Plus size={16} />
                        CREATE PO
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
