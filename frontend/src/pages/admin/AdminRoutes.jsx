import React, { useState, useEffect } from 'react';
import {
  Plus,
  MapPin,
  Calendar,
  Truck,
  User,
  X,
  Loader2,
  Pencil,
  Trash2,
  ClipboardList,
  Clock,
  LayoutGrid,
  Settings2,
  Home,
  CheckCircle2,
  Search
} from 'lucide-react';
import * as routeService from '../../services/routeService';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';

export default function AdminRoutes() {
  const [villages, setVillages] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('villages'); // 'villages', 'routes', 'assignments'

  // Modals
  const [showVillageModal, setShowVillageModal] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form States
  const [villageForm, setVillageForm] = useState({ id: '', name: '', latitude: '', longitude: '' });
  const [villageSearchQuery, setVillageSearchQuery] = useState('');
  const [isVillagesLoading, setIsVillagesLoading] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [isRoutesLoading, setIsRoutesLoading] = useState(false);
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [routeForm, setRouteForm] = useState({ id: '', routeName: '', selectedVillages: [] });
  const [assignmentForm, setAssignmentForm] = useState({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' });

  const fetchData = async () => {
    setIsVillagesLoading(true);
    setIsRoutesLoading(true);
    setIsAssignmentsLoading(true);
    try {
      const [vRes, rRes, aRes, vehRes, uRes] = await Promise.all([
        routeService.getVillages(),
        routeService.getAdminRoutes(),
        routeService.getRouteAssignments(),
        adminAPI.getVehicles(),
        adminAPI.getUsers()
      ]);
      setVillages(vRes);
      setRoutes(rRes);
      setAssignments(aRes);
      setVehicles(vehRes.data);
      setUsers(uRes.data.filter(u => u.role === 'SALES_AGENT' || u.role === 'SUPERVISOR'));
    } catch (error) {
      toast.error('Failed to fetch data');
      console.error(error);
    } finally {
      setLoading(false);
      setIsVillagesLoading(false);
      setIsRoutesLoading(false);
      setIsAssignmentsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- Village Handlers ---
  const handleSaveVillage = async (e) => {
    e.preventDefault();
    if (!villageForm.name) return toast.error('Village name is required');
    setIsSubmitting(true);
    try {
      if (villageForm.id) {
        await routeService.updateVillage(villageForm.id, { 
          name: villageForm.name,
          latitude: villageForm.latitude ? parseFloat(villageForm.latitude) : null,
          longitude: villageForm.longitude ? parseFloat(villageForm.longitude) : null
        });
        toast.success('Village updated');
      } else {
        await routeService.createVillage({ 
          name: villageForm.name,
          latitude: villageForm.latitude ? parseFloat(villageForm.latitude) : null,
          longitude: villageForm.longitude ? parseFloat(villageForm.longitude) : null
        });
        toast.success('Village created');
      }
      setShowVillageModal(false);
      setVillageForm({ id: '', name: '', latitude: '', longitude: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save village');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVillage = async (id) => {
    if (!window.confirm('Delete this village?')) return;
    try {
      await routeService.deleteVillage(id);
      toast.success('Village deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete village');
    }
  };

  // --- Route Handlers ---
  const handleToggleRouteVillage = (villageName) => {
    setRouteForm(prev => {
      const isSelected = prev.selectedVillages.includes(villageName);
      if (isSelected) return { ...prev, selectedVillages: prev.selectedVillages.filter(v => v !== villageName) };
      return { ...prev, selectedVillages: [...prev.selectedVillages, villageName] };
    });
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    if (!routeForm.routeName) return toast.error('Route name required');
    if (routeForm.selectedVillages.length === 0) return toast.error('Select at least one village');
    
    setIsSubmitting(true);
    try {
      const payload = {
        routeName: routeForm.routeName,
        villages: routeForm.selectedVillages,
        cycles: [] // We no longer use cycles, but pass empty to not break backend if expected
      };
      
      if (routeForm.id) {
        await routeService.updateRoute(routeForm.id, payload);
        toast.success('Route updated');
      } else {
        await routeService.createRoute(payload);
        toast.success('Route created');
      }
      setShowRouteModal(false);
      setRouteForm({ id: '', routeName: '', selectedVillages: [] });
      fetchData();
    } catch (error) {
      toast.error('Failed to save route');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Assignment Handlers ---
  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    const hasSessions = assignmentForm.schedule && Object.values(assignmentForm.schedule).some(d => d.morning || d.evening);
    if (!assignmentForm.userId || !assignmentForm.routeId || !hasSessions) {
      return toast.error('Required fields: Agent, Route, Sessions (Select at least one day)');
    }

    setIsSubmitting(true);
    try {
      if (assignmentForm.id) {
        await routeService.updateRouteAssignment(assignmentForm.id, assignmentForm);
        toast.success('Assignment updated');
      } else {
        await routeService.assignRoute(assignmentForm);
        toast.success('Assignment created');
      }
      setShowAssignModal(false);
      setAssignmentForm({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' });
      fetchData();
    } catch (error) {
      toast.error('Failed to save assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Route & Coverage</h2>
          <p className="text-sm text-gray-500">Manage villages, routes, and agent schedules</p>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab('villages')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'villages' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Villages
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'routes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Routes
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'assignments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Assignments
          </button>
        </div>
      </div>

      {/* --- VILLAGES TAB --- */}
      {activeTab === 'villages' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search villages..." 
                className="w-full bg-white border border-gray-100 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-sm transition-all"
                value={villageSearchQuery}
                onChange={(e) => setVillageSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setVillageForm({ id: '', name: '', latitude: '', longitude: '' }); setShowVillageModal(true); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={3} /> New Village
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[40vh] flex flex-col">
            {isVillagesLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-emerald-600" size={32} />
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Hydrating Village Data...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.2em] text-[10px]">Village Designation</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.2em] text-[10px] text-center">Coordinates</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.2em] text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(() => {
                      const filtered = villages.filter(v => v.name.toLowerCase().includes(villageSearchQuery.toLowerCase()));
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="3" className="px-8 py-20 text-center">
                              <Home size={40} className="mx-auto text-gray-200 mb-3" />
                              <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest italic font-bold">
                                {villageSearchQuery ? `No results for "${villageSearchQuery}"` : 'No villages have been registered'}
                              </p>
                            </td>
                          </tr>
                        );
                      }
                      return filtered.map(v => (
                        <tr key={v.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                                <Home size={18} />
                              </div>
                              <span className="font-black text-gray-900 tracking-tight uppercase text-sm">{v.name}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                             <div className="flex flex-col items-center gap-0.5">
                               <div className={`w-2 h-2 rounded-full ${v.latitude && v.longitude ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-gray-200'}`} />
                               <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">
                                 {v.latitude && v.longitude ? 'Geocoded' : 'Missing Area'}
                               </span>
                             </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center justify-end gap-2 outline-none">
                              {v.latitude && v.longitude && (
                                <a 
                                  href={`https://www.google.com/maps?q=${v.latitude},${v.longitude}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                                  title="Open in Maps"
                                >
                                  <MapPin size={15} />
                                </a>
                              )}
                              <button 
                                onClick={() => { setVillageForm({ id: v.id, name: v.name, latitude: v.latitude || '', longitude: v.longitude || '' }); setShowVillageModal(true); }}
                                className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all"
                              >
                                <Pencil size={15} />
                              </button>
                              <button 
                                onClick={() => handleDeleteVillage(v.id)}
                                className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- ROUTES TAB --- */}
      {activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search routes..." 
                className="w-full bg-white border border-gray-100 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-sm transition-all"
                value={routeSearchQuery}
                onChange={(e) => setRouteSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setRouteForm({ id: '', routeName: '', selectedVillages: [] }); setShowRouteModal(true); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={3} /> New Route
            </button>
          </div>
          
          {isRoutesLoading ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mapping Route Data...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:hidden gap-4">
                {(() => {
                  const filtered = routes.filter(r => r.routeName.toLowerCase().includes(routeSearchQuery.toLowerCase()));
                  if (filtered.length === 0) return <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase italic bg-white rounded-3xl border border-gray-100">No matching routes</div>;
                  return filtered.map(route => (
                    <div key={route.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight"><MapPin size={18} className="text-emerald-500 fill-emerald-500/10"/> {route.routeName}</h3>
                        <div className="flex gap-1">
                          <button onClick={() => { setRouteForm({ id: route.id, routeName: route.routeName, selectedVillages: route.villages || [] }); setShowRouteModal(true); }} className="p-2 text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 rounded-lg transition-all"><Pencil size={15}/></button>
                          <button onClick={async () => { if(window.confirm('Delete?')){ await routeService.deleteRoute(route.id); fetchData(); } }} className="p-2 text-gray-400 hover:bg-rose-50 hover:text-rose-600 rounded-lg transition-all"><Trash2 size={15}/></button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-50">
                        {(route.villages || []).map(v => (
                          <span key={v} className="text-[10px] bg-emerald-50/50 border border-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">{v}</span>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[40vh]">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px]">Route Identifier</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px] text-center">Village Coverage</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(() => {
                      const filtered = routes.filter(r => r.routeName.toLowerCase().includes(routeSearchQuery.toLowerCase()));
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="3" className="px-8 py-20 text-center text-gray-400 font-bold text-xs uppercase italic">No matching routes found</td>
                          </tr>
                        );
                      }
                      return filtered.map(route => (
                        <tr key={route.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-8 py-6 flex items-center gap-4">
                            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 transition-all">
                              <MapPin size={18} className="fill-emerald-600/10" />
                            </div>
                            <span className="font-black text-gray-900 uppercase tracking-tight">{route.routeName}</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-wrap gap-1.5 justify-center max-w-sm mx-auto">
                              {(route.villages || []).map(v => (
                                <span key={v} className="text-[10px] bg-white border border-gray-100 text-gray-500 px-2.5 py-1 rounded-lg font-black uppercase tracking-tighter shadow-sm">
                                  {v}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 transition-all">
                              <button onClick={() => { setRouteForm({ id: route.id, routeName: route.routeName, selectedVillages: route.villages || [] }); setShowRouteModal(true); }} className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400 hover:text-emerald-600 transition-all">
                                <Pencil size={15}/>
                              </button>
                              <button onClick={async () => { if(window.confirm('Delete?')){ await routeService.deleteRoute(route.id); fetchData(); } }} className="p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm text-gray-400 hover:text-rose-600 transition-all">
                                <Trash2 size={15}/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- ASSIGNMENTS TAB --- */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Search assignments (agent, route, vehicle)..." 
                className="w-full bg-white border border-gray-100 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-sm transition-all"
                value={assignmentSearchQuery}
                onChange={(e) => setAssignmentSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => { setAssignmentForm({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' }); setShowAssignModal(true); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
            >
              <Plus size={16} strokeWidth={3} /> New Assignment
            </button>
          </div>

          {isAssignmentsLoading ? (
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compiling Assignments...</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:hidden gap-4">
                {(() => {
                  const q = assignmentSearchQuery.toLowerCase();
                  const filtered = assignments.filter(a => 
                    a.route?.routeName?.toLowerCase().includes(q) || 
                    a.user?.name?.toLowerCase().includes(q) || 
                    a.vehicle?.vehicleNumber?.toLowerCase().includes(q)
                  );
                  if (filtered.length === 0) return <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase italic bg-white rounded-3xl border border-gray-100">No matching assignments</div>;
                  
                  return filtered.map(a => (
                    <div key={a.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                        <h4 className="font-black text-gray-900 uppercase tracking-tight">{a.route?.routeName}</h4>
                        <div className="flex gap-1">
                          <button onClick={() => {
                              setAssignmentForm({
                                id: a.id,
                                vehicleId: a.vehicleId,
                                userId: a.userId,
                                routeId: a.routeId,
                                morningSession: a.morningSession || '',
                                afternoonSession: a.afternoonSession || '',
                                schedule: a.schedule || null
                              });
                              setShowAssignModal(true);
                          }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil size={15}/></button>
                          <button onClick={async () => { if(window.confirm('Remove?')){ await routeService.deleteRouteAssignment(a.id); fetchData(); } }} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><X size={15}/></button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5"><Truck size={10}/> Vehicle</span>
                          <span className="text-sm font-black text-gray-800 leading-none">{a.vehicle?.vehicleNumber}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5"><User size={10}/> Agent</span>
                          <span className="text-sm font-black text-gray-800 leading-none">{a.user?.name}</span>
                        </div>
                      </div>
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 space-y-2">
                        {(() => {
                          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const today = days[new Date().getDay()];
                          const todaySchedule = a.schedule?.[today] || { morning: '', evening: '' };
                          return (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Today Morning ({today})</span>
                                <span className="text-xs font-black text-indigo-700">{todaySchedule.morning || 'OFF'}</span>
                              </div>
                              <div className="flex items-center justify-between pt-1 border-t border-indigo-100/30">
                                <span className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Today Evening ({today})</span>
                                <span className="text-xs font-black text-indigo-700">{todaySchedule.evening || 'OFF'}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="hidden md:block bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[40vh]">
                <table className="w-full text-left">
                  <thead className="bg-gray-50/50 border-b border-gray-100">
                    <tr>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px]">Assignment Details</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px] text-center">Weekly Snapshot</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px] text-center">Status</th>
                      <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(() => {
                      const q = assignmentSearchQuery.toLowerCase();
                      const filtered = assignments.filter(a => 
                        a.route?.routeName?.toLowerCase().includes(q) || 
                        a.user?.name?.toLowerCase().includes(q) || 
                        a.vehicle?.vehicleNumber?.toLowerCase().includes(q)
                      );
                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan="4" className="px-8 py-20 text-center text-gray-400 font-bold text-xs uppercase italic">
                              {assignmentSearchQuery ? `No results found for "${assignmentSearchQuery}"` : 'No assignments created'}
                            </td>
                          </tr>
                        );
                      }
                      return filtered.map(a => (
                        <tr key={a.id} className="hover:bg-gray-50/30 transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100">
                                  <MapPin size={14} className="fill-indigo-600/10" />
                                </div>
                                <span className="font-black text-gray-900 uppercase tracking-tight">{a.route?.routeName}</span>
                              </div>
                              <div className="flex items-center gap-4 pl-1">
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Vehicle</span>
                                  <span className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{a.vehicle?.vehicleNumber}</span>
                                </div>
                                <div className="w-px h-6 bg-gray-100 self-center" />
                                <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.1em]">Driver</span>
                                  <span className="text-[11px] font-black text-gray-700 uppercase tracking-widest">{a.user?.name}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col items-center gap-2">
                              <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100/30 w-full max-w-[200px]">
                                {(() => {
                                  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                                  const today = days[new Date().getDay()];
                                  const todaySchedule = a.schedule?.[today] || { morning: '', evening: '' };
                                  return (
                                    <div className="space-y-1.5 grayscale-[0.3]">
                                      <div className="flex justify-between items-baseline">
                                        <span className="text-[8px] font-black text-indigo-400 uppercase">{today} AM</span>
                                        <span className="text-[10px] font-black text-indigo-800 uppercase truncate ml-2">{todaySchedule.morning || '--'}</span>
                                      </div>
                                      <div className="flex justify-between items-baseline pt-1 border-t border-indigo-100/20">
                                        <span className="text-[8px] font-black text-indigo-400 uppercase">{today} PM</span>
                                        <span className="text-[10px] font-black text-indigo-800 uppercase truncate ml-2">{todaySchedule.evening || '--'}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-[0.1em] border border-emerald-100 shadow-sm shadow-emerald-500/5">
                              In Service
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-2 transition-all">
                              <button onClick={() => {
                                setAssignmentForm({
                                  id: a.id,
                                  vehicleId: a.vehicleId,
                                  userId: a.userId,
                                  routeId: a.routeId,
                                  morningSession: a.morningSession || '',
                                  afternoonSession: a.afternoonSession || '',
                                  schedule: a.schedule || null
                                });
                                setShowAssignModal(true);
                              }} className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"><Pencil size={15}/></button>
                              <button onClick={async () => { if(window.confirm('Remove?')){ await routeService.deleteRouteAssignment(a.id); fetchData(); } }} className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"><X size={15}/></button>
                            </div>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* --- MODALS --- */}
      {/* Village Modal */}
      {showVillageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">{villageForm.id ? 'Edit Village' : 'New Village'}</h3>
              <a 
                href={`https://www.google.com/maps/search/${villageForm.name || ''}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-all"
              >
                <MapPin size={10} /> Find GPS
              </a>
            </div>
            <form onSubmit={handleSaveVillage} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Village Name</label>
                <input type="text" placeholder="e.g. Rampur" className="w-full bg-gray-50 border border-gray-100 p-3 rounded-xl outline-none focus:border-emerald-500 font-bold" value={villageForm.name} onChange={e => setVillageForm({...villageForm, name: e.target.value})} />
              </div>

              <div className="p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Map Link / Coordinates</label>
                    <span className="text-[8px] font-bold text-blue-400 italic">Paste Google Maps Link</span>
                  </div>
                  <input 
                    type="text" 
                    placeholder="https://maps.app.goo.gl/... or 17.38, 78.48" 
                    className="w-full bg-white border border-blue-100 p-3 rounded-xl outline-none focus:border-blue-400 text-xs font-bold shadow-sm"
                    onChange={async (e) => {
                      const val = e.target.value;
                      if (!val) return;
                      
                      // Check if it's a shortened URL (goo.gl)
                      if (val.includes('maps.app.goo.gl') || val.includes('goo.gl/maps')) {
                        const loadingToast = toast.loading('Resolving short link...');
                        try {
                          const res = await adminAPI.resolveVillageLink(val);
                          if (res.data.latitude && res.data.longitude) {
                            setVillageForm(prev => ({ ...prev, latitude: res.data.latitude, longitude: res.data.longitude }));
                            toast.success('Coordinates resolved!', { id: loadingToast });
                          }
                        } catch (err) {
                          toast.error('Could not resolve this link automatically.', { id: loadingToast });
                        }
                        return;
                      }

                      // Handle full Google Maps URL (extract @lat,lng)
                      const urlMatch = val.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
                      if (urlMatch) {
                        setVillageForm(prev => ({ ...prev, latitude: urlMatch[1], longitude: urlMatch[2] }));
                        return;
                      }

                      // Handle coordinates
                      const parts = val.split(/[,|\s]+/).filter(Boolean).map(p => p.trim());
                      if (parts.length >= 2) {
                        setVillageForm(prev => ({ ...prev, latitude: parts[0], longitude: parts[1] }));
                      }
                    }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
                    <input type="number" step="any" placeholder="0.0000" className="w-full bg-white border border-gray-100 p-2.5 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold" value={villageForm.latitude} onChange={e => setVillageForm({...villageForm, latitude: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
                    <input type="number" step="any" placeholder="0.0000" className="w-full bg-white border border-gray-100 p-2.5 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold" value={villageForm.longitude} onChange={e => setVillageForm({...villageForm, longitude: e.target.value})} />
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all active:scale-[0.98] mt-2">
                {isSubmitting ? 'Processing...' : 'Save Village'}
              </button>
              <button type="button" onClick={() => setShowVillageModal(false)} className="w-full bg-gray-50 text-gray-500 p-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Route Modal */}
      {showRouteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{routeForm.id ? 'Edit Route' : 'New Route'}</h3>
            <form onSubmit={handleSaveRoute} className="space-y-4">
              <input type="text" placeholder="Route Name (e.g. Highway Cluster)" className="w-full bg-gray-50 border p-3 rounded-xl outline-none font-bold" value={routeForm.routeName} onChange={e => setRouteForm({...routeForm, routeName: e.target.value})} />
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Select Villages</label>
                <div className="grid grid-cols-2 gap-2">
                  {(() => {
                    const assignedVillages = routes.reduce((acc, r) => {
                      if (r.id !== routeForm.id) {
                        return [...acc, ...(r.villages || [])];
                      }
                      return acc;
                    }, []);

                    return villages.filter(v => !assignedVillages.includes(v.name)).map(v => (
                      <label key={v.id} className={`p-3 rounded-xl border cursor-pointer flex items-center gap-2 transition-all ${routeForm.selectedVillages.includes(v.name) ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'}`}>
                        <input type="checkbox" className="hidden" checked={routeForm.selectedVillages.includes(v.name)} onChange={() => handleToggleRouteVillage(v.name)} />
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${routeForm.selectedVillages.includes(v.name) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'}`}>
                          {routeForm.selectedVillages.includes(v.name) && <CheckCircle2 size={12} className="text-white"/>}
                        </div>
                        <span className="text-sm font-bold truncate">{v.name}</span>
                      </label>
                    ));
                  })()}
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white p-3 pt-4 pb-4 mt-4 rounded-xl font-bold">Save Route</button>
              <button type="button" onClick={() => setShowRouteModal(false)} className="w-full bg-gray-100 text-gray-600 p-3 rounded-xl font-bold mt-2">Cancel</button>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutGrid className="text-indigo-500"/> Assign Route</h3>
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Route <span className="text-rose-500">*</span></label>
                <select className="w-full bg-gray-50 border p-3 rounded-xl outline-none font-medium" value={assignmentForm.routeId} onChange={e => {
                  const r = routes.find(x => x.id === e.target.value);
                  setAssignmentForm({...assignmentForm, routeId: e.target.value, morningSession: '', afternoonSession: ''});
                }}>
                  <option value="">Select Route</option>
                  {routes.map(r => <option key={r.id} value={r.id}>{r.routeName}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Agent <span className="text-rose-500">*</span></label>
                <select className="w-full bg-gray-50 border p-3 rounded-xl outline-none font-medium" value={assignmentForm.userId} onChange={e => {
                  const u = users.find(x => x.id === e.target.value);
                  setAssignmentForm({
                    ...assignmentForm, 
                    userId: e.target.value, 
                    vehicleId: u?.assignedVehicleId || ''
                  });
                }}>
                  <option value="">Select Agent</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>

              {assignmentForm.userId && !users.find(u => u.id === assignmentForm.userId)?.assignedVehicleId && (
                <p className="text-rose-500 text-xs font-bold px-2">This agent is not assigned to any vehicle.</p>
              )}

              {assignmentForm.routeId && (() => {
                const selectedRoute = routes.find(r => r.id === assignmentForm.routeId);
                const routeVillages = selectedRoute?.villages || [];
                const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

                if (!assignmentForm.schedule) {
                   assignmentForm.schedule = daysOfWeek.reduce((acc, d) => ({
                      ...acc, 
                      [d]: { morning: '', evening: '' }
                   }), {});
                }

                return (
                  <div className="space-y-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                       <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Weekly Field Schedule <span className="text-rose-500">*</span></label>
                       <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded font-black uppercase">Morning / Evening</span>
                    </div>

                    <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                       {daysOfWeek.map(day => (
                         <div key={day} className="bg-gray-50 rounded-2xl p-3 border border-gray-100/50 flex flex-col gap-2 group hover:border-indigo-100 transition-all">
                            <div className="flex items-center justify-between">
                               <span className="text-xs font-black text-gray-900 uppercase tracking-tight">{day}</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                               <select 
                                 className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" 
                                 value={assignmentForm.schedule[day]?.morning || ''} 
                                 onChange={e => setAssignmentForm({
                                   ...assignmentForm, 
                                   schedule: { ...assignmentForm.schedule, [day]: { ...assignmentForm.schedule[day], morning: e.target.value } }
                                 })}
                               >
                                 <option value="">Mrng (Off)</option>
                                 {routeVillages.map(v => <option key={v} value={v}>{v}</option>)}
                               </select>

                               <select 
                                 className="w-full bg-white border border-gray-200 p-2 rounded-xl text-xs font-bold outline-none focus:border-indigo-500" 
                                 value={assignmentForm.schedule[day]?.evening || ''} 
                                 onChange={e => setAssignmentForm({
                                   ...assignmentForm, 
                                   schedule: { ...assignmentForm.schedule, [day]: { ...assignmentForm.schedule[day], evening: e.target.value } }
                                 })}
                               >
                                 <option value="">Evng (Off)</option>
                                 {routeVillages.map(v => <option key={v} value={v}>{v}</option>)}
                               </select>
                            </div>
                         </div>
                       ))}
                    </div>
                  </div>
                );
              })()}

              <button type="submit" disabled={isSubmitting} className="w-full bg-indigo-600 text-white p-3 pt-4 pb-4 mt-4 rounded-xl font-bold">Assign</button>
              <button type="button" onClick={() => setShowAssignModal(false)} className="w-full bg-gray-100 text-gray-600 p-3 rounded-xl font-bold mt-2">Cancel</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
