import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Loader2, 
  Fuel, 
  History, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar,
  Camera,
  AlertCircle,
  PlusCircle,
  TrendingDown,
  CheckCircle2,
  Filter,
  X,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import adminAPI from '../../../services/adminService';

export default function FuelLogsSection({ storeId, vehicles }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    odometer: '',
    liters: '',
    rate: '',
    totalAmount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    paymentMode: 'CASH',
    billImage: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [storeId]);

  const fetchLogs = async () => {
    try {
      const response = await adminAPI.getFuelLogs({ storeId });
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Error fetching fuel logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = (liters, rate) => {
    const l = parseFloat(liters) || 0;
    const r = parseFloat(rate) || 0;
    setFormData(prev => ({...prev, totalAmount: (l * r).toFixed(2)}));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({ ...formData, billImage: file });
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => {
        form.append(key, formData[key]);
      });
      form.append('storeId', storeId);

      const response = await adminAPI.addFuelLog(form);

      if (response.data.success) {
        toast.success('Fuel log recorded!');
        setFormData({
          vehicleId: '',
          odometer: '',
          liters: '',
          rate: '',
          totalAmount: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          paymentMode: 'CASH',
          billImage: null
        });
        setPreviewUrl(null);
        setShowForm(false);
        fetchLogs();
      } else {
        toast.error(response.data.message || 'Failed to record fuel log');
      }
    } catch (error) {
      console.error('Fuel Submission Error:', error);
      toast.error('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Analyzing Fuel Efficiency...</p>
      </div>
    );
  }

  const totalExpenditure = logs.reduce((acc, l) => acc + (Number(l.totalAmount) || 0), 0);
  const totalLiters = logs.reduce((acc, l) => acc + (Number(l.liters) || 0), 0);

  return (
    <div className="h-full animate-in fade-in duration-500">
      {showForm ? (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col">
          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl overflow-hidden flex flex-col flex-1">
            {/* Ultra Compact Header */}
            <div className="px-8 py-6 bg-emerald-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowForm(false)}
                  className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h4 className="text-lg font-black tracking-tight leading-none">Fuel Entry Details</h4>
                  <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Record refueling event & generate expense</p>
                </div>
              </div>
              <TrendingUp size={28} className="opacity-20" />
            </div>

            <form onSubmit={handleSubmit} className="p-8 flex flex-col flex-1 overflow-hidden">
              <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Column 1: Vehicle & Date */}
                <div className="space-y-5">
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Identity & Timeline</label>
                    <div className="space-y-4">
                      <select 
                        required
                        value={formData.vehicleId}
                        onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                        className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      >
                        <option value="">Select Vehicle...</option>
                        {vehicles.map(v => (
                          <option key={v.id} value={v.id}>{v.vehicleNumber}</option>
                        ))}
                      </select>
                      <input 
                        type="date"
                        required
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                        className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Mileage Tracking</label>
                    <input 
                      type="number"
                      required
                      value={formData.odometer}
                      onChange={e => setFormData({...formData, odometer: e.target.value})}
                      className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      placeholder="ODO Reading (km)"
                    />
                  </div>
                </div>

                {/* Column 2: Consumption & Rates */}
                <div className="space-y-5">
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Fuel Data</label>
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="number"
                        step="0.01"
                        required
                        value={formData.liters}
                        onChange={e => {
                          setFormData({...formData, liters: e.target.value});
                          calculateTotal(e.target.value, formData.rate);
                        }}
                        className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="Liters"
                      />
                      <input 
                        type="number"
                        step="0.01"
                        required
                        value={formData.rate}
                        onChange={e => {
                          setFormData({...formData, rate: e.target.value});
                          calculateTotal(formData.liters, e.target.value);
                        }}
                        className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="Rate/L"
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50/30 p-5 rounded-3xl border border-emerald-100/50">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block">Total Cost</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black">₹</span>
                      <input 
                        type="number"
                        required
                        value={formData.totalAmount}
                        onChange={e => setFormData({...formData, totalAmount: e.target.value})}
                        className="w-full bg-white border-emerald-100 text-emerald-700 rounded-xl py-3.5 pl-8 pr-4 text-lg font-black focus:ring-2 focus:ring-emerald-500 transition-all outline-none shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Payment Info</label>
                    <select 
                      value={formData.paymentMode}
                      onChange={e => setFormData({...formData, paymentMode: e.target.value})}
                      className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                    >
                      <option value="CASH">Cash (In-Hand)</option>
                      <option value="UPI">UPI / Digital</option>
                      <option value="CARD">Card</option>
                    </select>
                  </div>
                </div>

                {/* Column 3: Documentation */}
                <div className="flex flex-col">
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50 flex flex-col flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Receipt Verification</label>
                    <input 
                      type="file"
                      id="fuel-bill-compact"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <label 
                      htmlFor="fuel-bill-compact"
                      className="w-full flex-1 bg-white border-2 border-dashed border-gray-100 hover:border-emerald-300 rounded-[2rem] flex flex-col items-center justify-center gap-4 cursor-pointer transition-all group"
                    >
                       {previewUrl ? (
                         <div className="flex flex-col items-center gap-3">
                           <img src={previewUrl} className="h-32 w-auto rounded-xl object-cover border-2 border-emerald-500" alt="Preview" />
                           <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Change File</span>
                         </div>
                       ) : (
                         <>
                          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Camera size={24} className="text-emerald-600" />
                          </div>
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center px-4">Click to upload fuel receipt</span>
                         </>
                       )}
                    </label>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center gap-4 mt-8 pt-6 border-t border-gray-50 shrink-0">
                <button 
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-8 py-4 bg-gray-100 text-gray-600 font-black uppercase tracking-widest text-[10px] rounded-2xl hover:bg-gray-200 transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-2xl shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : (
                    <>
                      <CheckCircle2 size={18} />
                      Log Refueling & Create Expense
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Compact Header for History View */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-gray-100 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center">
                <Fuel size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Fuel Management</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Consumption & Efficiency Tracking</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex gap-4 border-r border-gray-100 pr-6">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Spend</p>
                        <p className="text-lg font-black text-emerald-600">₹{totalExpenditure.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Liters</p>
                        <p className="text-lg font-black text-emerald-600">{totalLiters.toFixed(2)} L</p>
                    </div>
                </div>
                
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={16} /> Log New Fuel
                </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-4 text-left">Vehicle / Date</th>
                    <th className="px-8 py-4 text-center">Quantity</th>
                    <th className="px-8 py-4 text-center">Odometer</th>
                    <th className="px-8 py-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-12 text-center text-gray-400 font-medium italic text-xs">No fuel logs found</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-gray-800 tracking-tight">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : '--'}</p>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">{log.vehicle?.vehicleNumber}</p>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="text-xs font-black text-gray-900">{log.liters} L</span>
                            <span className="text-[9px] font-bold text-gray-400">@ ₹{log.rate}/L</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className="text-xs font-bold text-gray-600">{log.odometer} km</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <p className="text-sm font-black text-gray-900">₹{(Number(log.totalAmount) || 0).toLocaleString()}</p>
                            {log.billImage && (
                              <a href={log.billImage} target="_blank" rel="noreferrer" className="text-[9px] font-black text-emerald-600 hover:underline mt-1 uppercase tracking-widest">View Receipt</a>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
