import React, { useState, useEffect } from 'react';
import {
  Plus,
  MapPin,
  Calendar,
  Truck,
  User,
  ArrowRight,
  CheckCircle2,
  X,
  Loader2,
  Pencil,
  Trash2,
  ClipboardList,
  ChevronRight,
  Clock,
  LayoutGrid,
  Settings2,
  Eye
} from 'lucide-react';
import * as routeService from '../../services/routeService';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

const DAYS_OF_WEEK = [
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'
];

export default function AdminRoutes() {
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('master'); // 'master' or 'assignments'

  // Modals
  const [showAddRouteModal, setShowAddRouteModal] = useState(false);
  const [showEditRouteModal, setShowEditRouteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State - Route
  const [newRoute, setNewRoute] = useState({
    routeName: '',
    villages: '', // comma separated string for easy entry
    cycles: DAYS_OF_WEEK.map(day => ({ dayOfWeek: day, villageName: '' }))
  });

  // Form State - Edit Route
  const [editRoute, setEditRoute] = useState({
    id: '',
    routeName: '',
    villages: '',
    cycles: DAYS_OF_WEEK.map(day => ({ dayOfWeek: day, villageName: '' }))
  });

  // Form State - Assignment
  const [newAssignment, setNewAssignment] = useState({
    vehicleId: '',
    userId: '',
    routeId: ''
  });

  const fetchData = async () => {
    try {
      const [rRes, aRes, vRes, uRes] = await Promise.all([
        routeService.getAdminRoutes(),
        routeService.getRouteAssignments(),
        adminAPI.getVehicles(),
        adminAPI.getUsers()
      ]);
      setRoutes(rRes);
      setAssignments(aRes);
      setVehicles(vRes.data);
      setUsers(uRes.data.filter(u => u.role === 'SALES_AGENT' || u.role === 'SUPERVISOR'));
    } catch (error) {
      toast.error('Failed to fetch route data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRoute = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validation
    if (!newRoute.routeName) return toast.error('Route name is required');
    if (newRoute.cycles.some(c => !c.villageName)) {
      return toast.error('Please assign a village for every day (Mon-Sat)');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        routeName: newRoute.routeName,
        villages: Array.from(new Set(newRoute.cycles.map(c => c.villageName).filter(Boolean))),
        cycles: newRoute.cycles
      };

      await routeService.createRoute(payload);
      toast.success('Route created successfully');
      setShowAddRouteModal(false);
      setNewRoute({
        routeName: '',
        villages: '',
        cycles: DAYS_OF_WEEK.map(day => ({ dayOfWeek: day, villageName: '' }))
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create route');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Edit Route Handler ───────────────────────
  const openEditModal = (route) => {
    const cycleMap = {};
    (route.cycles || []).forEach(c => { cycleMap[c.dayOfWeek] = c.villageName; });

    setEditRoute({
      id: route.id,
      routeName: route.routeName,
      villages: (route.villages || []).join(', '),
      cycles: DAYS_OF_WEEK.map(day => ({
        dayOfWeek: day,
        villageName: cycleMap[day] || ''
      }))
    });
    setShowEditRouteModal(true);
  };

  const handleEditRoute = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!editRoute.routeName) return toast.error('Route name is required');
    if (editRoute.cycles.some(c => !c.villageName)) {
      return toast.error('Please assign a village for every day (Mon-Sat)');
    }

    setIsSubmitting(true);
    try {
      const payload = {
        routeName: editRoute.routeName,
        villages: Array.from(new Set(editRoute.cycles.map(c => c.villageName).filter(Boolean))),
        cycles: editRoute.cycles
      };

      await routeService.updateRoute(editRoute.id, payload);
      toast.success('Route updated successfully');
      setShowEditRouteModal(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update route');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignRoute = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!newAssignment.vehicleId || !newAssignment.userId || !newAssignment.routeId) {
      return toast.error('All fields are required');
    }

    setIsSubmitting(true);
    try {
      await routeService.assignRoute(newAssignment);
      toast.success('Route assigned successfully');
      setShowAssignModal(false);
      setNewAssignment({ vehicleId: '', userId: '', routeId: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign route');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-emerald-600" size={40} />
        <p className="text-gray-500 font-medium tracking-wide text-sm uppercase">Synchronizing Routes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Route Scheduling</h2>
          <p className="text-sm text-gray-500">Manage cyclic village plans and agent assignments</p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-fit">
          <button
            onClick={() => setActiveTab('master')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'master' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Route Master
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'assignments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Assignments
          </button>
        </div>
      </div>

      {activeTab === 'master' ? (
        <div className="space-y-4">
          {/* Action Row */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAddRouteModal(true)}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
            >
              <Plus size={16} />
              New Route
            </button>
          </div>

          {/* Route Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.length === 0 ? (
              <div className="md:col-span-2 text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                <MapPin size={40} className="mx-auto text-gray-300 mb-2 opacity-50" />
                <p className="text-gray-500 font-medium italic text-sm">No routes configured</p>
              </div>
            ) : (
              routes.map((route) => (
                <div key={route.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <MapPin size={20} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-base truncate">{route.routeName}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase text-emerald-600 tracking-widest leading-none">Schedule Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(route)}
                        className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg transition-colors"
                        title="Edit Route"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={async () => {
                          if (window.confirm('Delete this route? All assignments will be removed.')) {
                            try {
                              await routeService.deleteRoute(route.id);
                              toast.success('Route deleted');
                              fetchData();
                            } catch (error) {
                              toast.error('Failed to delete route');
                            }
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Weekly Cycle - Identifiable scroll on mobile */}
                  <div className="flex md:grid md:grid-cols-3 gap-2 overflow-x-auto pb-3 md:pb-0 custom-scrollbar snap-x">
                    {route.cycles.sort((a, b) => DAYS_OF_WEEK.indexOf(a.dayOfWeek) - DAYS_OF_WEEK.indexOf(b.dayOfWeek)).map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-2 border border-gray-100 min-w-[100px] md:min-w-0 flex flex-col gap-0.5 snap-start">
                        <div className="flex justify-between items-center">
                          <span className="text-[7px] font-black text-emerald-600 uppercase tracking-tighter">{c.dayOfWeek.slice(0, 3)}</span>
                          <Clock size={8} className="text-gray-300" />
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 truncate leading-tight mt-0.5">{c.villageName}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ClipboardList size={12} className="text-gray-400" />
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">
                        {route.villages.length} Villages
                      </span>
                    </div>
                    <button
                      onClick={() => openEditModal(route)}
                      className="text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:underline"
                    >
                      Edit <Pencil size={10} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Assignments Action */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
            >
              <Plus size={16} />
              Assign Route
            </button>
          </div>

          {/* Assignments List Card Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {assignments.length === 0 ? (
              <div className="md:col-span-2 text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200">
                <Calendar size={40} className="mx-auto text-gray-300 mb-2 opacity-50" />
                <p className="text-gray-500 font-medium italic text-sm">No assignments found</p>
              </div>
            ) : (
              assignments.map((assignment) => (
                <div key={assignment.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Truck size={20} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-gray-900 text-sm truncate">{assignment.route.routeName}</h4>
                      <button
                        onClick={async () => {
                          if (window.confirm('Remove this assignment?')) {
                            try {
                              await routeService.deleteRouteAssignment(assignment.id);
                              toast.success('Assignment removed');
                              fetchData();
                            } catch (error) {
                              toast.error('Failed to remove assignment');
                            }
                          }
                        }}
                        className="p-1 text-gray-300 hover:text-rose-600 transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-gray-700">{assignment.vehicle.vehicleNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User size={12} className="text-gray-400" />
                        <span className="text-xs font-medium text-gray-600">{assignment.user.name}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-[9px] font-black uppercase tracking-tighter text-gray-400">
                      <span>Assigned: {new Date(assignment.startDate).toLocaleDateString()}</span>
                      <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">Live Status</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Add Route Modal ───────────────────────────────── */}
      {showAddRouteModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Configure Route</h3>
                  <p className="text-xs text-gray-400 font-medium">Define 6-Day Weekly Cycle (Mon-Sat)</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddRouteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRoute} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Route Identity</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tadikonda Highway Cluster"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                  value={newRoute.routeName}
                  onChange={(e) => setNewRoute({ ...newRoute, routeName: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Daily Village Mapping</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {newRoute.cycles.map((day, idx) => (
                    <div key={day.dayOfWeek} className="bg-gray-50 rounded-2xl p-4 border border-gray-50 focus-within:bg-white focus-within:border-emerald-100 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tighter bg-emerald-50 px-2 py-0.5 rounded-lg">
                          {day.dayOfWeek}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder={`Village for ${day.dayOfWeek.toLowerCase()}`}
                        className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 placeholder:font-normal"
                        value={day.villageName}
                        onChange={(e) => {
                          const updated = [...newRoute.cycles];
                          updated[idx].villageName = e.target.value;
                          setNewRoute({ ...newRoute, cycles: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-yellow-50 rounded-2xl p-4 flex gap-3 border border-yellow-100/50">
                <Settings2 size={18} className="text-yellow-600 shrink-0" />
                <p className="text-[11px] text-yellow-800 font-medium leading-relaxed">
                  Note: Sundays are excluded from standard cycles. Each day requires a unique or repeated village assignment for sales tracking.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700 active:scale-[0.98]'
                  }`}
              >
                {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Building Route...</> : 'Save Route Architecture'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Route Modal ───────────────────────────────── */}
      {showEditRouteModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Pencil size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Edit Route</h3>
                  <p className="text-xs text-gray-400 font-medium">Modify village cycle for this route</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditRouteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditRoute} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Route Identity</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tadikonda Highway Cluster"
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-medium focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  value={editRoute.routeName}
                  onChange={(e) => setEditRoute({ ...editRoute, routeName: e.target.value })}
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Daily Village Mapping</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {editRoute.cycles.map((day, idx) => (
                    <div key={day.dayOfWeek} className="bg-gray-50 rounded-2xl p-4 border border-gray-50 focus-within:bg-white focus-within:border-amber-100 transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter bg-amber-50 px-2 py-0.5 rounded-lg">
                          {day.dayOfWeek}
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder={`Village for ${day.dayOfWeek.toLowerCase()}`}
                        className="w-full bg-transparent text-sm font-bold text-gray-800 outline-none placeholder:text-gray-300 placeholder:font-normal"
                        value={day.villageName}
                        onChange={(e) => {
                          const updated = [...editRoute.cycles];
                          updated[idx].villageName = e.target.value;
                          setEditRoute({ ...editRoute, cycles: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 flex gap-3 border border-amber-100/50">
                <Settings2 size={18} className="text-amber-600 shrink-0" />
                <p className="text-[11px] text-amber-800 font-medium leading-relaxed">
                  Updating will replace all current cycle mappings. Existing assignments will continue to use the new schedule.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-amber-600 text-white shadow-amber-600/20 hover:bg-amber-700 active:scale-[0.98]'
                  }`}
              >
                {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Updating...</> : 'Update Route'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign Route Modal ───────────────────────────────── */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-6 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <LayoutGrid size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Establish Assignment</h3>
                  <p className="text-xs text-gray-400 font-medium">Link Personnel to Route Performance</p>
                </div>
              </div>
              <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><X size={20} /></button>
            </div>

            <form onSubmit={handleAssignRoute} className="space-y-5">
              {/* Route Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Select Route</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all"
                    value={newAssignment.routeId}
                    onChange={(e) => setNewAssignment({ ...newAssignment, routeId: e.target.value })}
                  >
                    <option value="">Select a geographical route</option>
                    {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                  </select>
                </div>
              </div>

              {/* Vehicle Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Select Vehicle</label>
                <div className="relative">
                  <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all"
                    value={newAssignment.vehicleId}
                    onChange={(e) => {
                      const vId = e.target.value;
                      const vehicle = vehicles.find(v => v.id === vId);
                      const assignedUser = vehicle?.assignedUsers?.[0];

                      setNewAssignment(prev => ({
                        ...prev,
                        vehicleId: vId,
                        userId: assignedUser?.id || prev.userId
                      }));

                      if (assignedUser) {
                        toast.success(`Agent ${assignedUser.name} auto-selected`, {
                          icon: '👤',
                          duration: 2000
                        });
                      }
                    }}
                  >
                    <option value="">Select assigned transport</option>
                    {vehicles.filter(v => v.status).map(v => <option key={v.id} value={v.id}>{v.vehicleNumber} {v.vehicleName ? `- ${v.vehicleName}` : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* User Select */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Select Sales Personnel</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-gray-800 outline-none focus:ring-2 focus:ring-indigo-500/20 appearance-none transition-all"
                    value={newAssignment.userId}
                    onChange={(e) => setNewAssignment({ ...newAssignment, userId: e.target.value })}
                  >
                    <option value="">Select executive in charge</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-4 flex gap-3 border border-indigo-100/50">
                <Clock size={18} className="text-indigo-600 shrink-0" />
                <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                  Assignment will take effect immediately. Any existing active assignment for the selected vehicle will be automatically deactivated.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isSubmitting
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-indigo-600 text-white shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98]'
                  }`}
              >
                {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Mapping...</> : 'Assign'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
