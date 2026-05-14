import React, { useState, useEffect } from 'react';
import { MapPin, Truck, User, Calendar, Search, ArrowRight, Loader2, Link2, Map, Plus, X, Trash2 } from 'lucide-react';
import * as routeService from '../../../services/routeService';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';

export default function RouteMappingSection({ storeId, vehicles, users }) {
  const [assignments, setAssignments] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    vehicleId: '',
    userId: '',
    routeId: '',
    schedule: {
      Monday: { morning: true, evening: true },
      Tuesday: { morning: true, evening: true },
      Wednesday: { morning: true, evening: true },
      Thursday: { morning: true, evening: true },
      Friday: { morning: true, evening: true },
      Saturday: { morning: true, evening: true },
      Sunday: { morning: false, evening: false }
    }
  });

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assignRes, routesRes] = await Promise.all([
        routeService.getRouteAssignments({ storeId }),
        routeService.getAdminRoutes({ storeId })
      ]);
      setAssignments(assignRes);
      setRoutes(routesRes);
    } catch (error) {
      toast.error('Failed to load route data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!newAssignment.vehicleId || !newAssignment.routeId) {
      return toast.error('Please select both vehicle and route');
    }
    setIsSubmitting(true);
    try {
      await routeService.assignRoute(newAssignment);
      toast.success('Route assigned successfully');
      setShowAssignModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign route');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this assignment?')) return;
    try {
      await routeService.deleteRouteAssignment(id);
      toast.success('Assignment removed');
      fetchData();
    } catch (error) {
      toast.error('Failed to remove assignment');
    }
  };

  const q = searchTerm.toLowerCase();
  const filtered = assignments.filter(a => 
    a.route?.routeName?.toLowerCase().includes(q) ||
    a.user?.name?.toLowerCase().includes(q) ||
    a.vehicle?.vehicleNumber?.toLowerCase().includes(q)
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-bold text-sm uppercase tracking-widest">Loading Route Mappings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Active Route Mappings</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Vehicle and Agent Deployment Status</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative group flex-1 md:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search assignments..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all shadow-sm"
            />
          </div>
          <button 
            onClick={() => setShowAssignModal(true)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
          >
            <Plus size={18} />
            Assign Route
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filtered.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-gray-200">
            <Map size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">No route mappings found</p>
          </div>
        ) : (
          filtered.map(assignment => (
            <div key={assignment.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all group flex flex-col gap-6 relative overflow-hidden">
              <button 
                onClick={() => handleDelete(assignment.id)}
                className="absolute top-6 right-6 p-2 text-gray-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>

              <div className="flex items-center justify-between border-b border-gray-50 pb-4 pr-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 tracking-tight leading-none">{assignment.route?.routeName || 'N/A'}</h4>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Route Cluster</span>
                  </div>
                </div>
                <div className="px-3 py-1 bg-emerald-950 text-white rounded-lg text-[9px] font-black uppercase tracking-widest">
                  {assignment.vehicle?.vehicleNumber || 'VEHICLE'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent group-hover:border-emerald-100 transition-all">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <Truck size={14} strokeWidth={2.5} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Deployment</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 leading-none">{assignment.vehicle?.vehicleName || 'Primary Vehicle'}</span>
                </div>
                <div className="flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-transparent group-hover:border-emerald-100 transition-all">
                  <div className="flex items-center gap-2 text-slate-600">
                    <User size={14} strokeWidth={2.5} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Assigned Agent</span>
                  </div>
                  <span className="text-sm font-black text-gray-900 leading-none">{assignment.user?.name || 'Unassigned'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-gray-400" />
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                    Active on: {Object.entries(assignment.schedule || {}).filter(([_, s]) => s.morning || s.evening).map(([d]) => d.substring(0, 3)).join(', ') || 'N/A'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                   <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Operational</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showAssignModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowAssignModal(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-emerald-50/50">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                    <MapPin size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Assign Route</h3>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Deploy vehicle to operational area</p>
                  </div>
               </div>
               <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-white rounded-xl text-gray-400 transition-colors">
                 <X size={20} />
               </button>
            </div>

            <form onSubmit={handleAssign} className="p-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Vehicle</label>
                  <select 
                    required
                    value={newAssignment.vehicleId}
                    onChange={(e) => {
                      const v = vehicles.find(vh => vh.id === e.target.value);
                      setNewAssignment(p => ({ ...p, vehicleId: e.target.value, userId: v?.assignedUserId || '' }));
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Choose a vehicle...</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.vehicleNumber} - {v.vehicleName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Select Route</label>
                  <select 
                    required
                    value={newAssignment.routeId}
                    onChange={(e) => setNewAssignment(p => ({ ...p, routeId: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">Choose a route...</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.routeName}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Active Schedule</label>
                  <div className="grid grid-cols-7 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setNewAssignment(p => ({
                          ...p,
                          schedule: {
                            ...p.schedule,
                            [day]: { morning: !p.schedule[day].morning, evening: !p.schedule[day].evening }
                          }
                        }))}
                        className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all border ${
                          newAssignment.schedule[day].morning ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-white border-gray-100 text-gray-400'
                        }`}
                      >
                        {day.substring(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-6 py-4 bg-gray-50 text-gray-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-[2] px-6 py-4 bg-emerald-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Assignment...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
