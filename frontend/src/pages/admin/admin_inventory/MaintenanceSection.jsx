import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Loader2, 
  Wrench, 
  Calendar, 
  User, 
  Camera, 
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  History,
  CheckCircle2,
  Filter,
  X,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import adminAPI from '../../../services/adminService';

export default function MaintenanceSection({ storeId, vehicles }) {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    vehicleId: '',
    serviceType: 'General Service',
    amount: '',
    odometer: '',
    mechanicName: '',
    details: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    billImage: null
  });
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, [storeId]);

  const fetchLogs = async () => {
    try {
      const response = await adminAPI.getMaintenanceLogs({ storeId });
      if (response.data.success) {
        setLogs(response.data.logs);
      }
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
    } finally {
      setLoading(false);
    }
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

      const response = await adminAPI.addMaintenanceLog(form);

      if (response.data.success) {
        toast.success('Maintenance log recorded!');
        setFormData({
          vehicleId: '',
          serviceType: 'General Service',
          amount: '',
          odometer: '',
          mechanicName: '',
          details: '',
          date: format(new Date(), 'yyyy-MM-dd'),
          billImage: null
        });
        setPreviewUrl(null);
        setShowForm(false);
        fetchLogs();
      } else {
        toast.error(response.data.message || 'Failed to record maintenance');
      }
    } catch (error) {
      console.error('Submission Error:', error);
      toast.error('Connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading Service History...</p>
      </div>
    );
  }

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
                  <h4 className="text-lg font-black tracking-tight leading-none">Record Maintenance</h4>
                  <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80">Log repairs & part replacements</p>
                </div>
              </div>
              <ShieldCheck size={28} className="opacity-20" />
            </div>

            <form onSubmit={handleSubmit} className="p-8 flex flex-col flex-1 overflow-hidden">
              <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
                {/* Column 1: Basic Info */}
                <div className="space-y-5">
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Vehicle & Date</label>
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
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Service Details</label>
                    <div className="space-y-4">
                      <select 
                        required
                        value={formData.serviceType}
                        onChange={e => setFormData({...formData, serviceType: e.target.value})}
                        className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      >
                        <option value="General Service">General Service</option>
                        <option value="Engine Repair">Engine Repair</option>
                        <option value="Tire Change">Tire Change</option>
                        <option value="Oil Change">Oil Change</option>
                        <option value="Brake Work">Brake Work</option>
                        <option value="Electrical">Electrical</option>
                        <option value="Body Work">Body Work</option>
                        <option value="Other">Other</option>
                      </select>
                      <input 
                        type="number"
                        step="0.1"
                        value={formData.odometer}
                        onChange={e => setFormData({...formData, odometer: e.target.value})}
                        className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                        placeholder="ODO Reading (km)"
                      />
                    </div>
                  </div>
                </div>

                {/* Column 2: Financial & Workshop */}
                <div className="space-y-5">
                  <div className="bg-emerald-50/30 p-5 rounded-3xl border border-emerald-100/50">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block">Cost Analysis</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-black">₹</span>
                      <input 
                        type="number"
                        required
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                        className="w-full bg-white border-emerald-100 text-emerald-700 rounded-xl py-3.5 pl-8 pr-4 text-lg font-black focus:ring-2 focus:ring-emerald-500 transition-all outline-none shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Workshop Info</label>
                    <input 
                      type="text"
                      value={formData.mechanicName}
                      onChange={e => setFormData({...formData, mechanicName: e.target.value})}
                      className="w-full bg-white border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                      placeholder="Mechanic / Workshop Name"
                    />
                  </div>

                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50 flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Upload Bill</label>
                    <input 
                      type="file"
                      id="maintenance-bill-compact"
                      className="hidden"
                      onChange={handleFileChange}
                      accept="image/*"
                    />
                    <label 
                      htmlFor="maintenance-bill-compact"
                      className="w-full h-24 bg-white border-2 border-dashed border-gray-100 hover:border-emerald-300 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                       {previewUrl ? (
                         <img src={previewUrl} className="h-20 w-auto rounded-lg object-cover border-2 border-emerald-500" alt="Preview" />
                       ) : (
                         <>
                          <Camera size={20} className="text-gray-300" />
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attach Receipt</span>
                         </>
                       )}
                    </label>
                  </div>
                </div>

                {/* Column 3: Work Details */}
                <div className="flex flex-col">
                  <div className="bg-gray-50/50 p-5 rounded-3xl border border-gray-100/50 flex flex-col flex-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Work Report</label>
                    <textarea 
                      required
                      value={formData.details}
                      onChange={e => setFormData({...formData, details: e.target.value})}
                      className="w-full bg-white border-gray-100 rounded-2xl py-4 px-5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all outline-none resize-none flex-1"
                      placeholder="Describe parts replaced or work done in detail..."
                    />
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
                      Finalize Maintenance Entry
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
                <Wrench size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Fleet Maintenance</h3>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Service logs & operational health</p>
              </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex gap-4 border-r border-gray-100 pr-6">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">History</p>
                        <p className="text-lg font-black text-emerald-600">{logs.length}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Spend</p>
                        <p className="text-lg font-black text-emerald-600">₹{logs.reduce((acc, l) => acc + (Number(l.amount) || 0), 0).toLocaleString()}</p>
                    </div>
                </div>
                
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={16} /> Record Maintenance
                </button>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-8 py-4 text-left">Vehicle / Date</th>
                    <th className="px-8 py-4 text-left">Service Type</th>
                    <th className="px-8 py-4 text-left">Details</th>
                    <th className="px-8 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-12 text-center text-gray-400 font-medium italic text-xs">No maintenance history found</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-8 py-5">
                          <p className="text-xs font-black text-gray-800 tracking-tight">{log.date ? format(new Date(log.date), 'dd MMM yyyy') : '--'}</p>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mt-0.5">{log.vehicle?.vehicleNumber}</p>
                        </td>
                        <td className="px-8 py-5">
                          <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-emerald-100">{log.serviceType}</span>
                        </td>
                        <td className="px-8 py-5 max-w-sm">
                          <p className="text-[11px] text-gray-600 line-clamp-1">{log.details || 'No details'}</p>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex flex-col items-end">
                            <p className="text-sm font-black text-gray-900">₹{(Number(log.amount) || 0).toLocaleString()}</p>
                            {log.billImage && (
                              <a href={log.billImage} target="_blank" rel="noreferrer" className="text-[9px] font-black text-emerald-600 hover:underline mt-1 uppercase tracking-widest">View Bill</a>
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
