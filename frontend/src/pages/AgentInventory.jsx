import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, Loader2, Search, Plus, Minus, X, Gift, History, Calendar, User, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { productsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function AgentInventory() {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' or 'history'
  const [inventory, setInventory] = useState([]);
  const [auditHistory, setAuditHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFreeOnly, setFilterFreeOnly] = useState(false);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [refillItems, setRefillItems] = useState({}); // { [productId]: quantity }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refillSearchQuery, setRefillSearchQuery] = useState('');
  const [expandedAuditId, setExpandedAuditId] = useState(null);

  const navigate = useNavigate();
  const { vehicleId } = useParams();

  useEffect(() => {
    if (vehicleId && vehicleId !== 'undefined' && vehicleId !== 'null') {
      if (activeTab === 'stock') {
        fetchInventory();
      } else {
        fetchAuditHistory();
      }
    } else {
      setLoading(false);
    }
  }, [vehicleId, activeTab]);

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

  const fetchAuditHistory = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getAuditHistory(vehicleId);
      setAuditHistory(data);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load audit history');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllProductsForRefill = async () => {
    try {
      setLoading(true);
      const { data } = await productsAPI.getAll({ showAll: true });
      setAllProducts(data);
      setShowRefillModal(true);
    } catch (error) {
      toast.error('Failed to load products for refill layout');
    } finally {
      setLoading(false);
    }
  };

  const handleRefillSubmit = async () => {
    const items = Object.entries(refillItems)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => ({ productId: id, quantity: qty }));

    if (items.length === 0) {
      return toast.error('Please add quantities to request a refill');
    }

    try {
      setIsSubmitting(true);
      await productsAPI.requestRefill({ vehicleId, items });
      toast.success('Refill requested successfully!');
      setShowRefillModal(false);
      setRefillItems({});
    } catch (error) {
      toast.error('Failed to submit refill request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const refillToInitial = async () => {
    try {
      setLoading(true);
      // Fetch all products if not already loaded for the modal
      if (allProducts.length === 0) {
        const { data } = await productsAPI.getAll({ showAll: true });
        setAllProducts(data);
      }

      const newRefillItems = {};
      let hasItemsToRefill = false;

      inventory.forEach(item => {
        const targetCapacity = Math.max(item.openingQuantity || 0, item.quantity);
        const diff = targetCapacity - item.quantity;
        if (diff > 0) {
          newRefillItems[item.productId] = diff;
          hasItemsToRefill = true;
        }
      });

      if (!hasItemsToRefill) {
        toast.error('Inventory is already at full capacity');
        return;
      }

      setRefillItems(newRefillItems);
      setShowRefillModal(true);
    } catch (error) {
      toast.error('Failed to prepare refill');
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.product?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFree = !filterFreeOnly || item.product?.isFree;
    return matchesSearch && matchesFree;
  });

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in pb-[calc(var(--safe-bottom)+2rem)]">
      {/* Header */}
      <div className="sticky top-0 z-40 px-5 pt-[calc(var(--safe-top)+0.5rem)] pb-3 flex flex-col gap-3 bg-white border-b border-gray-100 max-w-lg mx-auto transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2.5 rounded-2xl hover:bg-emerald-50 active:scale-90 transition-all bg-white shadow-sm border border-emerald-100 text-emerald-700">
              <ArrowLeft size={22} strokeWidth={2.5} />
            </button>
            <h1 className="text-xl font-black text-emerald-950 tracking-tight">Inventory</h1>
          </div>
          {activeTab === 'stock' && (
            <div className="flex items-center gap-2">
              <button
                onClick={refillToInitial}
                className="px-3 py-2 bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors rounded-xl font-black text-xs flex items-center gap-2 shadow-sm"
              >
                <Package size={16} /> Original
              </button>
              <button
                onClick={fetchAllProductsForRefill}
                className="px-3 py-2 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded-xl font-black text-xs flex items-center gap-2 shadow-sm"
              >
                <Plus size={16} /> Custom
              </button>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-inner">
          <button
            onClick={() => setActiveTab('stock')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stock' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Package size={14} /> Current Stock
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <History size={14} /> Tracking History
          </button>
        </div>

        {activeTab === 'stock' && (
          <div className="flex items-center gap-3 bg-white border border-emerald-100 p-2 rounded-2xl shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
            <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500">
              <Search size={18} strokeWidth={2.5} />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-emerald-950 placeholder-emerald-950/30"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto px-5 pt-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-emerald-600" size={40} />
            <p className="text-sm font-black text-emerald-900/40 uppercase tracking-widest">Loading...</p>
          </div>
        ) : (!vehicleId || vehicleId === 'undefined' || vehicleId === 'null' || vehicleId === 'none') ? (
          <div className="glass rounded-[2rem] p-10 flex flex-col items-center text-center border border-rose-50 bg-white/70 shadow-sm">
            <X size={48} className="text-rose-300 mb-4" />
            <p className="text-sm font-black text-rose-900 uppercase tracking-widest">No Vehicle Assigned</p>
            <p className="text-[10px] font-bold text-rose-600 mt-2 uppercase tracking-tighter">Please contact your administrator to assign a vehicle to your profile.</p>
          </div>
        ) : activeTab === 'stock' ? (
          <>
            {filteredInventory.length === 0 ? (
              <div className="glass rounded-[2rem] p-10 flex flex-col items-center text-center border border-emerald-50 bg-white/70 shadow-sm opacity-60">
                <Package size={48} className="text-emerald-300 mb-4" />
                <p className="text-sm font-black text-emerald-900 uppercase tracking-widest">No Items Found</p>
                <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-tighter">Stock may not be assigned yet.</p>
              </div>
            ) : (
              <>
                {/* Total Value Card */}
                <div className="bg-blue-600 rounded-[2rem] p-6 shadow-xl shadow-blue-600/20 relative overflow-hidden group">
                  <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-gradient-to-br from-white/20 to-transparent blur-[40px] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
                  <div className="relative flex justify-between items-center text-white">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Inventory Value</p>
                      <p className="text-3xl font-black tracking-tighter">₹{
                        filteredInventory.reduce((acc, item) => acc + (item.quantity * (item.product?.price || 0)), 0)
                          .toLocaleString('en-IN', { minimumFractionDigits: 2 })
                      }</p>
                    </div>
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                      <Package size={28} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                {/* Inventory List */}
                <div className="space-y-3">
                  {filteredInventory.map((item) => (
                    <div key={item.id} className="glass rounded-xl p-3 bg-white shadow-sm flex items-center gap-3 border border-gray-100/50 hover:border-emerald-200 transition-all active:scale-[0.99]">
                      <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 overflow-hidden border border-emerald-100/50 shadow-inner shrink-0 leading-none">
                        {item.product?.image ? (
                          <img src={item.product?.image} alt={item.product?.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package size={20} strokeWidth={2} />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <h3 className="text-sm font-black text-emerald-950 tracking-tight leading-tight mb-1 truncate">{item.product?.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100/30">
                            {item.product?.category?.name || 'Item'}
                          </span>
                          {item.product?.unit && (
                            <span className="text-[10px] font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded uppercase tracking-tighter border border-emerald-50">
                              {item.product.unitValue || ''} {item.product.unit.type}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 pl-4 border-l border-gray-100/50">
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-0.5">Total</span>
                          <span className="text-xs font-black text-emerald-900/60">{Math.max(item.openingQuantity || 0, item.quantity)}</span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-black text-emerald-800/40 uppercase tracking-widest mb-0.5">Rem</span>
                          <span className="text-lg font-black text-emerald-950 tracking-tighter leading-none">{item.quantity}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          /* History View */
          <div className="space-y-4">
            {auditHistory.length === 0 ? (
              <div className="glass rounded-[2rem] p-10 flex flex-col items-center text-center border border-slate-100 bg-white/70 shadow-sm opacity-60">
                <History size={48} className="text-slate-300 mb-4" />
                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">No Audit History</p>
                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-tighter">Inventory tracking records will appear here after audits.</p>
              </div>
            ) : (
              auditHistory.map((audit) => (
                <div key={audit.id} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden transition-all">
                  <div 
                    onClick={() => setExpandedAuditId(expandedAuditId === audit.id ? null : audit.id)}
                    className="p-4 cursor-pointer hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 flex items-center justify-center text-fuchsia-600 border border-fuchsia-100">
                        <History size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-black text-fuchsia-600 uppercase tracking-widest bg-fuchsia-50 px-2 py-0.5 rounded border border-fuchsia-100 shadow-sm">Stock Audit</span>
                          <span className="text-[9px] font-bold text-slate-400">{format(new Date(audit.createdAt), 'hh:mm a')}</span>
                        </div>
                        <p className="text-sm font-black text-slate-900 tracking-tight leading-none mb-1">
                          {format(new Date(audit.createdAt), 'do MMMM yyyy')}
                        </p>
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                          <User size={10} className="text-slate-300" /> {audit.user?.name || 'Admin'}
                        </div>
                      </div>
                    </div>
                    {expandedAuditId === audit.id ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>

                  {expandedAuditId === audit.id && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-300">
                      {audit.remark && (
                        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3">
                          <Info size={14} className="text-slate-400 mt-0.5" />
                          <p className="text-xs font-bold text-slate-600 italic">"{audit.remark}"</p>
                        </div>
                      )}
                      
                      <div className="space-y-1 border-t border-slate-100 pt-3">
                        <div className="grid grid-cols-12 gap-2 px-2 mb-1">
                          <span className="col-span-6 text-[8px] font-black text-slate-400 uppercase tracking-widest">Adjusted Product</span>
                          <span className="col-span-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">System</span>
                          <span className="col-span-2 text-[8px] font-black text-emerald-600 uppercase tracking-widest text-center">Audited</span>
                          <span className="col-span-2 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Var</span>
                        </div>
                        {audit.items?.map((item) => {
                          const diff = (item.newQuantity || 0) - (item.oldQuantity || 0);
                          return (
                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded-xl bg-slate-50/50 border border-slate-100/30">
                              <div className="col-span-6 flex flex-col min-w-0">
                                <span className="text-[11px] font-black text-slate-800 truncate leading-tight uppercase">{item.product?.name}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter truncate">
                                  {item.product?.category?.name || 'General'}
                                </span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-[10px] font-bold text-slate-400">{item.oldQuantity}</span>
                              </div>
                              <div className="col-span-2 text-center">
                                <span className="text-[10px] font-black text-emerald-600">{item.newQuantity}</span>
                              </div>
                              <div className="col-span-2 flex justify-end">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[8px] font-black border-2 shadow-sm shrink-0 ${
                                  diff === 0 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-500' 
                                    : diff > 0 
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-500 animate-pulse'
                                      : 'bg-rose-50 text-rose-600 border-rose-500 animate-pulse'
                                }`}>
                                  {diff === 0 ? 'FIXED' : diff > 0 ? `+${diff}` : diff}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {showRefillModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center p-4">
          <div className="bg-white w-full max-w-lg rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8">
            <div className="p-5 border-b border-gray-100 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-emerald-950">Request Refill</h2>
                  <p className="text-xs font-bold text-gray-500">Request stock from the warehouse.</p>
                </div>
                <button
                  onClick={() => { setShowRefillModal(false); setRefillItems({}); setRefillSearchQuery(''); }}
                  className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white border border-emerald-100 p-2 rounded-xl shadow-sm focus-within:ring-4 focus-within:ring-emerald-500/10 transition-all">
                <div className="bg-emerald-50 p-1.5 rounded-xl text-emerald-500">
                  <Search size={18} strokeWidth={2.5} />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm font-bold text-emerald-950 placeholder-emerald-950/30"
                  value={refillSearchQuery}
                  onChange={(e) => setRefillSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-y-auto p-5 space-y-3 custom-scrollbar flex-1">
              {allProducts.filter(p => {
                const matchesSearch = p.name?.toLowerCase().includes(refillSearchQuery.toLowerCase());
                const matchesFree = !filterFreeOnly || p.isFree;
                return matchesSearch && matchesFree;
              }).sort((a, b) => a.name.localeCompare(b.name)).map(p => {
                const currentStock = inventory.find(i => i.productId === p.id)?.quantity || 0;
                const reqQty = refillItems[p.id] || 0;
                return (
                  <div key={`refill-${p.id}`} className="p-3 bg-gray-50 rounded-2xl flex items-center justify-between border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 bg-white border border-gray-100 rounded-xl shadow-sm flex items-center justify-center overflow-hidden shrink-0">
                        {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-300" />}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-gray-800 truncate">{p.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded cursor-default border border-emerald-100 shrink-0">
                            Current: {currentStock}
                          </span>
                          <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest bg-orange-50 px-1.5 py-0.5 rounded cursor-default border border-orange-100 shrink-0">
                            ₹{p.price}
                          </span>
                        </div>
                      </div>
                    </div>
                    {/* Add/remove controls */}
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <button
                        onClick={() => setRefillItems(prev => ({ ...prev, [p.id]: Math.max(0, reqQty - 1) }))}
                        className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 shadow-sm"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-6 text-center font-black text-emerald-950 text-lg">{reqQty}</span>
                      <button
                        onClick={() => setRefillItems(prev => ({ ...prev, [p.id]: reqQty + 1 }))}
                        className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 shadow-sm active:scale-95"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="p-5 border-t border-gray-100 bg-white rounded-b-[2rem]">
              <button
                onClick={handleRefillSubmit}
                disabled={isSubmitting}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98] flex justify-center items-center gap-2 transition-all disabled:opacity-50"
              >
                {isSubmitting ? <><Loader2 className="animate-spin" size={20} /> Submitting...</> : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
