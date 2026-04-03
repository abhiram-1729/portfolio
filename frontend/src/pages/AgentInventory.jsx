import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, Search } from 'lucide-react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function AgentInventory() {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const navigate = useNavigate();
  const { vehicleId } = useParams();

  useEffect(() => {
    fetchInventory();
  }, [vehicleId]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getVehicleInventory(vehicleId);
      setInventory(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load vehicle inventory');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => 
    item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-[calc(var(--safe-bottom)+2rem)]">
      {/* Header */}
      <div className="sticky top-0 z-40 px-5 pt-[calc(var(--safe-top)+0.5rem)] pb-3 flex flex-col gap-3 bg-white border-b border-gray-100 max-w-lg mx-auto transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl hover:bg-emerald-50 active:scale-90 transition-all bg-white shadow-sm border border-emerald-100 text-emerald-700">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-black text-emerald-950 tracking-tight">Vehicle Inventory</h1>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 p-3 rounded-2xl shadow-sm">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search items..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-sm font-black text-emerald-900/40 uppercase tracking-widest">Loading Stock...</p>
          </div>
        ) : filteredInventory.length === 0 ? (
          <div className="glass rounded-[2rem] p-10 flex flex-col items-center text-center border border-emerald-50 bg-white/70 shadow-sm opacity-60">
            <Package size={48} className="text-emerald-300 mb-4" />
            <p className="text-sm font-black text-emerald-900 uppercase tracking-widest">No Items Found</p>
            <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-tighter">Stock may not be assigned yet.</p>
          </div>
        ) : (
          filteredInventory.map((item) => (
            <div key={item.id} className="glass rounded-xl p-2.5 bg-white/70 border border-emerald-50 shadow-sm flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 overflow-hidden border border-emerald-100/50 shadow-inner shrink-0">
                {item.product?.image ? (
                  <img src={item.product?.image} alt={item.product?.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={20} strokeWidth={2} />
                )}
              </div>
              <div className="flex-1 flex flex-col justify-center">
                <h3 className="text-sm font-black text-emerald-950 tracking-tight leading-tight line-clamp-1 mb-1">{item.product?.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                    {item.product?.category?.name || 'Item'}
                  </span>
                  <span className="text-[10px] font-black text-emerald-700">₹{item.product?.price}</span>
                </div>
              </div>

              <div className="flex flex-col items-end pl-3 border-l border-emerald-50">
                <span className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-0.5">Qty</span>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-lg font-black text-emerald-950 tracking-tighter leading-none">{item.quantity}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
