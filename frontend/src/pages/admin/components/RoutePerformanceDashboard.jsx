import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Users, MapPin, AlertCircle, CheckCircle2,
  ChevronRight, Search, RefreshCw, X, Bell, Activity,
  Filter, Clock, ShoppingBag
} from 'lucide-react';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import * as routeService from '../../../services/routeService';
import * as locationService from '../../../services/locationService';
import toast from 'react-hot-toast';

// ── Circular Progress Ring ──────────────────────────────────────────────────
function ProgressRing({ percentage = 0, size = 48, stroke = 4 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(percentage, 100) / 100) * circ;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f3f4f6" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#10b981" strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-gray-800">
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

export default function RoutePerformanceDashboard({ storeId, isLoaded }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: { totalRoutes: 0, activeRoutes: 0, avgCompletion: 0, totalSales: 0 }, performance: [] });
  const [liveLocations, setLiveLocations] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignmentDetail, setAssignmentDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [closureLoading, setClosureLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [breadcrumbPath, setBreadcrumbPath] = useState([]);
  const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [perfRes, liveRes] = await Promise.all([
        routeService.getRoutePerformance({ storeId }),
        locationService.getLiveLocations(storeId)
      ]);
      setData(perfRes);
      setLiveLocations(liveRes);
    } catch (err) {
      toast.error('Failed to load performance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const iv = setInterval(async () => {
      try { setLiveLocations(await locationService.getLiveLocations(storeId)); } catch (_) {}
    }, 30000);
    return () => clearInterval(iv);
  }, [storeId]);

  const fetchDetail = async (id) => {
    setDetailLoading(true);
    try {
      const agent = data.performance.find(p => p.assignmentId === id);
      const [detailRes, historyRes] = await Promise.all([
        routeService.getAssignmentPerformanceDetail(id),
        locationService.getLocationHistory({ userId: agent?.userId })
      ]);
      setAssignmentDetail(detailRes);
      const path = historyRes.map(l => ({ lat: l.lat, lng: l.long }));
      setBreadcrumbPath(path);
      setSelectedAssignment(id);
      if (path.length > 0) setMapCenter(path[path.length - 1]);
    } catch (_) {
      toast.error('Failed to load details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (!selectedAssignment) return;
    setClosureLoading(true);
    try {
      await routeService.getRouteClosureSummary(selectedAssignment);
      toast.success('Summary generated!');
    } catch (_) {
      toast.error('Failed to generate summary');
    } finally {
      setClosureLoading(false);
    }
  };

  const isAgentLive = (userId) => {
    const loc = liveLocations.find(l => l.userId === userId);
    return loc && (new Date() - new Date(loc.updatedAt)) < 10 * 60 * 1000;
  };

  const filteredPerf = data.performance.filter(p => {
    const q = searchQuery.toLowerCase();
    const matches = p.agentName?.toLowerCase().includes(q) || p.routeName?.toLowerCase().includes(q);
    if (showOnlyActive) return matches && isAgentLive(p.userId);
    return matches;
  });

  const totalMissed = data.performance.reduce((a, p) => a + (p.missedVillages?.length || 0), 0);
  const selectedPerf = data.performance.find(p => p.assignmentId === selectedAssignment);

  // ── KPI Cards config ────────────────────────────────────────────────────────
  const kpis = [
    {
      label: "Today's Sales",
      value: `₹${(data.summary.totalSales || 0).toLocaleString()}`,
      icon: <TrendingUp size={22} />,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Coverage Rate',
      value: `${isNaN(data.summary.avgCompletion) ? 0 : Math.round(data.summary.avgCompletion)}%`,
      icon: <Activity size={22} />,
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
    },
    {
      label: 'Active Agents',
      value: data.summary.activeRoutes ?? 0,
      icon: <Users size={22} />,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Missed Villages',
      value: totalMissed,
      icon: <AlertCircle size={22} />,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-500',
    },
  ];

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <RefreshCw className="w-7 h-7 text-emerald-500 animate-spin" />
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Loading Performance...</p>
    </div>
  );

  return (
    <div className="space-y-5 pb-20">

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${k.iconBg} ${k.iconColor}`}>
              {k.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-1">{k.label}</p>
              <p className="text-2xl font-black text-gray-900 leading-none">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Active Coverage Alerts ── */}
      {data.performance.some(p => p.missedVillages?.length > 0) && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={16} className="text-red-500 animate-pulse" />
            <span className="text-xs font-black text-red-700 uppercase tracking-widest">Active Coverage Alerts</span>
            <span className="ml-1 px-2 py-0.5 bg-red-200 text-red-800 text-[9px] font-black rounded-full">{totalMissed}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1 custom-scrollbar">
            {data.performance.filter(p => p.missedVillages?.length > 0).map((p, i) => (
              <button
                key={i}
                onClick={() => fetchDetail(p.assignmentId)}
                className="flex items-center justify-between gap-4 bg-white rounded-xl border border-red-100 px-4 py-3 shadow-sm min-w-[200px] hover:border-red-300 transition-all"
              >
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-1.5 animate-pulse shrink-0" />
                  <div className="text-left">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-wider">
                      {p.agentName?.toUpperCase() || 'UNKNOWN AGENT'}
                    </p>
                    <p className="text-xs font-black text-red-600">{p.missedVillages.length} Village Missed</p>
                  </div>
                </div>
                <ChevronRight size={14} className="text-red-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main content: Agent List + Sidebar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Agent List ── */}
        <div className="lg:col-span-8 space-y-3">

          {/* Search & Filters */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                placeholder="Search agent by name or route..."
                className="w-full bg-white border border-gray-100 pl-10 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500/20 text-sm font-medium text-gray-700 placeholder-gray-300"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            <button onClick={fetchData} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 transition-all shadow-sm">
              <RefreshCw size={17} />
            </button>
            <button className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-600 transition-all shadow-sm">
              <Filter size={17} />
            </button>
            {/* Active Only Toggle */}
            <div className="flex items-center gap-2 bg-white border border-gray-100 rounded-xl px-3 py-2 shadow-sm">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap">Active Only</span>
              <button
                onClick={() => setShowOnlyActive(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${showOnlyActive ? 'bg-emerald-500' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${showOnlyActive ? 'translate-x-4' : ''}`} />
              </button>
            </div>
          </div>

          {/* Agent Cards */}
          {filteredPerf.length === 0 && (
            <div className="py-16 bg-white rounded-2xl border border-gray-100 flex flex-col items-center gap-3">
              <Users size={36} className="text-gray-200" />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No agents found</p>
            </div>
          )}

          {filteredPerf.map((p, idx) => {
            const live = isAgentLive(p.userId);
            const isSelected = selectedAssignment === p.assignmentId;
            return (
              <button
                key={p.assignmentId}
                onClick={() => fetchDetail(p.assignmentId)}
                className={`w-full bg-white rounded-2xl border px-5 py-4 flex items-center justify-between gap-4 transition-all shadow-sm hover:shadow-md text-left ${isSelected ? 'border-emerald-400 ring-2 ring-emerald-400/10' : 'border-gray-100 hover:border-emerald-200'}`}
              >
                {/* Left: progress + name */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <ProgressRing percentage={p.completionRate || 0} size={48} stroke={4} />
                    {live && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-black text-gray-900">{p.agentName}</p>
                      {live && <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded uppercase">Live</span>}
                    </div>
                    <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                      {p.routeName} • {p.assignedCount ?? 0} Assigned Villages
                    </p>
                  </div>
                </div>

                {/* Right: stats */}
                <div className="flex items-center gap-6 shrink-0">
                  <div className="hidden md:block text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Today's Sales</p>
                    <p className="text-sm font-black text-gray-900">₹{(p.totalSales || 0).toLocaleString()}</p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Coverage</p>
                    <p className="text-sm font-black text-gray-900">{p.visitedCount ?? 0}/{p.assignedCount ?? 1}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-lg border border-emerald-100">
                    Active
                  </span>
                  <ChevronRight size={16} className={`transition-colors ${isSelected ? 'text-emerald-500' : 'text-gray-300'}`} />
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Right Sidebar ── */}
        <div className="lg:col-span-4">
          <div className="sticky top-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Sidebar Header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-start justify-between">
              <div>
                <p className="text-base font-black text-gray-900 leading-none">
                  {selectedPerf?.agentName || 'Select an Agent'}
                </p>
                <p className="text-[10px] font-bold text-gray-400 mt-1">
                  {selectedPerf?.routeName || 'Click a row to drill down'}
                </p>
              </div>
              {selectedAssignment && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg border border-emerald-100 uppercase tracking-widest">
                  <Activity size={10} className="animate-pulse" /> Live Tracking
                </span>
              )}
            </div>

            {/* Map */}
            <div className="h-[220px] w-full bg-gray-100">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ width: '100%', height: '100%' }}
                  center={mapCenter}
                  zoom={selectedAssignment ? 13 : 10}
                  options={{ disableDefaultUI: true, styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] }}
                >
                  {selectedAssignment && breadcrumbPath.length > 0 && (
                    <MarkerF
                      position={breadcrumbPath[breadcrumbPath.length - 1]}
                      icon={{ path: window.google?.maps.SymbolPath.CIRCLE, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 8 }}
                    />
                  )}
                  {selectedAssignment && assignmentDetail?.breakdown.filter(v => v.latitude && v.longitude).map((v, i) => (
                    <MarkerF
                      key={i}
                      position={{ lat: parseFloat(v.latitude), lng: parseFloat(v.longitude) }}
                      icon={{ path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z', fillColor: v.visited ? '#10b981' : '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 1.5, scale: 1.2, anchor: { x: 12, y: 24 } }}
                    />
                  ))}
                  {!selectedAssignment && liveLocations.filter(l => l.lat && l.long && (new Date() - new Date(l.updatedAt)) < 15 * 60 * 1000).map(loc => (
                    <MarkerF
                      key={loc.userId}
                      position={{ lat: loc.lat, lng: loc.long }}
                      onClick={() => { const p = data.performance.find(x => x.userId === loc.userId); if (p) fetchDetail(p.assignmentId); }}
                      icon={{ path: window.google?.maps.SymbolPath.CIRCLE, fillColor: '#10b981', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 7 }}
                    />
                  ))}
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <RefreshCw className="animate-spin text-gray-300" size={28} />
                </div>
              )}
            </div>

            {/* Village Visit Timeline */}
            {selectedAssignment && assignmentDetail ? (
              <div className="p-5 space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Village Visit Timeline</p>
                <div className="relative">
                  {/* Vertical line */}
                  <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-0">
                    {assignmentDetail.breakdown.map((v, i) => (
                      <div key={i} className="flex gap-4 pl-1 py-3 border-b border-gray-50 last:border-0">
                        <div className={`w-3.5 h-3.5 rounded-full border-2 border-white shrink-0 mt-1 z-10 ${v.visited ? 'bg-emerald-500' : 'bg-red-400'}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-black text-gray-900 leading-tight">{v.villageName}</p>
                            {v.visited ? (
                              <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <span className="w-3.5 h-3.5 shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] font-bold text-gray-400">Orders: {v.orderCount ?? '-'}</p>
                            <span className="text-gray-200">•</span>
                            <p className="text-[10px] font-bold text-gray-400">
                              Time: {v.visitTime ? new Date(v.visitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                            </p>
                          </div>
                          <p className={`text-[10px] font-black mt-1 ${v.visited ? 'text-emerald-600' : 'text-red-500'}`}>
                            Status: {v.visited ? 'Visited' : 'Pending'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate Summary Button */}
                <div className="pt-3">
                  <button
                    onClick={handleGenerateSummary}
                    disabled={closureLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-sm tracking-tight shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                  >
                    {closureLoading ? <RefreshCw size={16} className="animate-spin" /> : <>Generate Summary <ChevronRight size={16} /></>}
                  </button>
                  <button
                    onClick={() => { setSelectedAssignment(null); setAssignmentDetail(null); }}
                    className="w-full mt-2 text-[10px] font-black text-gray-400 hover:text-gray-600 uppercase tracking-widest transition-colors py-1"
                  >
                    ← Back to Global View
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-3">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center mb-3">Command Center</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-700 mb-1">Live Status</p>
                    <p className="text-[8px] text-gray-400 leading-relaxed">Agents with active GPS are shown live on the map.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[9px] font-black text-gray-700 mb-1">Click to Drill</p>
                    <p className="text-[8px] text-gray-400 leading-relaxed">Click any agent row to see their village timeline.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
