import React, { useState, useEffect } from 'react';
import { 
  Truck, X, ChevronRight, Loader2
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const GRNSection = ({ can }) => {
  const [pos, setPOs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poDetail, setPODetail] = useState(null);
  const [grnItems, setGRNItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await procurementAPI.getPurchaseOrders({ status: undefined });
        // Show POs that can receive goods (not CLOSED or CANCELLED)
        setPOs(data.filter(po => !['CLOSED', 'CANCELLED'].includes(po.status)));
      } catch { toast.error('Failed to load POs'); }
      finally { setLoading(false); }
    };
    load();
  }, []);

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
      await procurementAPI.createGRN({
        poId: selectedPO,
        items: items.map(i => ({
          productId: i.productId,
          orderedQty: i.orderedQty,
          receivedQty: parseInt(i.receivedQty)
        }))
      });
      toast.success('Goods received successfully');
      setSelectedPO(null);
      setPODetail(null);
      // Refresh list
      const { data } = await procurementAPI.getPurchaseOrders({ status: undefined });
      setPOs(data.filter(po => !['CLOSED', 'CANCELLED'].includes(po.status)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error receiving goods');
    }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 className="animate-spin text-emerald-600" size={40} /></div>;

  return (
    <div className="space-y-4">
      {!selectedPO ? (
        <>
          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Select PO to Receive Goods</h4>
          {pos.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 border border-dashed border-gray-200 text-center">
              <Truck size={48} className="mx-auto text-gray-200 mb-3" />
              <h3 className="text-lg font-black text-gray-300">No Open POs for GRN</h3>
            </div>
          ) : (
            <div className="space-y-2">
              {pos.map(po => (
                <button key={po.id} onClick={() => selectPO(po.id)}
                  className="w-full text-left bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:border-emerald-200 transition-all flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-gray-900">PO #{po.poNumber}</span>
                    <p className="text-[10px] text-gray-400 font-bold">{po.vendor?.vendorName} • {format(new Date(po.poDate), 'dd MMM yyyy')} • {po.items?.length} items</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">{po.status}</span>
                    <ChevronRight size={16} className="text-gray-300" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-gray-900">GRN for PO #{poDetail?.poNumber}</h4>
              <p className="text-[10px] text-gray-400 font-bold">{poDetail?.vendor?.vendorName}</p>
            </div>
            <button onClick={() => { setSelectedPO(null); setPODetail(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
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
                        className="w-20 bg-gray-50 rounded-lg px-2 py-1.5 text-xs font-bold border border-gray-200 text-center" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {can('PROCUREMENT', 'CREATE', 'GRN') ? (
            <button onClick={handleSubmitGRN} disabled={submitting}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-700 disabled:opacity-50 transition-all">
              {submitting ? 'Processing...' : 'Submit Goods Receipt'}
            </button>
          ) : (
            <p className="text-center text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 p-3 rounded-xl border border-rose-100">
              You do not have permission to process GRN
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GRNSection;
