import React, { useState, useEffect, useCallback } from 'react';
import { 
  Truck, X, ChevronRight, Loader2, Trash2, History, PackageCheck, Edit3
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const GRNSection = ({ can }) => {
  const [view, setView] = useState('receive'); // 'receive' or 'history'
  const [pos, setPOs] = useState([]);
  const [grns, setGRNs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [grnItems, setGRNItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editGRN, setEditGRN] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (view === 'receive') {
        const { data } = await procurementAPI.getPurchaseOrders({ status: undefined });
        setPOs(data.filter(po => !['CLOSED', 'CANCELLED'].includes(po.status)));
      } else {
        const { data } = await procurementAPI.getGRNs();
        setGRNs(data);
      }
    } catch { toast.error('Failed to load data'); }
    finally { setLoading(false); }
  }, [view]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectPO = async (poId) => {
    try {
      const { data } = await procurementAPI.getPurchaseOrderById(poId);
      setSelectedPO(poId);
      setPODetail(data);
      setGRNItems(data.items.map(item => ({
        productId: item.productId,
        name: item.product?.name,
        orderedQty: item.quantity,
        alreadyReceived: item.receivedQty || 0,
        balance: item.quantity - (item.receivedQty || 0),
        receivedQty: ''
      })));
    } catch { toast.error('Failed to load PO details'); }
  };

  const handleSubmitGRN = async () => {
    const items = grnItems.filter(i => parseInt(i.receivedQty) > 0);
    if (items.length === 0) return toast.error('Enter received quantities');
    setSubmitting(true);
    try {
      if (editGRN) {
        await procurementAPI.updateGRN(editGRN.id, {
          items: items.map(i => ({
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: parseInt(i.receivedQty)
          }))
        });
        toast.success('Goods receipt updated');
      } else {
        await procurementAPI.createGRN({
          poId: selectedPO,
          items: items.map(i => ({
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: parseInt(i.receivedQty)
          }))
        });
        toast.success('Goods received successfully');
      }
      setSelectedPO(null);
      setPODetail(null);
      setEditGRN(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error processing GRN');
    }
    finally { setSubmitting(false); }
  };

  const handleEditGRN = (grn) => {
    setEditGRN(grn);
    setSelectedPO(grn.poId);
    setPODetail(grn.po);
    setGRNItems(grn.items.map(item => ({
      productId: item.productId,
      name: item.product?.name,
      orderedQty: item.orderedQty,
      alreadyReceived: 0, // This is tricky when editing, but we reset it for the logic
      balance: item.orderedQty, 
      receivedQty: String(item.receivedQty)
    })));
    setView('receive');
  };

  const handleDeleteGRN = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Goods Receipt? This will revert stock increases.')) return;
    try {
      await procurementAPI.deleteGRN(id);
      toast.success('Goods receipt deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting GRN');
    }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2 p-1 bg-gray-50/50 rounded-xl w-fit border border-gray-100">
        <button onClick={() => { setView('receive'); setSelectedPO(null); }} 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'receive' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
          <PackageCheck size={14} /> Receive Goods
        </button>
        <button onClick={() => setView('history')} 
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === 'history' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
          <History size={14} /> GRN History
        </button>
      </div>

      {view === 'receive' ? (
        !selectedPO ? (
          <>
            <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Select PO to Receive Goods</h4>
            {pos.length === 0 ? (
              <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
                <Truck size={48} className="mx-auto text-gray-200 mb-3" />
                <h3 className="text-lg font-black text-gray-300">No Open POs for GRN</h3>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">PO Details</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Items</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {pos.map(po => (
                      <tr 
                        key={po.id} 
                        onClick={() => selectPO(po.id)}
                        className="hover:bg-emerald-50/30 transition-all cursor-pointer group"
                      >
                        <td className="px-6 py-4">
                          <span className="text-sm font-black text-gray-900 group-hover:text-emerald-600 transition-colors">PO #{po.poNumber}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-gray-600">{po.vendor?.vendorName}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{format(new Date(po.poDate), 'dd MMM yyyy')}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded-md">{po.items?.length || 0} ITEMS</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                            po.status === 'DELIVERED' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end">
                            <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                              <ChevronRight size={14} strokeWidth={3} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => { setSelectedPO(null); setPODetail(null); setEditGRN(null); }}
                  className="p-2.5 bg-gray-50 border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm active:scale-95"
                >
                  <ChevronRight size={18} className="rotate-180" />
                </button>
                <div>
                  <h4 className="text-sm font-black text-gray-900">{editGRN ? `Edit GRN #${editGRN.displayId}` : `GRN for PO #${poDetail?.poNumber}`}</h4>
                  <p className="text-[10px] text-gray-400 font-bold">{poDetail?.vendor?.vendorName}</p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400">Item</th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Ordered</th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Already Rcvd</th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Balance</th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-400 text-center">Receive Now</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {grnItems.map((item, idx) => (
                    <tr key={item.productId}>
                      <td className="px-3 py-2 text-xs font-bold text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold text-gray-600">{item.orderedQty}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold text-emerald-600">{item.alreadyReceived}</td>
                      <td className="px-3 py-2 text-center text-xs font-bold text-orange-600">{item.balance}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" min="0" max={item.balance} value={item.receivedQty}
                          onChange={e => {
                            const updated = [...grnItems];
                            updated[idx].receivedQty = e.target.value;
                            setGRNItems(updated);
                          }}
                          className="w-20 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center focus:ring-2 focus:ring-emerald-500 outline-none" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {can('PROCUREMENT', 'CREATE', 'GRN') ? (
              <button onClick={handleSubmitGRN} disabled={submitting}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all active:translate-y-0">
                {submitting ? 'Processing...' : editGRN ? 'Update Goods Receipt' : 'Submit Goods Receipt'}
              </button>
            ) : (
              <p className="text-center text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 p-3 rounded-xl border border-rose-100">
                You do not have permission to process GRN
              </p>
            )}
          </div>
        )
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {grns.length === 0 ? (
            <div className="p-16 border-dashed border-gray-200 text-center">
              <History size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Receipt History</h3>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">GRN Details</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Related PO</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Vendor</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Items Received</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grns.map(grn => (
                  <tr key={grn.id} className="hover:bg-gray-50/50 transition-all group">
                    <td className="px-6 py-4">
                      <span className="text-sm font-black text-gray-900">GRN #{grn.displayId}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-gray-500">PO #{grn.po?.poNumber}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-gray-600">{grn.po?.vendor?.vendorName}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">{format(new Date(grn.createdAt), 'dd MMM yyyy')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {grn.items?.slice(0, 2).map(item => (
                          <span key={item.id} className="text-[9px] font-bold bg-gray-50 text-gray-600 px-2 py-1 rounded-lg border border-gray-100">
                            {item.product?.name} × {item.receivedQty}
                          </span>
                        ))}
                        {grn.items?.length > 2 && <span className="text-[9px] font-bold text-gray-400 self-center ml-1">+{grn.items.length - 2} more</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${grn.status === 'COMPLETE' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        {can('PROCUREMENT', 'UPDATE', 'GRN') && (
                          <button onClick={() => handleEditGRN(grn)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 transition-all" title="Edit GRN">
                            <Edit3 size={14} />
                          </button>
                        )}
                        {can('PROCUREMENT', 'DELETE', 'GRN') && (
                          <button onClick={() => handleDeleteGRN(grn.id)} className="p-2 bg-gray-50 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all" title="Delete GRN">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default GRNSection;
