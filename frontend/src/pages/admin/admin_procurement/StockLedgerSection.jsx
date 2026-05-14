import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Loader2
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const StockLedgerSection = () => {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLedger = ledger.filter(entry => 
    !searchQuery || entry.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getStockLedger({ type: typeFilter || undefined });
        setLedger(data);
      } catch { toast.error('Failed to load stock ledger'); }
      finally { setLoading(false); }
    };
    setLoading(true);
    load();
  }, [typeFilter]);

  const typeColors = {
    PURCHASE: 'bg-emerald-50 text-emerald-600',
    SALE: 'bg-red-50 text-red-600',
    TRANSFER_IN: 'bg-blue-50 text-blue-600',
    TRANSFER_OUT: 'bg-orange-50 text-orange-600',
    ADJUSTMENT: 'bg-purple-50 text-purple-600'
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap gap-1.5">
          {['', 'PURCHASE', 'SALE', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                typeFilter === t ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white text-slate-400 border border-slate-100 hover:border-emerald-200'
              }`}>{t || 'All Types'}</button>
          ))}
        </div>
        <div className="relative group min-w-[280px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={14} />
          <input 
            type="text"
            placeholder="Search stock movements..."
            className="w-full bg-white border border-gray-100 rounded-xl pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-inner"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>
      ) : filteredLedger.length === 0 ? (
        <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
          <BookOpen size={48} className="mx-auto text-gray-200 mb-3 opacity-50" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching movements</h3>
          <p className="text-[10px] text-gray-300 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Date</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400">Product</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Type</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Qty</th>
                <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredLedger.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50/30 transition-colors group">
                  <td className="px-4 py-2 text-[11px] font-bold text-gray-600">{format(new Date(entry.createdAt), 'dd MMM hh:mm a')}</td>
                  <td className="px-4 py-2 text-xs font-bold text-gray-900">{entry.product?.name}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${typeColors[entry.type] || ''}`}>{entry.type.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span className={`text-xs font-black ${entry.quantity >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {entry.quantity >= 0 ? '+' : ''}{entry.quantity}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center text-xs font-bold text-gray-700">{entry.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockLedgerSection;
