import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, 
    Users, 
    MapPin, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    ChevronRight, 
    Calendar,
    ArrowUpRight,
    Search,
    Filter,
    BarChart3,
    PieChart as PieChartIcon,
    RefreshCw,
    X,
    Printer,
    Map as MapIcon,
    Bell,
    Navigation,
    Activity
} from 'lucide-react';
import { 
    GoogleMap, 
    MarkerF, 
    PolylineF, 
    CircleF,
    InfoWindow 
} from '@react-google-maps/api';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    BarChart, 
    Bar, 
    Cell,
    PieChart,
    Pie
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import * as routeService from '../../../services/routeService';
import * as locationService from '../../../services/locationService';
import toast from 'react-hot-toast';

export default function RoutePerformanceDashboard({ storeId, isLoaded }) {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({ 
        summary: { totalRoutes: 0, activeRoutes: 0, avgCompletion: 0, totalSales: 0 }, 
        performance: [] 
    });
    const [selectedAssignment, setSelectedAssignment] = useState(null);
    const [assignmentDetail, setAssignmentDetail] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [searchQuery, setSearchQuery] = useState('');
    const [showClosureModal, setShowClosureModal] = useState(false);
    const [closureData, setClosureData] = useState(null);
    const [closureLoading, setClosureLoading] = useState(false);
    const [liveLocations, setLiveLocations] = useState([]);
    const [breadcrumbPath, setBreadcrumbPath] = useState([]);
    const [selectedVillage, setSelectedVillage] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 20.5937, lng: 78.9629 }); // India center
    const [showOnlyActive, setShowOnlyActive] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        console.log(`[Dashboard] Fetching data for storeId: ${storeId}`);
        try {
            const [perfRes, liveRes] = await Promise.all([
                routeService.getRoutePerformance({ storeId }),
                locationService.getLiveLocations(storeId)
            ]);
            console.log('[Dashboard] Performance Data Received:', perfRes);
            setData(perfRes);
            setLiveLocations(liveRes);
        } catch (error) {
            console.error('[Dashboard] Fetch Error:', error.response?.data || error.message);
            toast.error(`Failed to load performance data: ${error.response?.data?.message || error.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(async () => {
            try {
                const liveRes = await locationService.getLiveLocations(storeId);
                setLiveLocations(liveRes);
            } catch (e) {
                console.error('Live sync failed');
            }
        }, 30000); // Sync every 30s
        return () => clearInterval(interval);
    }, [storeId]);

    const fetchDetail = async (id) => {
        setDetailLoading(true);
        try {
            const [detailRes, historyRes] = await Promise.all([
                routeService.getAssignmentPerformanceDetail(id),
                locationService.getLocationHistory({ userId: data.performance.find(p => p.assignmentId === id)?.userId })
            ]);
            setAssignmentDetail(detailRes);
            setBreadcrumbPath(historyRes.map(l => ({ lat: l.lat, lng: l.long })));
            setSelectedAssignment(id);

            // Center map on latest breadcrumb or first village
            if (historyRes.length > 0) {
                setMapCenter({ lat: historyRes[historyRes.length-1].lat, lng: historyRes[historyRes.length-1].long });
            }
        } catch (error) {
            toast.error('Failed to load details');
        } finally {
            setDetailLoading(false);
        }
    };

    const fetchClosureSummary = async (id) => {
        setClosureLoading(true);
        try {
            const res = await routeService.getRouteClosureSummary(id);
            setClosureData(res.summary);
            setShowClosureModal(true);
        } catch (error) {
            toast.error('Failed to load closure summary');
        } finally {
            setClosureLoading(false);
        }
    };

    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

    const filteredPerformance = data.performance
        .filter(p => {
            const matchesSearch = p.agentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                p.routeName?.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!showOnlyActive) return matchesSearch;
            
            // Check if agent is currently live (updated in last 10 minutes)
            const liveLoc = liveLocations.find(l => l.userId === p.userId);
            if (!liveLoc) return false;
            
            const lastUpdate = new Date(liveLoc.updatedAt);
            const isRecent = (new Date() - lastUpdate) < 10 * 60 * 1000;
            return matchesSearch && isRecent;
        });

    const ProgressRing = ({ percentage, size = 60, strokeWidth = 5 }) => {
        const radius = (size - strokeWidth) / 2;
        const circumference = radius * 2 * Math.PI;
        const offset = circumference - (percentage / 100) * circumference;

        return (
            <div className="relative" style={{ width: size, height: size }}>
                <svg className="transform -rotate-90" width={size} height={size}>
                    <circle
                        className="text-gray-100"
                        strokeWidth={strokeWidth}
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                    <circle
                        className="text-emerald-500 transition-all duration-1000 ease-out"
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r={radius}
                        cx={size / 2}
                        cy={size / 2}
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black text-gray-900">{Math.round(percentage)}%</span>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Command Center...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header & Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group"
                >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Today's Sales</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">₹{data.summary.totalSales?.toLocaleString()}</h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group"
                >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-amber-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="p-8 bg-white/60 backdrop-blur-md rounded-[2.5rem] border border-white/40 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 transition-all group-hover:scale-150" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                                    <Activity size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Coverage Rate</p>
                                    <p className="text-2xl font-black text-emerald-600">
                                        {(() => {
                                            const val = data.summary?.avgCompletion;
                                            return (val === undefined || val === null || isNaN(val)) ? 0 : Math.round(val);
                                        })()}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group"
                >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Agents</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">{data.summary.activeRoutes}</h3>
                        </div>
                    </div>
                </motion.div>

                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 relative overflow-hidden group"
                >
                    <div className="absolute right-0 top-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500" />
                    <div className="relative z-10 flex flex-col gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Missed Villages</p>
                            <h3 className="text-3xl font-black text-gray-900 tracking-tight">
                                {data.performance.reduce((acc, p) => acc + (p.missedVillages?.length || 0), 0)}
                            </h3>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Live Alerts Panel */}
            {data.performance.some(p => p.missedVillages?.length > 0) && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="bg-rose-50 border border-rose-100 rounded-[2rem] p-6 flex items-start gap-4"
                >
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 animate-pulse">
                        <Bell size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-sm font-black text-rose-900 uppercase tracking-widest flex items-center gap-2">
                            Active Coverage Alerts 
                            <span className="px-2 py-0.5 bg-rose-200 text-rose-800 text-[9px] rounded-full">
                                {data.performance.reduce((acc, p) => acc + (p.missedVillages?.length || 0), 0)}
                            </span>
                        </h4>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {data.performance.filter(p => p.missedVillages?.length > 0).map((p, i) => (
                                <motion.div 
                                    key={i} 
                                    whileHover={{ scale: 1.02 }}
                                    onClick={() => fetchDetail(p.assignmentId)}
                                    className="px-5 py-4 bg-white/80 backdrop-blur-sm rounded-[1.5rem] border border-rose-100 shadow-sm flex flex-col gap-2 cursor-pointer hover:bg-white transition-all group"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">{p.agentName}</span>
                                        <ChevronRight size={14} className="text-rose-300 group-hover:text-rose-500 transition-colors" />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs font-black text-rose-600 uppercase tracking-tight">
                                            {p.missedVillages.length} Villages Missed
                                        </span>
                                        <p className="text-[10px] font-medium text-rose-400 line-clamp-1">
                                            {p.missedVillages.join(', ')}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Filters & Tools */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text"
                        placeholder="Search agent or route..."
                        className="w-full bg-white border border-gray-100 pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-bold text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchData}
                        className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-emerald-600 transition-all shadow-sm"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <div className="bg-gray-100 p-1 rounded-xl flex">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
                        >
                            <BarChart3 size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-400'}`}
                        >
                            <Filter size={18} />
                        </button>
                    </div>
                    <button 
                        onClick={() => setShowOnlyActive(!showOnlyActive)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border flex items-center gap-2 ${showOnlyActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200'}`}
                    >
                        <Activity size={14} className={showOnlyActive ? 'animate-pulse' : ''} />
                        {showOnlyActive ? 'Showing Active Only' : 'Show Active Only'}
                    </button>
                </div>
            </div>

            {/* Performance Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main List */}
                <div className="lg:col-span-8 space-y-4">
                    <AnimatePresence mode='popLayout'>
                        {filteredPerformance.map((route, idx) => (
                            <motion.div 
                                key={route.assignmentId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                onClick={() => fetchDetail(route.assignmentId)}
                                className={`group bg-white p-6 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden ${selectedAssignment === route.assignmentId ? 'border-emerald-500 ring-4 ring-emerald-500/5' : 'border-gray-50 hover:border-emerald-200 shadow-sm hover:shadow-xl'}`}
                            >
                                <div className="flex items-center justify-between gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="relative">
                                            <ProgressRing percentage={route.completionRate} size={50} />
                                            {(() => {
                                                const liveLoc = liveLocations.find(l => l.userId === route.userId);
                                                const isLive = liveLoc && (new Date() - new Date(liveLoc.updatedAt)) < 10 * 60 * 1000;
                                                return isLive && (
                                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <h4 className="text-lg font-black text-gray-900 tracking-tight leading-none group-hover:text-emerald-600 transition-colors">{route.agentName}</h4>
                                                {(() => {
                                                    const liveLoc = liveLocations.find(l => l.userId === route.userId);
                                                    const isLive = liveLoc && (new Date() - new Date(liveLoc.updatedAt)) < 10 * 60 * 1000;
                                                    return isLive && (
                                                        <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded uppercase animate-pulse">Live</span>
                                                    );
                                                })()}
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                                {route.routeName} • {route.vehicleNumber}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-10">
                                        <div className="hidden md:flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Today's Sales</span>
                                            <span className="text-sm font-bold text-gray-900">₹{route.totalSales.toLocaleString()}</span>
                                        </div>
                                        <div className="hidden sm:flex flex-col items-end">
                                            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Coverage</span>
                                            <span className="text-sm font-bold text-gray-900">{route.visitedCount}/{route.assignedCount}</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${selectedAssignment === route.assignmentId ? 'bg-emerald-600 text-white' : 'bg-gray-50 text-gray-300 group-hover:bg-emerald-50 group-hover:text-emerald-600'}`}>
                                            <ChevronRight size={18} strokeWidth={3} />
                                        </div>
                                    </div>
                                </div>

                                {route.missedVillages?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
                                        <div className="flex flex-wrap gap-1.5">
                                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-lg border border-gray-200">
                                                Missed: {route.missedVillages?.length > 0 ? route.missedVillages.join(', ') : 'None'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                {/* Details Sidebar / Drill-down */}
                <div className="lg:col-span-4">
                    {/* Map & Detail Container */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="sticky top-6 bg-white rounded-[2.5rem] border border-emerald-100 shadow-2xl overflow-hidden"
                    >
                        <div className={`${selectedAssignment ? 'bg-emerald-600' : 'bg-gray-900'} p-8 text-white relative overflow-hidden transition-colors duration-500`}>
                            <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
                            <div className="relative z-10 flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tight">
                                        {selectedAssignment ? assignmentDetail?.assignment.user?.name : 'Real-time Command'}
                                    </h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mt-1">
                                        {selectedAssignment ? assignmentDetail?.assignment.route?.routeName : `${liveLocations.length} Agents Online`}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 ${selectedAssignment ? 'bg-white/10' : 'bg-emerald-500/20 text-emerald-400'} backdrop-blur-md rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1`}>
                                        <Activity size={12} className="animate-pulse" /> Live Tracking
                                    </span>
                                </div>
                            </div>
                            
                            {selectedAssignment && (
                                <div className="mt-8 grid grid-cols-2 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Completion</p>
                                        <p className="text-xl font-black">{Math.round(assignmentDetail?.summary.completionRate)}%</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl">
                                        <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Revenue</p>
                                        <p className="text-xl font-black">₹{assignmentDetail?.summary.totalSales.toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Live Map Integration */}
                        <div className="h-[350px] w-full relative">
                            {isLoaded ? (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    center={mapCenter}
                                    zoom={selectedAssignment ? 13 : 11}
                                    options={{
                                        disableDefaultUI: true,
                                        styles: [
                                            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                                            { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
                                        ]
                                    }}
                                >
                                    {selectedAssignment ? (
                                        <>
                                            {/* Drill-down View: Villages only (Path hidden as per request) */}
                                            {breadcrumbPath.length > 0 && (
                                                <MarkerF
                                                    position={breadcrumbPath[breadcrumbPath.length - 1]}
                                                    icon={{
                                                        path: google.maps.SymbolPath.CIRCLE,
                                                        fillColor: '#10b981',
                                                        fillOpacity: 1,
                                                        strokeColor: '#fff',
                                                        strokeWeight: 2,
                                                        scale: 8
                                                    }}
                                                />
                                            )}
                                            {assignmentDetail?.breakdown.filter(v => v.latitude && v.longitude).map((v, i) => (
                                                <MarkerF
                                                    key={i}
                                                    position={{ lat: parseFloat(v.latitude), lng: parseFloat(v.longitude) }}
                                                    icon={{
                                                        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                                                        fillColor: v.visited ? '#10b981' : '#ef4444', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 2, scale: 1.2, anchor: { x: 12, y: 24 }
                                                    }}
                                                />
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            {/* Global View: Only Show Strictly Live Agents (Last 15 mins) */}
                                            {liveLocations
                                                .filter(loc => {
                                                    const logTime = new Date(loc.timestamp || loc.updatedAt);
                                                    const isRecent = (new Date() - logTime) < 15 * 60 * 1000;
                                                    return isRecent && loc.lat && loc.long;
                                                })
                                                .map((loc, i) => (
                                                    <MarkerF
                                                        key={loc.userId}
                                                        position={{ lat: loc.lat, lng: loc.long }}
                                                        onClick={() => {
                                                            const p = data.performance.find(x => x.userId === loc.userId);
                                                            if (p) fetchDetail(p.assignmentId);
                                                        }}
                                                        icon={{
                                                            path: google.maps.SymbolPath.CIRCLE,
                                                            fillColor: '#10b981',
                                                            fillOpacity: 1,
                                                            strokeColor: '#fff',
                                                            strokeWeight: 2,
                                                            scale: 7
                                                        }}
                                                        label={{
                                                            text: loc.user?.name || loc.userName || 'Active',
                                                            className: 'bg-white/90 px-2 py-0.5 rounded text-[8px] font-black shadow-sm mb-10 border border-gray-100 uppercase text-emerald-600'
                                                        }}
                                                    />
                                                ))}
                                        </>
                                    )}
                                </GoogleMap>
                            ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                    <RefreshCw className="animate-spin text-gray-300" size={32} />
                                </div>
                            )}
                        </div>

                        {selectedAssignment && assignmentDetail && (
                            <div className="p-8 space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Village Breakdown</h4>
                                    <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded uppercase tracking-widest">
                                        {assignmentDetail.breakdown.filter(b => b.visited).length} Visited
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    {assignmentDetail.breakdown.map((village, idx) => (
                                        <div key={idx} className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/50 border border-gray-50 group hover:bg-white hover:border-emerald-100 hover:shadow-lg transition-all duration-300">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${village.visited ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                {village.visited ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h5 className="text-sm font-black text-gray-900 truncate">{village.villageName}</h5>
                                                    <span className="text-[9px] font-black text-gray-400 uppercase">{village.session}</span>
                                                </div>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[10px] font-bold text-emerald-600">₹{village.sales.toLocaleString()}</span>
                                                    <span className="text-[10px] text-gray-300">•</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{village.orderCount} Orders</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-4">
                                    <button 
                                        onClick={() => fetchClosureSummary(selectedAssignment)}
                                        disabled={closureLoading}
                                        className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm tracking-tight shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                    >
                                        {closureLoading ? <RefreshCw className="animate-spin" size={18} /> : <>Generate Daily Summary <ArrowUpRight size={18} /></>}
                                    </button>
                                    <button 
                                        onClick={() => setSelectedAssignment(null)}
                                        className="w-full mt-2 text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                    >
                                        Back to Global View
                                    </button>
                                </div>
                            </div>
                        )}
                        
                        {!selectedAssignment && (
                            <div className="p-8 bg-gray-50/50">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] text-center mb-4">Command Center Tips</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-white rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-bold text-gray-900 mb-1">Live Status</p>
                                        <p className="text-[8px] text-gray-400 leading-relaxed">Agents with active GPS are marked with a vehicle icon on the map.</p>
                                    </div>
                                    <div className="p-3 bg-white rounded-2xl border border-gray-100">
                                        <p className="text-[9px] font-bold text-gray-900 mb-1">Click to Drill</p>
                                        <p className="text-[8px] text-gray-400 leading-relaxed">Click any agent marker or list card to see their specific path and sales.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </div>
            </div>

            {/* Route Closure Modal */}
            <AnimatePresence>
                {showClosureModal && closureData && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowClosureModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />
                        <motion.div 
                            initial={{ opacity: 0, y: 50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.9 }}
                            className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            <div className="bg-emerald-600 p-10 text-white flex justify-between items-start">
                                <div>
                                    <h3 className="text-3xl font-black tracking-tight">Route Closure Summary</h3>
                                    <p className="text-sm font-bold opacity-70 mt-1 uppercase tracking-widest">{closureData.routeName} • {closureData.date}</p>
                                </div>
                                <button 
                                    onClick={() => setShowClosureModal(false)}
                                    className="p-2 bg-white/10 rounded-xl hover:bg-white/20 transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-10 space-y-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="p-4 bg-emerald-50 rounded-3xl">
                                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Total Sales</p>
                                        <p className="text-xl font-black text-emerald-700">₹{closureData.metrics.totalSales.toLocaleString()}</p>
                                    </div>
                                    <div className="p-4 bg-blue-50 rounded-3xl">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Orders</p>
                                        <p className="text-xl font-black text-blue-700">{closureData.metrics.totalOrders}</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 rounded-3xl">
                                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Villages</p>
                                        <p className="text-xl font-black text-amber-700">{closureData.metrics.villagesVisited}/{closureData.metrics.villagesAssigned}</p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 rounded-3xl">
                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Cash/UPI</p>
                                        <p className="text-sm font-black text-indigo-700">₹{closureData.metrics.cashCollected}/₹{closureData.metrics.upiCollected}</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Missed Coverage Details</h4>
                                    {closureData.missedVillages.length > 0 ? (
                                        <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100">
                                            <div className="flex flex-wrap gap-2">
                                                {closureData.missedVillages.map((v, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-white text-rose-600 text-[10px] font-black rounded-xl border border-rose-200 uppercase tracking-widest">
                                                        {v}
                                                    </span>
                                                ))}
                                            </div>
                                            <p className="text-xs text-rose-600/70 font-medium mt-4 italic">Note: These villages were assigned but no visit was recorded.</p>
                                            {closureData.closureRemarks && (
                                                <div className="mt-4 p-4 bg-white border border-rose-100 rounded-2xl">
                                                    <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Agent's Justification</p>
                                                    <p className="text-xs font-bold text-gray-700 italic">"{closureData.closureRemarks}"</p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex items-center gap-3">
                                            <CheckCircle2 className="text-emerald-500" />
                                            <p className="text-xs font-black text-emerald-700 uppercase tracking-widest">Perfect Coverage! No villages missed today.</p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-black text-sm tracking-tight hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                                        onClick={() => window.print()}
                                    >
                                        Print Report <Printer size={18} />
                                    </button>
                                    <button 
                                        onClick={() => setShowClosureModal(false)}
                                        className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-sm tracking-tight shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all"
                                    >
                                        Close & Sign Off
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
