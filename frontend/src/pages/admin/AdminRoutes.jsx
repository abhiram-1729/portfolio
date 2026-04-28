import React, { useState, useEffect, useRef } from 'react';
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
  Search,
  ChevronLeft,
  ChevronRight,
  Target,
  Hexagon,
  Circle as CircleIcon,
  RotateCcw
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, Polygon, useMapEvents, useMap, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import * as turf from '@turf/turf';
import * as routeService from '../../services/routeService';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useUserStore } from '../../store/userStore';
import StoreSelector from './StoreSelector';

export default function AdminRoutes() {
  const [villages, setVillages] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useUserStore(s => s.user);
  const can = useUserStore(s => s.can);

  const getInitialTab = () => {
    if (!currentUser?.customRoleId || !currentUser?.permissions?.ROUTE_TARGET_SECTIONS) return 'villages';
    const sections = currentUser.permissions.ROUTE_TARGET_SECTIONS;
    if (sections.includes('VILLAGES')) return 'villages';
    if (sections.includes('ROUTES')) return 'routes';
    if (sections.includes('ASSIGNMENTS')) return 'assignments';
    return 'villages';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [villagePage, setVillagePage] = useState(1);
  const [routePage, setRoutePage] = useState(1);
  const [assignmentPage, setAssignmentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modals
  const [isVillageEditorOpen, setIsVillageEditorOpen] = useState(false);
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState([]);

  // Form States
  const [villageForm, setVillageForm] = useState({
    id: '',
    name: '',
    latitude: '',
    longitude: '',
    radius: 500,
    isPolygon: false,
    boundary: null
  });
  const [villageSuggestions, setVillageSuggestions] = useState([]);
  const [isSearchingVillage, setIsSearchingVillage] = useState(false);
  const [villageSearchQuery, setVillageSearchQuery] = useState('');
  const [isVillagesLoading, setIsVillagesLoading] = useState(false);
  const [isRouteEditorOpen, setIsRouteEditorOpen] = useState(false);
  const [routeSearchQuery, setRouteSearchQuery] = useState('');
  const [isRoutesLoading, setIsRoutesLoading] = useState(false);
  const [assignmentSearchQuery, setAssignmentSearchQuery] = useState('');
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [routeForm, setRouteForm] = useState({ id: '', routeName: '', selectedVillages: [] });
  const [assignmentForm, setAssignmentForm] = useState({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' });

  const [searchParams, setSearchParams] = useSearchParams();
  const storeId = searchParams.get('storeId');
  const location = useLocation();

  const fetchData = async () => {
    setIsVillagesLoading(true);
    setIsRoutesLoading(true);
    setIsAssignmentsLoading(true);
    try {
      const [vRes, rRes, aRes, vehRes, uRes] = await Promise.all([
        routeService.getVillages({ storeId }),
        routeService.getAdminRoutes({ storeId }),
        routeService.getRouteAssignments({ storeId }),
        adminAPI.getVehicles({ storeId }),
        adminAPI.getUsers({ storeId })
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
  }, [storeId]);

  useEffect(() => { setVillagePage(1); }, [villageSearchQuery, storeId]);
  useEffect(() => { setRoutePage(1); }, [routeSearchQuery, storeId]);
  useEffect(() => { setAssignmentPage(1); }, [assignmentSearchQuery, storeId]);

  const filteredVillages = villages.filter(v => v.name.toLowerCase().includes(villageSearchQuery.toLowerCase()));
  const totalVillagePages = Math.ceil(filteredVillages.length / ITEMS_PER_PAGE);
  const paginatedVillages = filteredVillages.slice((villagePage - 1) * ITEMS_PER_PAGE, villagePage * ITEMS_PER_PAGE);

  const filteredRoutes = routes.filter(r => r.routeName.toLowerCase().includes(routeSearchQuery.toLowerCase()));
  const totalRoutePages = Math.ceil(filteredRoutes.length / ITEMS_PER_PAGE);
  const paginatedRoutes = filteredRoutes.slice((routePage - 1) * ITEMS_PER_PAGE, routePage * ITEMS_PER_PAGE);

  const q = assignmentSearchQuery.toLowerCase();
  const filteredAssignments = assignments.filter(a =>
    a.route?.routeName?.toLowerCase().includes(q) ||
    a.user?.name?.toLowerCase().includes(q) ||
    a.vehicle?.vehicleNumber?.toLowerCase().includes(q)
  );
  const totalAssignmentPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE);
  const paginatedAssignments = filteredAssignments.slice((assignmentPage - 1) * ITEMS_PER_PAGE, assignmentPage * ITEMS_PER_PAGE);

  // Helper for map interaction
  function LocationPicker({ onLocationSelect }) {
    useMapEvents({
      click(e) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  function MapUpdater({ center, points = [] }) {
    const map = useMap();
    useEffect(() => {
      map.invalidateSize();
      if (points.length > 1) {
        const bounds = points.filter(p => p && p[0] && p[1]);
        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      } else if (center && center[0] && center[1]) {
        map.setView(center, 15);
      }
    }, [center, points, map]);
    return null;
  }

  const resetVillageForm = () => {
    setVillageForm({
      id: '',
      name: '',
      latitude: '',
      longitude: '',
      radius: 500,
      isPolygon: false,
      boundary: null
    });
    setPolygonPoints([]);
    setVillageSuggestions([]);
  };

  const searchTimeout = useRef(null);

  const searchVillages = (query) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (query.length < 3) {
      setVillageSuggestions([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsSearchingVillage(true);
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=in&limit=5`, {
          headers: {
            'Accept-Language': 'en'
          }
        });
        const data = await response.json();
        setVillageSuggestions(data);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsSearchingVillage(false);
      }
    }, 500);
  };

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
          longitude: villageForm.longitude ? parseFloat(villageForm.longitude) : null,
          radius: parseInt(villageForm.radius) || 500,
          isPolygon: villageForm.isPolygon,
          boundary: villageForm.boundary
        });
        toast.success('Village updated');
      } else {
        await routeService.createVillage({
          name: villageForm.name,
          latitude: villageForm.latitude ? parseFloat(villageForm.latitude) : null,
          longitude: villageForm.longitude ? parseFloat(villageForm.longitude) : null,
          radius: parseInt(villageForm.radius) || 500,
          isPolygon: villageForm.isPolygon,
          boundary: villageForm.boundary
        });
        toast.success('Village created');
      }
      setShowVillageModal(false);
      resetVillageForm();
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
      setIsRouteEditorOpen(false);
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

  // Gatekeeper
  const isGlobalRole = currentUser?.role === 'TENANT_OWNER' || currentUser?.role === 'SUPER_ADMIN';
  const isTenantRoute = location.pathname.includes('/tenant/');

  if (isGlobalRole && isTenantRoute && !storeId) {
    return (
      <StoreSelector
        title="Route & Coverage"
        description="Please select a store branch to manage its routes and agent assignments."
        onSelect={(id) => {
          setSearchParams({ storeId: id });
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Route & Coverage</h2>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-500">Manage villages, routes, and agent schedules</p>
            {isTenantRoute && storeId && (
              <>
                <span className="text-gray-300">•</span>
                <button
                  onClick={() => setSearchParams({})}
                  className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded transition-colors"
                >
                  Change Store
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center bg-gray-100 p-1 rounded-2xl w-fit overflow-x-auto">
          {(!currentUser?.customRoleId || currentUser?.permissions?.ROUTE_TARGET_SECTIONS?.includes('VILLAGES')) && (
            <button
              onClick={() => setActiveTab('villages')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'villages' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Villages
            </button>
          )}
          {(!currentUser?.customRoleId || currentUser?.permissions?.ROUTE_TARGET_SECTIONS?.includes('ROUTES')) && (
            <button
              onClick={() => setActiveTab('routes')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'routes' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Routes
            </button>
          )}
          {(!currentUser?.customRoleId || currentUser?.permissions?.ROUTE_TARGET_SECTIONS?.includes('ASSIGNMENTS')) && (
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'assignments' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Assignments
            </button>
          )}
        </div>
      </div>

      {/* --- VILLAGES TAB --- */}
      {activeTab === 'villages' && (
        <div className="animate-fade-in">
          {isVillageEditorOpen ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setIsVillageEditorOpen(false)}
                  className="flex items-center gap-2 text-gray-500 hover:text-emerald-600 font-bold transition-colors"
                >
                  <ChevronLeft size={20} /> Back to Villages
                </button>
              </div>

              <div className="bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100 flex flex-col md:flex-row min-h-[600px]">
                {/* Left Side: Map Picker */}
                <div className="w-full md:w-3/5 h-[400px] md:h-auto relative bg-gray-100">
                  <MapContainer
                    center={[villageForm.latitude || 17.3850, villageForm.longitude || 78.4867]}
                    zoom={13}
                    style={{ height: '100%', width: '100%' }}
                    className="z-0"
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <MapUpdater center={[parseFloat(villageForm.latitude), parseFloat(villageForm.longitude)]} />
                    <LocationPicker
                      onLocationSelect={(lat, lng) => {
                        if (villageForm.isPolygon) {
                          const newPoints = [...polygonPoints, [lat, lng]];
                          setPolygonPoints(newPoints);
                          if (!villageForm.latitude) {
                            setVillageForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
                          }
                          if (newPoints.length >= 3) {
                            const coords = [...newPoints, newPoints[0]].map(p => [p[1], p[0]]);
                            setVillageForm(prev => ({
                              ...prev,
                              boundary: { type: 'Polygon', coordinates: [coords] }
                            }));
                          }
                        } else {
                          setVillageForm(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }));
                        }
                      }}
                    />

                    {!villageForm.isPolygon && villageForm.latitude && villageForm.longitude && (
                      <>
                        <Marker position={[parseFloat(villageForm.latitude), parseFloat(villageForm.longitude)]}>
                          <Tooltip permanent direction="top" offset={[0, -10]}>
                            <span className="font-bold text-xs">{villageForm.name || 'Village Center'}</span>
                          </Tooltip>
                        </Marker>
                        <Circle
                          center={[parseFloat(villageForm.latitude), parseFloat(villageForm.longitude)]}
                          radius={parseInt(villageForm.radius) || 500}
                          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2 }}
                        />
                      </>
                    )}

                    {villageForm.isPolygon && polygonPoints.length > 0 && (
                      <>
                        {polygonPoints.map((p, i) => (
                          <Marker
                            key={i}
                            position={p}
                            draggable={true}
                            eventHandlers={{
                              dragend: (e) => {
                                const marker = e.target;
                                const position = marker.getLatLng();
                                const newPoints = [...polygonPoints];
                                newPoints[i] = [position.lat, position.lng];
                                setPolygonPoints(newPoints);
                                if (newPoints.length >= 3) {
                                  const coords = [...newPoints, newPoints[0]].map(pt => [pt[1], pt[0]]);
                                  setVillageForm(prev => ({
                                    ...prev,
                                    boundary: { type: 'Polygon', coordinates: [coords] }
                                  }));
                                }
                              },
                            }}
                          >
                            <Tooltip permanent direction="bottom" offset={[0, 10]}>
                              <span className="text-[10px] font-bold bg-white/80 px-1 rounded shadow-sm">P{i + 1}</span>
                            </Tooltip>
                            <Popup>
                              <div className="flex flex-col gap-2 p-1 min-w-[100px]">
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Point {i + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = polygonPoints.filter((_, idx) => idx !== i);
                                    setPolygonPoints(next);
                                    if (next.length >= 3) {
                                      const coords = [...next, next[0]].map(pt => [pt[1], pt[0]]);
                                      setVillageForm(prev => ({
                                        ...prev,
                                        boundary: { type: 'Polygon', coordinates: [coords] }
                                      }));
                                    } else {
                                      setVillageForm(prev => ({ ...prev, boundary: null }));
                                    }
                                  }}
                                  className="w-full bg-rose-50 text-rose-600 px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                                >
                                  <Trash2 size={12} /> Remove
                                </button>
                              </div>
                            </Popup>
                          </Marker>
                        ))}
                        {polygonPoints.length >= 2 && (
                          <Polygon
                            positions={polygonPoints}
                            pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, dashArray: '5, 10' }}
                          />
                        )}
                      </>
                    )}
                  </MapContainer>

                  <div className="absolute top-4 left-4 z-[10] flex flex-col gap-2">
                    <div className="bg-white/90 backdrop-blur px-3 py-2 rounded-xl border border-gray-100 shadow-lg">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                        <Target size={12} /> {villageForm.isPolygon ? 'Click Map to add points • Drag Markers to edit' : 'Click Map to set Center'}
                      </p>
                    </div>
                    {villageForm.isPolygon && polygonPoints.length > 0 && (
                      <button
                        onClick={() => { setPolygonPoints([]); setVillageForm(prev => ({ ...prev, boundary: null })); }}
                        className="bg-rose-50 text-rose-600 px-3 py-2 rounded-xl border border-rose-100 shadow-lg text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-100 transition-all"
                      >
                        <RotateCcw size={12} /> Reset Points
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const lat = pos.coords.latitude;
                          const lng = pos.coords.longitude;
                          setVillageForm(prev => ({
                            ...prev,
                            latitude: lat.toFixed(6),
                            longitude: lng.toFixed(6)
                          }));
                        });
                      }
                    }}
                    className="absolute bottom-4 right-4 z-[10] p-3 bg-white rounded-2xl shadow-xl border border-gray-100 text-emerald-600 hover:scale-110 transition-all active:scale-95"
                  >
                    <Target size={20} strokeWidth={2.5} />
                  </button>
                </div>

                {/* Right Side: Form Details */}
                <div className="w-full md:w-2/5 p-8 flex flex-col gap-6 overflow-y-auto bg-gray-50/50">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">{villageForm.id ? 'Edit Village' : 'New Village'}</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Define operational area</p>
                  </div>

                  <div className="flex bg-gray-200/50 p-1 rounded-2xl">
                    <button
                      onClick={() => setVillageForm(prev => ({ ...prev, isPolygon: false }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!villageForm.isPolygon ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      <CircleIcon size={14} /> Circle
                    </button>
                    <button
                      onClick={() => setVillageForm(prev => ({ ...prev, isPolygon: true }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${villageForm.isPolygon ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-400'}`}
                    >
                      <Hexagon size={14} /> Polygon
                    </button>
                  </div>

                  <form onSubmit={handleSaveVillage} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Village Name</label>
                      <div className="relative">
                        <Home className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Search or enter village name..."
                          className="w-full bg-white border border-gray-100 pl-12 pr-10 py-4 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-sm transition-all"
                          value={villageForm.name}
                          onChange={e => {
                            setVillageForm({ ...villageForm, name: e.target.value });
                            searchVillages(e.target.value);
                          }}
                        />
                        {isSearchingVillage && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <Loader2 size={16} className="animate-spin text-emerald-500" />
                          </div>
                        )}

                        {villageSuggestions.length > 0 && (
                          <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl z-[999] overflow-hidden animate-slide-up ring-4 ring-black/5">
                            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Global Location Results</span>
                            </div>
                            <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                              {villageSuggestions.map((s, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setVillageForm({
                                      ...villageForm,
                                      name: s.display_name.split(',')[0],
                                      latitude: parseFloat(s.lat).toFixed(6),
                                      longitude: parseFloat(s.lon).toFixed(6)
                                    });
                                    setVillageSuggestions([]);
                                  }}
                                  className="w-full text-left px-6 py-4 hover:bg-emerald-50 transition-colors flex flex-col gap-0.5 border-b border-gray-50 last:border-0 group"
                                >
                                  <span className="text-sm font-black text-gray-900 group-hover:text-emerald-700">{s.display_name.split(',')[0]}</span>
                                  <span className="text-[10px] text-gray-400 font-bold truncate group-hover:text-emerald-600/70">{s.display_name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {!villageForm.isPolygon ? (
                      <div className="space-y-4 p-5 bg-emerald-50/50 rounded-3xl border border-emerald-100/50">
                        <div className="flex items-center justify-between">
                          <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Geofence Radius</label>
                          <span className="text-xs font-black text-emerald-700 bg-emerald-100/50 px-2.5 py-1 rounded-lg">{villageForm.radius}m</span>
                        </div>
                        <input
                          type="range"
                          min="100"
                          max="5000"
                          step="100"
                          className="w-full h-1.5 bg-emerald-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                          value={villageForm.radius}
                          onChange={(e) => setVillageForm({ ...villageForm, radius: e.target.value })}
                        />
                      </div>
                    ) : (
                      <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50 space-y-3">
                        <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">Polygon Points</label>
                        <div className="max-h-[150px] overflow-y-auto space-y-2 custom-scrollbar pr-2">
                          {polygonPoints.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">No points added yet. Click the map to draw your boundary.</p>
                          ) : (
                            polygonPoints.map((p, i) => (
                              <div key={i} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-indigo-50 shadow-sm">
                                <span className="text-[10px] font-bold text-gray-600">Point {i + 1}: {p[0].toFixed(4)}, {p[1].toFixed(4)}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = polygonPoints.filter((_, idx) => idx !== i);
                                    setPolygonPoints(next);
                                    if (next.length >= 3) {
                                      const coords = [...next, next[0]].map(pt => [pt[1], pt[0]]);
                                      setVillageForm(prev => ({ ...prev, boundary: { type: 'Polygon', coordinates: [coords] } }));
                                    } else {
                                      setVillageForm(prev => ({ ...prev, boundary: null }));
                                    }
                                  }}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                        {polygonPoints.length > 0 && polygonPoints.length < 3 && (
                          <p className="text-[9px] font-bold text-amber-600">Add at least 3 points to form a polygon.</p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Latitude</label>
                        <input type="number" step="any" placeholder="0.0000" className="w-full bg-white border border-gray-100 p-4 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold" value={villageForm.latitude} onChange={e => setVillageForm({ ...villageForm, latitude: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Longitude</label>
                        <input type="number" step="any" placeholder="0.0000" className="w-full bg-white border border-gray-100 p-4 rounded-xl outline-none focus:border-emerald-500 text-xs font-bold" value={villageForm.longitude} onChange={e => setVillageForm({ ...villageForm, longitude: e.target.value })} />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <button
                        type="submit"
                        disabled={isSubmitting || (villageForm.isPolygon && polygonPoints.length < 3)}
                        className="w-full bg-emerald-600 text-white p-5 rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {isSubmitting ? 'Syncing...' : 'Confirm Village Area'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          ) : (
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
                {can('ROUTES', 'CREATE') && (
                  <button
                    onClick={() => { resetVillageForm(); setIsVillageEditorOpen(true); }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                  >
                    <Plus size={16} strokeWidth={3} /> New Village
                  </button>
                )}
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
                          if (paginatedVillages.length === 0) {
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
                          return paginatedVillages.map(v => (
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
                                  <a
                                    href={`https://www.google.com/maps?q=${encodeURIComponent(v.name + ' village')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
                                    title="Open in Maps"
                                  >
                                    <MapPin size={15} />
                                  </a>
                                  {can('ROUTES', 'UPDATE') && (
                                    <button
                                      onClick={() => {
                                        setVillageForm({
                                          id: v.id,
                                          name: v.name,
                                          latitude: v.latitude || '',
                                          longitude: v.longitude || '',
                                          radius: v.radius || 500,
                                          isPolygon: v.isPolygon || false,
                                          boundary: v.boundary || null
                                        });
                                        if (v.boundary && v.boundary.coordinates) {
                                          setPolygonPoints(v.boundary.coordinates[0].map(c => [c[1], c[0]]));
                                        } else {
                                          setPolygonPoints([]);
                                        }
                                        setIsVillageEditorOpen(true);
                                      }}
                                      className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all"
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  {can('ROUTES', 'DELETE') && (
                                    <button
                                      onClick={() => handleDeleteVillage(v.id)}
                                      className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  )}
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

              {totalVillagePages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm mt-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      Showing {(villagePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(villagePage * ITEMS_PER_PAGE, filteredVillages.length)} of {filteredVillages.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setVillagePage(prev => Math.max(1, prev - 1))}
                      disabled={villagePage === 1}
                      className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalVillagePages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalVillagePages || (pageNum >= villagePage - 1 && pageNum <= villagePage + 1)) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setVillagePage(pageNum)}
                              className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${villagePage === pageNum ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === villagePage - 2 || pageNum === villagePage + 2) {
                          return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => setVillagePage(prev => Math.min(totalVillagePages, prev + 1))}
                      disabled={villagePage === totalVillagePages}
                      className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --- ROUTES TAB --- */}
      {activeTab === 'routes' && (
        <div className="animate-fade-in">
          {isRouteEditorOpen ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setIsRouteEditorOpen(false)}
                    className="p-3 hover:bg-gray-50 rounded-2xl text-gray-400 hover:text-emerald-600 transition-all"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                      {routeForm.id ? 'Edit Route' : 'Create New Route'}
                    </h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Group villages into an operational cluster</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={handleSaveRoute}
                    disabled={isSubmitting || !routeForm.routeName || routeForm.selectedVillages.length === 0}
                    className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Cluster'}
                  </button>
                  {!routeForm.routeName && <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">* Enter Route Name</span>}
                  {routeForm.selectedVillages.length === 0 && <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">* Select Villages Below</span>}
                </div>
              </div>

              <div className="flex flex-col gap-6 h-[calc(100vh-280px)]">
                {/* Selection Panel */}
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm p-8 overflow-y-auto custom-scrollbar flex flex-col gap-6 flex-1">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Route Name</label>
                    <div className="relative">
                      <LayoutGrid className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="text"
                        placeholder="e.g. Hyderabad North Cluster"
                        className="w-full bg-white border border-gray-100 pl-12 pr-4 py-4 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-sm transition-all"
                        value={routeForm.routeName}
                        onChange={e => setRouteForm({ ...routeForm, routeName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Village Selection</label>
                      <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Select to map</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 custom-scrollbar">
                      {(() => {
                        const assignedVillages = routes.reduce((acc, r) => {
                          if (r.id !== routeForm.id) {
                            return [...acc, ...(r.villages || [])];
                          }
                          return acc;
                        }, []);

                        const availableVillages = villages.filter(v => !assignedVillages.includes(v.name));

                        if (availableVillages.length === 0) return <p className="text-[10px] text-gray-400 italic p-4 text-center">No villages available for clustering</p>;

                        return availableVillages.map(v => (
                          <label
                            key={v.id}
                            className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition-all group ${routeForm.selectedVillages.includes(v.name) ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-gray-50 hover:border-emerald-100 hover:bg-gray-50/50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={routeForm.selectedVillages.includes(v.name)}
                                onChange={() => handleToggleRouteVillage(v.name)}
                              />
                              <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${routeForm.selectedVillages.includes(v.name) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-200 group-hover:border-emerald-300'}`}>
                                {routeForm.selectedVillages.includes(v.name) && <CheckCircle2 size={12} className="text-white" strokeWidth={4} />}
                              </div>
                              <div className="flex flex-col">
                                <span className={`text-sm font-black uppercase tracking-tight ${routeForm.selectedVillages.includes(v.name) ? 'text-emerald-900' : 'text-gray-700'}`}>{v.name}</span>
                                <span className="text-[9px] font-bold text-gray-400 truncate max-w-[120px]">{v.isPolygon ? 'Polygon' : `${v.radius}m Radius`}</span>
                              </div>
                            </div>
                            <MapPin size={14} className={routeForm.selectedVillages.includes(v.name) ? 'text-emerald-500' : 'text-gray-300'} />
                          </label>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search clusters..."
                    className="w-full bg-white border border-gray-100 pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:border-emerald-500 font-bold text-sm shadow-sm transition-all"
                    value={routeSearchQuery}
                    onChange={(e) => setRouteSearchQuery(e.target.value)}
                  />
                </div>
                {can('ROUTES', 'CREATE') && (
                  <button
                    onClick={() => { setRouteForm({ id: '', routeName: '', selectedVillages: [] }); setIsRouteEditorOpen(true); }}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-[0.98]"
                  >
                    <Plus size={16} strokeWidth={3} /> New Cluster
                  </button>
                )}
              </div>

              {isRoutesLoading ? (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm py-20 flex flex-col items-center justify-center gap-4">
                  <Loader2 className="animate-spin text-emerald-600" size={32} />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Clusters...</p>
                </div>
              ) : (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[40vh]">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                        <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px]">Cluster Profile</th>
                        <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px]">Composition</th>
                        <th className="px-8 py-5 font-black text-gray-400 uppercase tracking-[0.15em] text-[10px] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(() => {
                        if (paginatedRoutes.length === 0) {
                          return (
                            <tr>
                              <td colSpan="3" className="px-8 py-20 text-center text-gray-400 font-bold text-xs uppercase italic">
                                {routeSearchQuery ? `No results found for "${routeSearchQuery}"` : 'No clusters defined yet'}
                              </td>
                            </tr>
                          );
                        }
                        return paginatedRoutes.map(r => (
                          <tr key={r.id} className="hover:bg-gray-50/30 transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-sm">
                                  <LayoutGrid size={20} className="fill-emerald-600/10" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-black text-gray-900 uppercase tracking-tight">{r.routeName}</span>
                                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {r.id.slice(-8)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex flex-wrap gap-1.5">
                                {(r.villages || []).map((v, i) => (
                                  <span key={i} className="px-3 py-1 bg-gray-50 text-gray-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-gray-100">
                                    {v}
                                  </span>
                                ))}
                                {(!r.villages || r.villages.length === 0) && <span className="text-[10px] text-gray-400 italic">Empty cluster</span>}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-2 transition-all">
                                {can('ROUTES', 'UPDATE') && (
                                  <button
                                    onClick={() => {
                                      setRouteForm({
                                        id: r.id,
                                        routeName: r.routeName,
                                        selectedVillages: r.villages || []
                                      });
                                      setIsRouteEditorOpen(true);
                                    }}
                                    className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-200 shadow-sm transition-all"
                                  >
                                    <Pencil size={15} />
                                  </button>
                                )}
                                {can('ROUTES', 'DELETE') && (
                                  <button onClick={async () => { if (window.confirm('Delete?')) { await routeService.deleteRoute(r.id); fetchData(); } }} className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"><Trash2 size={15} /></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              )}

              {totalRoutePages > 1 && (
                <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm mt-4">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                      Showing {(routePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(routePage * ITEMS_PER_PAGE, filteredRoutes.length)} of {filteredRoutes.length}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRoutePage(prev => Math.max(1, prev - 1))}
                      disabled={routePage === 1}
                      className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <div className="flex items-center gap-1">
                      {[...Array(totalRoutePages)].map((_, i) => {
                        const pageNum = i + 1;
                        if (pageNum === 1 || pageNum === totalRoutePages || (pageNum >= routePage - 1 && pageNum <= routePage + 1)) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setRoutePage(pageNum)}
                              className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${routePage === pageNum ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                            >
                              {pageNum}
                            </button>
                          );
                        } else if (pageNum === routePage - 2 || pageNum === routePage + 2) {
                          return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button
                      onClick={() => setRoutePage(prev => Math.min(totalRoutePages, prev + 1))}
                      disabled={routePage === totalRoutePages}
                      className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-emerald-600 hover:border-emerald-100 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>
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
            {can('ROUTES', 'CREATE') && (
              <button
                onClick={() => { setAssignmentForm({ id: '', vehicleId: '', userId: '', routeId: '', morningSession: '', afternoonSession: '' }); setShowAssignModal(true); }}
                className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                <Plus size={16} strokeWidth={3} /> New Assignment
              </button>
            )}
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
                  if (paginatedAssignments.length === 0) return <div className="text-center py-10 text-gray-400 font-bold text-xs uppercase italic bg-white rounded-3xl border border-gray-100">No matching assignments</div>;

                  return paginatedAssignments.map(a => (
                    <div key={a.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col gap-4">
                      <div className="flex justify-between items-center pb-3 border-b border-gray-50">
                        <h4 className="font-black text-gray-900 uppercase tracking-tight">{a.route?.routeName}</h4>
                        <div className="flex gap-1">
                          {can('ROUTES', 'UPDATE') && (
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
                            }} className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><Pencil size={15} /></button>
                          )}
                          {can('ROUTES', 'DELETE') && (
                            <button onClick={async () => { if (window.confirm('Remove?')) { await routeService.deleteRouteAssignment(a.id); fetchData(); } }} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"><X size={15} /></button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5"><Truck size={10} /> Vehicle</span>
                          <span className="text-sm font-black text-gray-800 leading-none">{a.vehicle?.vehicleNumber}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-1.5"><User size={10} /> Agent</span>
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
                      if (paginatedAssignments.length === 0) {
                        return (
                          <tr>
                            <td colSpan="4" className="px-8 py-20 text-center text-gray-400 font-bold text-xs uppercase italic">
                              {assignmentSearchQuery ? `No results found for "${assignmentSearchQuery}"` : 'No assignments created'}
                            </td>
                          </tr>
                        );
                      }
                      return paginatedAssignments.map(a => (
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
                              {can('ROUTES', 'UPDATE') && (
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
                                }} className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-200 shadow-sm transition-all"><Pencil size={15} /></button>
                              )}
                              {can('ROUTES', 'DELETE') && (
                                <button onClick={async () => { if (window.confirm('Remove?')) { await routeService.deleteRouteAssignment(a.id); fetchData(); } }} className="p-2.5 bg-white rounded-xl border border-gray-100 text-gray-400 hover:text-rose-600 hover:border-rose-200 shadow-sm transition-all"><X size={15} /></button>
                              )}
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

          {totalAssignmentPages > 1 && (
            <div className="flex items-center justify-between bg-white px-8 py-4 rounded-[2rem] border border-gray-100 shadow-sm mt-4">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                  Showing {(assignmentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(assignmentPage * ITEMS_PER_PAGE, filteredAssignments.length)} of {filteredAssignments.length}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setAssignmentPage(prev => Math.max(1, prev - 1))}
                  disabled={assignmentPage === 1}
                  className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                >
                  <ChevronLeft size={16} />
                </button>

                <div className="flex items-center gap-1">
                  {[...Array(totalAssignmentPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (pageNum === 1 || pageNum === totalAssignmentPages || (pageNum >= assignmentPage - 1 && pageNum <= assignmentPage + 1)) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setAssignmentPage(pageNum)}
                          className={`w-9 h-9 rounded-xl text-[10px] font-black transition-all ${assignmentPage === pageNum ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === assignmentPage - 2 || pageNum === assignmentPage + 2) {
                      return <span key={pageNum} className="text-gray-300 px-1">...</span>;
                    }
                    return null;
                  })}
                </div>

                <button
                  onClick={() => setAssignmentPage(prev => Math.min(totalAssignmentPages, prev + 1))}
                  disabled={assignmentPage === totalAssignmentPages}
                  className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-indigo-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:border-gray-100 disabled:hover:text-gray-400 transition-all"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* --- MODALS --- */}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><LayoutGrid className="text-indigo-500" /> Assign Route</h3>
            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Route <span className="text-rose-500">*</span></label>
                <select className="w-full bg-gray-50 border p-3 rounded-xl outline-none font-medium" value={assignmentForm.routeId} onChange={e => {
                  const r = routes.find(x => x.id === e.target.value);
                  setAssignmentForm({ ...assignmentForm, routeId: e.target.value, morningSession: '', afternoonSession: '' });
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
