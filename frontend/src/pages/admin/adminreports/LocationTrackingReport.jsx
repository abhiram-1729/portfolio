import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Loader2, Zap, Users, ShieldCheck, UserMinus, Monitor, RefreshCw, ChevronDown, History, ChevronRight } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindow, Polyline, CircleF, MarkerClusterer } from '@react-google-maps/api';
import { format, formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import { formatMinutesToHours } from './ReportUtils';
import { io } from 'socket.io-client';

const getTruckPin = (color) => {
    // Escaping special characters for b64
    const svg = `
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 0C8.95 0 0 8.95 0 20c0 15 20 30 20 30s20-15 20-30C40 8.95 31.05 0 20 0z" fill="${color.replace('#', '%23')}"/>
            <circle cx="20" cy="20" r="13" fill="white"/>
            <path d="M29 18h-2.5v-2.5h-10v9h1.5c0 1.1.9 2 2 2s2-.9 2-2h3c0 1.1.9 2 2 2s2-.9 2-2h1.5v-3.5L29 18zM19 24.5c-.4 0-.75-.35-.75-.75s.35-.75.75-.75.75.35.75.75-.35.75-.75.75zm8 0c-.4 0-.75-.35-.75-.75s.35-.75.75-.75.75.35.75.75-.35.75-.75.75z" fill="${color.replace('#', '%23')}"/>
        </svg>
    `.trim();
    return `data:image/svg+xml;utf8,${svg}`;
};

export default function LocationTrackingReport() {
    const [reportData, setReportData] = useState([]);
    const [liveLocations, setLiveLocations] = useState([]);
    const [breadcrumbHistory, setBreadcrumbHistory] = useState([]);
    const [trackingReportsData, setTrackingReportsData] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [subTab, setSubTab] = useState('live-map'); // 'live-map' | 'history'
    const [historyTab, setHistoryTab] = useState('logs'); // 'logs' | 'visits' | 'deviation'
    const [expandedAgents, setExpandedAgents] = useState({});

    const toggleAgentExpand = (userId) => {
        setExpandedAgents(prev => ({
            ...prev,
            [userId]: !prev[userId]
        }));
    };
    const [searchParams] = useSearchParams();
    const [activeAgent, setActiveAgent] = useState(null);
    const [selectedHistoryPoint, setSelectedHistoryPoint] = useState(null);
    const [map, setMap] = useState(null);
    const [isSatellite, setIsSatellite] = useState(false);
    const [lastSync, setLastSync] = useState(new Date());
    const storeId = searchParams.get('storeId');

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    });

    const fetchLiveLocations = async () => {
        try {
            const params = storeId ? { storeId, _t: Date.now() } : { _t: Date.now() };
            const [liveRes, histRes] = await Promise.all([
                adminAPI.getLiveLocations(params),
                adminAPI.getBreadcrumbHistory(params)
            ]);
            
            if (liveRes.data) {
                setLiveLocations(liveRes.data);
                setLastSync(new Date());
            }
            if (histRes.data) {
                setBreadcrumbHistory(histRes.data);
            }
        } catch (error) {
            console.error('[Live Tracking] Auto-update failed:', error);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = storeId ? { storeId } : {};
            const [locRes, visitRes, devRes] = await Promise.all([
                adminAPI.getLocationCheckIns(),
                adminAPI.getTrackingVillageVisits(params),
                adminAPI.getTrackingTimeDeviation(params),
                fetchLiveLocations()
            ]);
            setReportData(locRes.data);
            setTrackingReportsData({
                villageVisits: visitRes.data,
                timeDeviation: devRes.data
            });
        } catch (error) {
            console.error('Data fetch failed', error);
            toast.error('Failed to load tracking reports');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        
        // Force auto-update every 15 seconds
        const interval = setInterval(() => {
            console.log('[Live Tracking] Heartbeat: Fetching latest locations...');
            fetchLiveLocations();
        }, 15000);

        const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('5173', '5000');
        const socket = io(socketUrl, {
            auth: { token: localStorage.getItem('token') },
            transports: ['websocket', 'polling']
        });

        socket.on('locationUpdate', (newLog) => {
            console.log('[Live Tracking] Socket update received:', newLog);
            setLiveLocations(prev => {
                const index = prev.findIndex(a => a.userId === newLog.userId);
                const formattedLog = { ...newLog, long: newLog.long || newLog.lon };
                if (index !== -1) {
                    const updated = [...prev];
                    updated[index] = formattedLog;
                    return updated;
                }
                return [formattedLog, ...prev];
            });
            setLastSync(new Date());
            setBreadcrumbHistory(prev => [...prev, { ...newLog, long: newLog.long || newLog.lon }]);
        });

        return () => {
            clearInterval(interval);
            socket.disconnect();
        };
    }, [storeId]);

    const onMapLoad = (mapInstance) => {
        setMap(mapInstance);
    };

    const fitBounds = () => {
        if (!map || liveLocations.length === 0) return;
        const bounds = new window.google.maps.LatLngBounds();
        liveLocations.forEach(agent => {
            if (agent.lat && agent.long) bounds.extend({ lat: agent.lat, lng: agent.long });
        });
        map.fitBounds(bounds);
    };

    // Status Calculations
    const onDutyCount = liveLocations.length;
    const activeCount = liveLocations.filter(a => {
        const diff = new Date() - new Date(a.timestamp);
        return diff < 5 * 60 * 1000 && !a.isPendingFirstPing;
    }).length;
    const offlineCount = 0; // Would need total agent count to calculate accurately
    const totalAgents = onDutyCount + offlineCount;

    return (
        <ReportLayout title="Location Tracking" icon={Navigation} activeTab="location-tracking" reportData={reportData} isLoading={isLoading}>
            <div className="space-y-6 animate-in fade-in duration-700 max-w-[1600px] mx-auto">
                
                {/* Header & Main Tabs */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-black text-gray-900 tracking-tight">Live Agent Tracking</h2>
                        <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-100 rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                        </div>
                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest border-l border-gray-100 pl-3">
                            Last Sync: {format(lastSync, 'hh:mm:ss a')}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex gap-1 p-1 bg-gray-100/80 backdrop-blur-sm rounded-xl border border-gray-200/50">
                            {['live-map', 'history'].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setSubTab(tab)}
                                    className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${subTab === tab ? 'bg-white text-rose-600 shadow-sm border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {tab === 'live-map' ? 'Live Map' : 'History'}
                                </button>
                            ))}
                        </div>
                        <button onClick={fetchData} className="p-2.5 bg-rose-600 text-white rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95">
                            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Agents', value: totalAgents, sub: 'All Agents', icon: Users, color: 'blue' },
                        { label: 'Active Agents', value: activeCount, sub: 'Currently Active', icon: Monitor, color: 'emerald' },
                        { label: 'On Duty', value: onDutyCount, sub: 'Started Shift', icon: ShieldCheck, color: 'indigo' },
                        { label: 'Offline Agents', value: offlineCount, sub: 'Currently Offline', icon: UserMinus, color: 'rose' }
                    ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-center gap-4">
                                <div className={`w-11 h-11 rounded-xl bg-${stat.color}-50 flex items-center justify-center text-${stat.color}-600 group-hover:scale-105 transition-transform`}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{stat.label}</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-xl font-black text-gray-900">{stat.value}</span>
                                        <span className="text-[8px] font-bold text-gray-300 uppercase">{stat.sub}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {subTab === 'live-map' && (
                    <div className="space-y-8">
                        {/* Map Area */}
                        <div className="w-full h-[600px] bg-white rounded-[3rem] border border-gray-100 shadow-sm overflow-hidden relative z-0">
                            {/* Map UI Overlays */}
                            <div className="absolute top-8 left-8 z-10 flex gap-2">
                                <button onClick={() => setIsSatellite(false)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all ${!isSatellite ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-100'}`}>Map</button>
                                <button onClick={() => setIsSatellite(true)} className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all ${isSatellite ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-50 border border-gray-100'}`}>Satellite</button>
                            </div>

                            {/* Agent Status Legend (Floating) */}
                            <div className="absolute top-6 right-6 z-10">
                                <div className="bg-white/90 backdrop-blur-md p-5 rounded-[2rem] shadow-2xl border border-white/20 min-w-[160px]">
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Agent Status</h4>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Active', count: activeCount, color: 'emerald' },
                                            { label: 'On Duty', count: onDutyCount, color: 'indigo' },
                                            { label: 'Idle', count: 0, color: 'amber' },
                                            { label: 'Offline', count: offlineCount, color: 'rose' }
                                        ].map((status, i) => (
                                            <div key={i} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full bg-${status.color}-500 ${status.label === 'Active' ? 'animate-pulse' : ''}`} />
                                                    <span className="text-[10px] font-bold text-gray-600">{status.label}</span>
                                                </div>
                                                <span className={`text-[10px] font-black px-1.5 py-0.5 bg-${status.color}-50 text-${status.color}-600 rounded-lg`}>{status.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={{ height: '100%', width: '100%' }}
                                    center={activeAgent ? { lat: activeAgent.lat, lng: activeAgent.long } : { lat: 17.3850, lng: 78.4867 }}
                                    zoom={activeAgent ? 16 : 12}
                                    onLoad={onMapLoad}
                                    options={{
                                        mapTypeId: isSatellite ? 'satellite' : 'roadmap',
                                        disableDefaultUI: true,
                                        zoomControl: true,
                                        styles: !isSatellite ? [
                                            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                                            { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
                                            { featureType: 'water', stylers: [{ color: '#f0f9ff' }] },
                                            { featureType: 'landscape', stylers: [{ color: '#ffffff' }] }
                                        ] : []
                                    }}
                                >
                                    {/* Polylines for Trails */}
                                    {liveLocations.map(agent => {
                                        const history = breadcrumbHistory.filter(h => h.userId === agent.userId);
                                        if (history.length < 2) return null;
                                        return (
                                            <Polyline
                                                key={`trail-${agent.userId}`}
                                                path={history.map(h => ({ lat: h.lat, lng: h.long || h.lon }))}
                                                options={{
                                                    strokeColor: '#E11D48',
                                                    strokeOpacity: 0.2,
                                                    strokeWeight: 2,
                                                    geodesic: true,
                                                }}
                                            />
                                        );
                                    })}

                                    {/* Live Markers */}
                                    <MarkerClusterer
                                        options={{
                                            gridSize: 40,
                                            styles: [{ url: 'https://raw.githubusercontent.com/googlemaps/v3-utility-library/master/markerclustererplus/images/m1.png', height: 40, width: 40, textColor: '#FFF', textSize: 10 }]
                                        }}
                                    >
                                        {(clusterer) => (
                                            <>
                                                {liveLocations.map(agent => {
                                                    const isActive = (new Date() - new Date(agent.timestamp)) < 5 * 60 * 1000 && !agent.isPendingFirstPing;
                                                    const isPending = agent.isPendingFirstPing;
                                                    
                                                    return (
                                                        <MarkerF
                                                            key={agent.userId}
                                                            position={{ lat: agent.lat, lng: agent.long }}
                                                            clusterer={clusterer}
                                                            onClick={() => setActiveAgent(agent)}
                                                            icon={{
                                                                url: getTruckPin(isActive ? '#10b981' : (isPending ? '#6366f1' : '#f59e0b')),
                                                                scaledSize: new window.google.maps.Size(40, 50),
                                                                anchor: new window.google.maps.Point(20, 50),
                                                                labelOrigin: new window.google.maps.Point(20, -10)
                                                            }}
                                                            label={{
                                                                text: `${agent.user?.name?.split(' ')[0]} • ${isPending ? 'Sync...' : formatDistanceToNow(new Date(agent.timestamp), { addSuffix: true }).replace('about ', '').replace(' minutes ago', 'm').replace(' minute ago', 'm').replace(' hours ago', 'h').replace('less than a minute ago', 'now')}`,
                                                                className: "bg-white/95 px-2.5 py-1 rounded-lg shadow-xl border border-gray-100 text-gray-900 font-black text-[9px] -mt-[64px] uppercase tracking-tighter whitespace-nowrap backdrop-blur-sm"
                                                            }}
                                                        />
                                                    );
                                                })}
                                            </>
                                        )}
                                    </MarkerClusterer>

                                    {/* Premium Floating Agent Card */}
                                    {activeAgent && (
                                        <div className="absolute bottom-4 left-4 z-10 animate-in slide-in-from-left-4 duration-500">
                                            <div className="bg-white/90 backdrop-blur-xl p-5 rounded-[2.5rem] shadow-2xl border border-white/50 w-72 ring-1 ring-black/5">
                                                <div className="flex items-start justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-rose-600 text-white flex items-center justify-center font-black text-lg shadow-lg shadow-rose-200">
                                                            {activeAgent.user?.name?.[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-gray-900 text-base leading-none mb-1">{activeAgent.user?.name}</p>
                                                            <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em]">Live Tracking</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => setActiveAgent(null)}
                                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-900"
                                                    >
                                                        <Users size={16} />
                                                    </button>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="p-4 bg-gray-50/50 rounded-3xl border border-gray-100/50">
                                                        <div className="flex gap-3">
                                                            <div className="mt-0.5">
                                                                <MapPin size={14} className="text-rose-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Location</p>
                                                                <p className="text-xs font-bold text-gray-700 leading-relaxed">{activeAgent.subLocation || 'In-Transit / Navigation active'}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-between px-2">
                                                        <div className="flex items-center gap-2 text-rose-600">
                                                            <Zap size={12} className="fill-rose-600" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest">Last Ping: {format(new Date(activeAgent.timestamp), 'hh:mm:ss a')}</span>
                                                        </div>
                                                        <button 
                                                            onClick={() => map?.panTo({ lat: activeAgent.lat, lng: activeAgent.long })}
                                                            className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                                                        >
                                                            Focus
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <Loader2 className="animate-spin text-rose-600" size={40} />
                                </div>
                            )}
                        </div>

                        {/* Recently Active Agents Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Recently Active Agents</h3>
                                <button onClick={fitBounds} className="text-[10px] font-black text-rose-600 uppercase tracking-widest hover:underline">View All on Map</button>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {liveLocations.length === 0 ? (
                                     <div className="col-span-full py-16 bg-gray-50 rounded-[2.5rem] text-center border-2 border-dashed border-gray-100">
                                         <Users className="mx-auto mb-3 text-gray-200" size={40} />
                                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No recently active agents</p>
                                     </div>
                                 ) : (
                                     liveLocations.map(agent => {
                                         const isActive = (new Date() - new Date(agent.timestamp)) < 5 * 60 * 1000;
                                         return (
                                             <div
                                                 key={agent.userId}
                                                 onClick={() => {
                                                     setActiveAgent(agent);
                                                     map?.panTo({ lat: agent.lat, lng: agent.long });
                                                     map?.setZoom(17);
                                                 }}
                                                 className={`bg-white p-4 rounded-[2rem] border transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 ${activeAgent?.userId === agent.userId ? 'border-rose-200 bg-rose-50/20 shadow-xl' : 'border-gray-100 hover:shadow-lg'}`}
                                             >
                                                 <div className="flex items-center justify-between mb-3">
                                                     <div className="flex items-center gap-2.5">
                                                         <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm group-hover:scale-105 transition-transform ${isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                                             {agent.user?.name?.[0]}
                                                         </div>
                                                         <div>
                                                             <p className="text-[11px] font-black text-gray-900">{agent.user?.name}</p>
                                                             <div className="flex items-center gap-1">
                                                                 <div className={`w-1 h-1 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                                                                 <span className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                     {isActive ? 'Active' : 'Idle'}
                                                                 </span>
                                                             </div>
                                                         </div>
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="space-y-2 pt-2.5 border-t border-gray-50">
                                                     <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase">
                                                         <span>Last Ping</span>
                                                         <span className="text-gray-900">{formatDistanceToNow(new Date(agent.timestamp), { addSuffix: true }).replace('about ', '')}</span>
                                                     </div>
                                                     <div className="flex items-center justify-between text-[9px] font-bold text-gray-400 uppercase">
                                                         <span>Speed</span>
                                                         <span className="text-emerald-600 font-black text-[10px]">2.4 km/h</span>
                                                     </div>
                                                 </div>
                                             </div>
                                         );
                                     })
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'history' && (
                    <div className="space-y-6">
                        {historyTab === 'logs' && (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Recent Geo-Logs (Breadcrumbs)</h3>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 border border-emerald-100 rounded-full">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Auto-Updating</span>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                        Last Refreshed: {format(lastSync, 'hh:mm:ss a')}
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {(function() {
                                        const grouped = breadcrumbHistory.reduce((acc, log) => {
                                            const uid = log.userId;
                                            if (!acc[uid]) acc[uid] = [];
                                            acc[uid].push(log);
                                            return acc;
                                        }, {});

                                        const sortedGroups = Object.entries(grouped).sort((a, b) => {
                                            const latestA = new Date(a[1][0].time || a[1][0].createdAt || a[1][0].timestamp);
                                            const latestB = new Date(b[1][0].time || b[1][0].createdAt || b[1][0].timestamp);
                                            return latestB - latestA;
                                        });

                                        return sortedGroups.map(([userId, logs]) => {
                                            const isExpanded = expandedAgents[userId];
                                            const latestLog = logs[0];
                                            
                                            return (
                                                <div key={userId} className="group transition-all">
                                                    <button 
                                                        onClick={() => toggleAgentExpand(userId)}
                                                        className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black shadow-sm group-hover:scale-110 transition-transform">
                                                                {latestLog.user?.name?.[0]}
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black text-gray-900 tracking-tight">{latestLog.user?.name}</h4>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded-full">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{logs.length} Recent Logs</span>
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-gray-300">•</span>
                                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest italic">
                                                                        Last ping {formatDistanceToNow(new Date(latestLog.time || latestLog.createdAt || latestLog.timestamp), { addSuffix: true })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className={`p-2 rounded-xl bg-gray-50 text-gray-400 transition-all ${isExpanded ? 'rotate-180 text-emerald-600 bg-emerald-50' : ''}`}>
                                                            <ChevronDown size={18} strokeWidth={3} />
                                                        </div>
                                                    </button>

                                                    {isExpanded && (
                                                        <div className="px-5 pb-5 animate-in slide-in-from-top-2 duration-300">
                                                            <div className="rounded-2xl border border-gray-100 bg-gray-50/30 overflow-hidden">
                                                                <table className="w-full text-left border-collapse">
                                                                    <thead>
                                                                        <tr className="bg-gray-100/50">
                                                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Village</th>
                                                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Landmark / Sub-Location</th>
                                                                            <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">Time</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody className="divide-y divide-gray-100">
                                                                        {logs.slice(0, 5).map((log, idx) => (
                                                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                                                <td className="px-4 py-3">
                                                                                    <div className="flex items-center gap-2">
                                                                                        <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center">
                                                                                            <MapPin size={12} className="text-rose-500" />
                                                                                        </div>
                                                                                        <span className="text-xs font-black text-gray-700">{log.villageName || 'In-Transit'}</span>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3 text-[10px] font-bold text-gray-500 italic truncate max-w-[200px]">
                                                                                    {log.subLocation || '---'}
                                                                                </td>
                                                                                <td className="px-4 py-3 text-[10px] font-black text-gray-400">
                                                                                    {format(new Date(log.time || log.createdAt || log.timestamp), 'hh:mm:ss a')}
                                                                                </td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                {logs.length > 5 && (
                                                                    <div className="px-4 py-2 bg-gray-100/50 text-center">
                                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest italic">Showing latest 5 of {logs.length} logs</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                    {breadcrumbHistory.length === 0 && (
                                        <div className="py-20 text-center bg-gray-50/30">
                                            <History size={40} className="mx-auto text-gray-200 mb-3 opacity-50" />
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest opacity-50">No geo-logs recorded for this period</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {historyTab === 'visits' && (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                                    <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Village Visit Durations</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Village</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Location</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {trackingReportsData?.villageVisits?.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-black text-gray-800">{log.agentName}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.villageName}</td>
                                                    <td className="px-6 py-4 text-[11px] font-medium text-gray-400 italic">{log.subLocation || '---'}</td>
                                                    <td className="px-6 py-4 text-sm font-black text-emerald-600">
                                                        {log.status === 'ACTIVE' ? (
                                                            <span className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                                Tracking...
                                                            </span>
                                                        ) : (
                                                            `${log.durationMinutes} mins`
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {log.status === 'ACTIVE' ? (
                                                            <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-widest">Current</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-gray-100 text-gray-400 rounded-full text-[9px] font-black uppercase tracking-widest">Completed</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!trackingReportsData?.villageVisits || trackingReportsData.villageVisits.length === 0) && (
                                                <tr>
                                                    <td colSpan="3" className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest opacity-50">No village visits analyzed yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {historyTab === 'deviation' && (
                            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/30">
                                    <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Shift Time Deviation</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/50">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Expected</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actual</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deviation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {trackingReportsData?.timeDeviation?.map(log => (
                                                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-black text-gray-800">{log.agentName}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.expectedTime}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.actualTime}</td>
                                                    <td className={`px-6 py-4 text-xs font-black ${log.status === 'LATE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {log.deviationMinutes > 0 ? `+${formatMinutesToHours(log.deviationMinutes)} (Late)` : `${formatMinutesToHours(log.deviationMinutes)} (Early/On Time)`}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!trackingReportsData?.timeDeviation || trackingReportsData.timeDeviation.length === 0) && (
                                                <tr>
                                                    <td colSpan="4" className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest opacity-50">No deviation data available</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </ReportLayout>
    );
}
