import React, { useState, useEffect } from 'react';
import { 
  Search, CheckCircle2, XCircle, Clock, 
  ShieldCheck, AlertCircle, Eye, ClipboardCheck,
  MessageSquare, Package, ChevronRight
} from 'lucide-react';
import { procurementAPI } from '../../../services/procurementService';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

export default function QCSection({ can, setHeaderExtra, storeId }) {
  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrn, setSelectedGrn] = useState(null);

  useEffect(() => {
    fetchGrns();
  }, [storeId]);

  const fetchGrns = async () => {
    setLoading(true);
    try {
      const res = await procurementAPI.getGRNs({ storeId });
      // Only show GRNs that have pending items
      const grnList = res.data || [];
      const pendingGrns = grnList.filter(grn => 
        grn.items.some(item => item.qcStatus === 'PENDING')
      );
      setGrns(pendingGrns);
    } catch (err) {
      toast.error('Failed to fetch GRNs for QC');
    } finally {
      setLoading(false);
    }
  };

  const handleQC = async (itemId, status, remarks) => {
    try {
      await procurementAPI.updateQCStatus(itemId, { status, remarks });
      toast.success(`QC ${status.toLowerCase()} successfully`);
      fetchGrns();
      if (selectedGrn) {
        const updatedGrns = await procurementAPI.getGRNs({ storeId });
        const updatedSelected = updatedGrns.data.find(g => g.id === selectedGrn.id);
        setSelectedGrn(updatedSelected);
      }
    } catch (err) {
      toast.error('Failed to update QC status');
    }
  };

  return (
    <div className="flex-1 flex gap-6 min-h-0 overflow-hidden">
      {/* Left List */}
      <div className={`flex flex-col gap-4 min-w-[320px] max-w-[400px] h-full ${selectedGrn ? 'hidden md:flex' : 'flex-1 md:flex'}`}>
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search GRNs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 transition-all"
            />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Pending Quality Checks ({grns.length})</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
            </div>
          ) : grns.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 border-2 border-dashed border-gray-100 text-center space-y-4">
              <ShieldCheck className="mx-auto text-gray-300" size={32} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">All QC Clear</p>
            </div>
          ) : (
            grns.filter(g => g.displayId.toLowerCase().includes(searchTerm.toLowerCase())).map(grn => (
              <button
                key={grn.id}
                onClick={() => setSelectedGrn(grn)}
                className={`w-full text-left p-5 rounded-[2rem] border transition-all ${
                  selectedGrn?.id === grn.id 
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xl shadow-emerald-600/20' 
                    : 'bg-white border-gray-100 hover:border-emerald-100 shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest ${selectedGrn?.id === grn.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                    {grn.displayId}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                    selectedGrn?.id === grn.id ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {grn.items.filter(i => i.qcStatus === 'PENDING').length} PENDING
                  </span>
                </div>
                <h4 className="font-black tracking-tight mb-1">{grn.po?.vendor?.vendorName || 'General Purchase'}</h4>
                <div className="flex items-center gap-2 text-[10px] font-bold opacity-60">
                  <Clock size={12} /> {format(new Date(grn.createdAt), 'dd MMM, HH:mm')}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Content */}
      <div className={`flex-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col ${!selectedGrn ? 'hidden md:flex' : 'flex'}`}>
        {selectedGrn ? (
          <>
            {/* Header */}
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ClipboardCheck size={28} strokeWidth={2.5} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-gray-900 tracking-tight uppercase">Quality Check: {selectedGrn.displayId}</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Verify received goods before they enter saleable stock</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedGrn(null)}
                className="md:hidden p-3 bg-gray-50 rounded-xl text-gray-400"
              >
                <XCircle size={24} />
              </button>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white z-20">
                  <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
                    <th className="py-4 pl-8">Product Details</th>
                    <th className="py-4">Received Qty</th>
                    <th className="py-4">Status</th>
                    <th className="py-4 text-right pr-8 sticky right-0 bg-white z-20 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {selectedGrn.items.map((item) => (
                    <tr key={item.id} className="group hover:bg-gray-50/50">
                      <td className="py-6 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                            <Package size={20} />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-gray-900 tracking-tight">{item.product?.name}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase">SKU: {item.product?.skuCode || 'N/A'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-6">
                        <span className="text-sm font-black text-gray-900">{item.receivedQty} UNITS</span>
                      </td>
                      <td className="py-6 whitespace-nowrap">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full border uppercase tracking-widest ${
                          item.qcStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          item.qcStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                          'bg-rose-50 text-rose-600 border-rose-100'
                        }`}>
                          {item.qcStatus}
                        </span>
                      </td>
                      <td className="py-6 text-right sticky right-0 bg-white group-hover:bg-gray-50/50 transition-all z-10 shadow-[-10px_0_10px_-3px_rgba(0,0,0,0.05)] whitespace-nowrap">
                        {item.qcStatus === 'PENDING' ? (
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleQC(item.id, 'REJECTED', 'Failed QC')}
                              className="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                              title="Reject Item"
                            >
                              <XCircle size={18} strokeWidth={2.5} />
                            </button>
                            <button 
                              onClick={() => handleQC(item.id, 'APPROVED', 'Passed QC')}
                              className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-90"
                              title="Approve Item"
                            >
                              <CheckCircle2 size={18} strokeWidth={2.5} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <MessageSquare size={10} /> {item.qcRemarks || 'No remarks'}
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-6">
            <div className="w-32 h-32 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
              <ShieldCheck size={64} strokeWidth={1} />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Ready for Validation</h3>
              <p className="text-sm font-bold text-gray-400 max-w-sm mx-auto">Select a Goods Receipt from the left to begin quality inspection. Items will only enter inventory after approval.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
