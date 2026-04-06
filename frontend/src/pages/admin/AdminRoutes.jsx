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
  CheckCircle2
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
  const [villageForm, setVillageForm] = useState({ id: '', name: '' });
  const [routeForm, setRouteForm] = useState({ id: '', routeName: '', selectedVillages: [] });
  const [assignmentForm, setAssignmentForm] = useState({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' });

  const fetchData = async () => {
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
        await routeService.updateVillage(villageForm.id, { name: villageForm.name });
        toast.success('Village updated');
      } else {
        await routeService.createVillage({ name: villageForm.name });
        toast.success('Village created');
      }
      setShowVillageModal(false);
      setVillageForm({ id: '', name: '' });
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
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setVillageForm({ id: '', name: '' }); setShowVillageModal(true); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              <Plus size={16} /> New Village
            </button>
          </div>
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-xs">Village Name</th>
                    <th className="px-6 py-4 font-black text-gray-400 uppercase tracking-widest text-xs text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {villages.length === 0 ? (
                    <tr>
                      <td colSpan="2" className="px-6 py-8 text-center text-gray-400 font-medium italic">No villages added yet</td>
                    </tr>
                  ) : (
                    villages.map(v => (
                      <tr key={v.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/50">
                              <Home size={14} />
                            </div>
                            <span className="font-bold text-gray-800">{v.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => { setVillageForm(v); setShowVillageModal(true); }} className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all"><Pencil size={14}/></button>
                            <button onClick={() => handleDeleteVillage(v.id)} className="p-2 bg-white rounded-xl border border-gray-200 text-gray-500 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"><Trash2 size={14}/></button>
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

      {/* --- ROUTES TAB --- */}
      {activeTab === 'routes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setRouteForm({ id: '', routeName: '', selectedVillages: [] }); setShowRouteModal(true); }}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all"
            >
              <Plus size={16} /> New Route
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {routes.map(route => (
              <div key={route.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2"><MapPin size={18} className="text-emerald-500"/> {route.routeName}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setRouteForm({ id: route.id, routeName: route.routeName, selectedVillages: route.villages || [] }); setShowRouteModal(true); }} className="text-gray-400 hover:text-emerald-600"><Pencil size={16}/></button>
                    <button onClick={async () => { if(window.confirm('Delete?')){ await routeService.deleteRoute(route.id); fetchData(); } }} className="text-gray-400 hover:text-rose-600"><Trash2 size={16}/></button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(route.villages || []).map(v => (
                    <span key={v} className="text-xs bg-gray-50 border border-gray-100 px-2 py-1 rounded-md font-medium text-gray-600">{v}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- ASSIGNMENTS TAB --- */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { setAssignmentForm({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' }); setShowAssignModal(true); }}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              <Plus size={16} /> New Assignment
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map(a => (
              <div key={a.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                 <div className="flex justify-between items-center mb-3">
                   <h4 className="font-bold text-gray-900 border-b pb-1">{a.route.routeName}</h4>
                   <div className="flex gap-2">
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
                     }} className="text-gray-400 hover:text-indigo-600"><Pencil size={16}/></button>
                     <button onClick={async () => { if(window.confirm('Remove?')){ await routeService.deleteRouteAssignment(a.id); fetchData(); } }} className="text-rose-400 hover:text-rose-600"><X size={16}/></button>
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                   <div className="flex flex-col"><span className="text-xs text-gray-400 uppercase font-bold">Vehicle</span><span className="font-medium text-gray-800">{a.vehicle?.vehicleNumber}</span></div>
                   <div className="flex flex-col"><span className="text-xs text-gray-400 uppercase font-bold">Agent</span><span className="font-medium text-gray-800">{a.user?.name}</span></div>
                 </div>
                 <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100/50 flex flex-col gap-1.5 text-sm">
                   {(() => {
                     const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                     const today = days[new Date().getDay()];
                     const todaySchedule = a.schedule?.[today] || { morning: '', evening: '' };
                     return (
                       <>
                         <div className="flex items-center justify-between">
                           <span className="font-bold text-indigo-800">Today Morning ({today})</span>
                           <span className="text-indigo-600 font-medium">{todaySchedule.morning || 'OFF'}</span>
                         </div>
                         <div className="flex items-center justify-between">
                           <span className="font-bold text-indigo-800">Today Evening ({today})</span>
                           <span className="text-indigo-600 font-medium">{todaySchedule.evening || 'OFF'}</span>
                         </div>
                       </>
                     );
                   })()}
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- MODALS --- */}
      {/* Village Modal */}
      {showVillageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{villageForm.id ? 'Edit Village' : 'New Village'}</h3>
            <form onSubmit={handleSaveVillage} className="space-y-4">
              <input type="text" placeholder="Village Name" className="w-full bg-gray-50 border p-3 rounded-xl outline-none" value={villageForm.name} onChange={e => setVillageForm({...villageForm, name: e.target.value})} />
              <button type="submit" className="w-full bg-emerald-600 text-white p-3 rounded-xl font-bold">Save</button>
              <button type="button" onClick={() => setShowVillageModal(false)} className="w-full bg-gray-100 text-gray-600 p-3 rounded-xl font-bold mt-2">Cancel</button>
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
