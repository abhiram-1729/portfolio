import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Truck, ArrowRight, 
  MapPin, Clock, CheckCircle2, Package,
  AlertCircle, Eye, MoreVertical, XCircle
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function TransferSection({ can, setHeaderExtra, storeId }) {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    fetchTransfers();
  }, [storeId, statusFilter]);

  useEffect(() => {
    setHeaderExtra(
      <button
        onClick={() => toast.info('New Transfer Modal (TBD)')}
        className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95"
      >
        <Plus size={20} />
        NEW TRANSFER
      </button>
    );
    return () => setHeaderExtra(null);
  }, [setHeaderExtra]);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await procurementAPI.getTransfers({ 
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        storeId 
      });
      setTransfers(res.data || []);
    } catch (err) {
      toast.error('Failed to fetch transfers');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-50 text-gray-600 border-gray-100';
      case 'IN_TRANSIT': return 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse';
      case 'RECEIVED': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'CANCELLED': return 'bg-rose-50 text-rose-600 border-rose-100';
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
              placeholder="Search transfers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-2xl border border-gray-100">
            {['ALL', 'DRAFT', 'IN_TRANSIT', 'RECEIVED'].map(status => (
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
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Transfers...</p>
          </div>
        ) : transfers.length === 0 ? (
          <div className="bg-white rounded-[2.5rem] p-20 border-2 border-dashed border-gray-100 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
              <Truck size={48} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">No Transfers Found</h3>
              <p className="text-sm font-bold text-gray-400 max-w-xs mx-auto">Manage stock movements between your warehouses and branch stores.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {transfers.map((trf) => (
              <div 
                key={trf.id}
                className="group bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-emerald-500/5 hover:border-emerald-100 transition-all"
              >
                <div className="flex flex-col gap-6">
                  {/* Header Row */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${getStatusStyle(trf.status)}`}>
                        <Truck size={24} strokeWidth={2.5} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">TRF #{trf.transferNumber}</h3>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${getStatusStyle(trf.status)}`}>
                            {trf.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <Clock size={12} /> {format(new Date(trf.transferDate), 'dd MMM yyyy, HH:mm')}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95">
                        <Eye size={20} strokeWidth={2.5} />
                      </button>
                      {trf.status === 'DRAFT' && (
                        <button className="flex items-center gap-2 px-5 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">
                          <Package size={16} />
                          DISPATCH
                        </button>
                      )}
                      {trf.status === 'IN_TRANSIT' && (
                        <button className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95">
                          <CheckCircle2 size={16} />
                          RECEIVE
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Routing Visualization */}
                  <div className="flex items-center gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex-1 flex flex-col gap-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</span>
                      <div className="flex items-center gap-2 text-sm font-bold text-gray-900">
                        <MapPin size={14} className="text-rose-500" />
                        {trf.fromWarehouseId ? 'Central Warehouse' : (trf.fromStoreId ? 'Branch Store' : 'Unknown')}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center px-4">
                      <div className="w-10 h-1 border-t-2 border-dashed border-gray-300 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-1 rounded-full border border-gray-200">
                          <ArrowRight size={12} className="text-emerald-600" />
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 text-right">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">To</span>
                      <div className="flex items-center justify-end gap-2 text-sm font-bold text-gray-900">
                        {trf.toWarehouseId ? 'Main Warehouse' : (trf.toStoreId ? 'Branch Store' : 'Unknown')}
                        <MapPin size={14} className="text-emerald-500" />
                      </div>
                    </div>
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
