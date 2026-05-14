import React, { useState, useEffect } from 'react';
import { History, Play, StopCircle, Clock, MapPin, Wallet, TrendingUp, AlertCircle, Loader2, Plus, Calendar } from 'lucide-react';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TripManagementSection({ storeId, vehicles }) {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [formData, setFormData] = useState({
    vehicleId: '',
    startOdometer: '',
    openingCash: '0',
    shift: 1,
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const [endData, setEndData] = useState({
    endOdometer: '',
    closingCash: '0',
    totalSales: '0',
    totalExpenses: '0'
  });

  useEffect(() => {
    loadTrips();
  }, [storeId]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getVehicleOpsTrips({ storeId });
      setTrips(res.data);
    } catch (error) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrip = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminAPI.startVehicleTrip(formData);
      toast.success('Trip started successfully');
      setShowStartModal(false);
      loadTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to start trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndTrip = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await adminAPI.endVehicleTrip(selectedTrip.id, endData);
      toast.success('Trip ended and reconciled');
      setShowEndModal(false);
      loadTrips();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to end trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium">Loading Trip Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Actions */}
      <div className="flex items-center justify-between bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-gray-100 shadow-sm">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Shift & Trip Management</h3>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">Control vehicle operational lifecycle</p>
        </div>
        <button
          onClick={() => setShowStartModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-95"
        >
          <Play size={16} fill="currentColor" />
          Start New Trip
        </button>
      </div>

      {/* Trip List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {trips.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-gray-50/50 rounded-[2rem] border-2 border-dashed border-gray-100">
            <History size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No trip history found for this store</p>
          </div>
        ) : (
          trips.map(trip => (
            <div 
              key={trip.id}
              className={`bg-white rounded-[2rem] border transition-all p-6 relative overflow-hidden group shadow-sm hover:shadow-xl ${trip.status === 'OPEN' ? 'border-emerald-200' : 'border-gray-100'}`}
            >
              {trip.status === 'OPEN' && (
                <div className="absolute top-0 right-0 px-4 py-1.5 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-bl-xl flex items-center gap-1 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                  Active Trip
                </div>
              )}

              <div className="flex items-center gap-4 mb-6">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${trip.status === 'OPEN' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                  <History size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 leading-tight">{trip.vehicle.vehicleNumber}</h4>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{trip.user.name}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Start ODO</p>
                  <p className="text-sm font-black text-gray-800">{trip.startOdometer} km</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">End ODO</p>
                  <p className="text-sm font-black text-gray-800">{trip.endOdometer || '--'} km</p>
                </div>
              </div>

              {trip.status === 'CLOSED' && (
                <div className="space-y-3 mb-6 bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/30">
                   <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Distance</span>
                    <span className="text-emerald-600 font-black">{(trip.endOdometer - trip.startOdometer).toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>Total Sales</span>
                    <span className="text-emerald-600 font-black">₹{trip.totalSales?.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  <Calendar size={12} />
                  {trip.date}
                </div>
                {trip.status === 'OPEN' ? (
                  <button 
                    onClick={() => { setSelectedTrip(trip); setShowEndModal(true); }}
                    className="px-4 py-2 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-colors shadow-lg shadow-rose-500/20"
                  >
                    Close Trip
                  </button>
                ) : (
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 px-3 py-1 bg-gray-100 rounded-lg">Completed</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Start Trip Modal */}
      {showStartModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-emerald-600 text-white">
              <h3 className="text-2xl font-black tracking-tight">Initialize Shift</h3>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mt-1">Setup vehicle and starting parameters</p>
            </div>
            
            <form onSubmit={handleStartTrip} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Select Vehicle</label>
                <select 
                  required
                  value={formData.vehicleId}
                  onChange={e => setFormData({...formData, vehicleId: e.target.value})}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                >
                  <option value="">Choose Vehicle...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.vehicleName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Start Odometer</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    placeholder="0.0"
                    value={formData.startOdometer}
                    onChange={e => setFormData({...formData, startOdometer: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Shift</label>
                  <select 
                    value={formData.shift}
                    onChange={e => setFormData({...formData, shift: parseInt(e.target.value)})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  >
                    <option value={1}>Morning (1)</option>
                    <option value={2}>Evening (2)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Opening Cash</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input 
                    type="number"
                    required
                    value={formData.openingCash}
                    onChange={e => setFormData({...formData, openingCash: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 pl-8 pr-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Initialize Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* End Trip Modal */}
      {showEndModal && selectedTrip && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
            <div className="p-8 border-b border-gray-100 bg-rose-600 text-white">
              <h3 className="text-2xl font-black tracking-tight">Shift Reconciliation</h3>
              <p className="text-rose-100 text-xs font-bold uppercase tracking-widest mt-1">Close active trip for {selectedTrip.vehicle.vehicleNumber}</p>
            </div>
            
            <form onSubmit={handleEndTrip} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">End Odometer (Min: {selectedTrip.startOdometer} km)</label>
                <input 
                  type="number"
                  step="0.1"
                  required
                  min={selectedTrip.startOdometer}
                  value={endData.endOdometer}
                  onChange={e => setEndData({...endData, endOdometer: e.target.value})}
                  className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Closing Cash</label>
                  <input 
                    type="number"
                    required
                    value={endData.closingCash}
                    onChange={e => setEndData({...endData, closingCash: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 block">Total Sales</label>
                  <input 
                    type="number"
                    required
                    value={endData.totalSales}
                    onChange={e => setEndData({...endData, totalSales: e.target.value})}
                    className="w-full bg-gray-50 border-gray-100 rounded-xl py-3 px-4 text-sm font-bold focus:ring-2 focus:ring-rose-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowEndModal(false)}
                  className="flex-1 py-4 text-gray-500 font-black uppercase tracking-widest text-[10px] border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] py-4 bg-rose-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-rose-500/20 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : 'Complete Reconciliation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
