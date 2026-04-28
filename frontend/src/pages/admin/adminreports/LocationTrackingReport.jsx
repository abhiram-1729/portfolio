import React, { useState, useEffect } from 'react';
import { Navigation, MapPin, Loader2, Zap } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindow, Polyline, CircleF } from '@react-google-maps/api';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import { formatMinutesToHours } from './ReportUtils';
import { io } from 'socket.io-client';

export default function LocationTrackingReport() {
  const [reportData, setReportData] = useState([]);
  const [liveLocations, setLiveLocations] = useState([]);
  const [breadcrumbHistory, setBreadcrumbHistory] = useState([]);
  const [trackingReportsData, setTrackingReportsData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [subTab, setSubTab] = useState('live-map'); // 'live-map' | 'history'
  const [historyTab, setHistoryTab] = useState('logs'); // 'logs' | 'visits' | 'deviation'
  const [searchParams] = useSearchParams();
  const [activeAgent, setActiveAgent] = useState(null);
  const [selectedHistoryPoint, setSelectedHistoryPoint] = useState(null);
  const [map, setMap] = useState(null);
  const [isSatellite, setIsSatellite] = useState(false);
  const storeId = searchParams.get('storeId');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const fetchLiveLocations = async () => {
    try {
        const [liveRes, histRes] = await Promise.all([
            adminAPI.getLiveLocations({ storeId }),
            adminAPI.getBreadcrumbHistory({ storeId })
        ]);
        setLiveLocations(liveRes.data || []);
        setBreadcrumbHistory(histRes.data || []);
    } catch (error) {
        console.error('Live fetch failed', error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = { storeId };
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
    const interval = setInterval(fetchLiveLocations, 30000); // Slower polling as fallback

    // Socket.io Real-time setup
    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || window.location.origin.replace('5173', '5000'), {
        auth: { token: localStorage.getItem('token') },
        transports: ['websocket']
    });

    socket.on('locationUpdate', (newLog) => {
        setLiveLocations(prev => {
            const index = prev.findIndex(a => a.userId === newLog.userId);
            const formattedLog = { ...newLog, long: newLog.long || newLog.lon }; // Handle property naming variations
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = formattedLog;
                return updated;
            }
            return [formattedLog, ...prev];
        });
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

  return (
    <ReportLayout title="Location Tracking" icon={Navigation} activeTab="location-tracking" reportData={reportData} isLoading={isLoading}>
      <div className="space-y-6 animate-in fade-in duration-500">
          
          <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                  {['live-map', 'history'].map(tab => (
                      <button
                          key={tab}
                          onClick={() => setSubTab(tab)}
                          className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === tab ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                          {tab === 'live-map' ? 'Live Map' : 'History'}
                      </button>
                  ))}
              </div>

              {subTab === 'history' && (
                <div className="flex gap-2 p-1 bg-rose-50/50 border border-rose-100 rounded-2xl w-fit">
                    {[
                      { id: 'logs', label: 'Geo Logs' },
                      { id: 'visits', label: 'Village Visits' },
                      { id: 'deviation', label: 'Deviations' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setHistoryTab(tab.id)}
                            className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${historyTab === tab.id ? 'bg-rose-600 text-white shadow-md shadow-rose-200' : 'text-rose-400 hover:text-rose-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
              )}
          </div>

          {/* Debug Info Overlay */}
          <div className="flex gap-4 mb-4">
              <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase text-gray-400">
                  Total Tracked: <span className="text-gray-900">{liveLocations.length}</span>
              </div>
              <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase text-gray-400">
                  Breadcrumbs: <span className="text-gray-900">{breadcrumbHistory.length}</span>
              </div>
              <div className="px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[9px] font-black uppercase text-gray-400">
                  Store Context: <span className="text-rose-600">{storeId || 'ALL'}</span>
              </div>
          </div>

          {subTab === 'live-map' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[700px]">
                {/* Agent Sidebar */}
                <div className="lg:col-span-1 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                        <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Active Field Agents</h3>
                        <button onClick={fetchLiveLocations} className="p-2 hover:bg-rose-50 text-rose-500 rounded-full transition-colors">
                            <Zap size={14} className="fill-rose-500" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {liveLocations.length === 0 ? (
                            <div className="text-center py-10 opacity-50">
                                <MapPin className="mx-auto mb-2 text-gray-300" size={32} />
                                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">No active agents</p>
                            </div>
                        ) : (
                            liveLocations.map(agent => (
                                <div 
                                    key={agent.userId}
                                    onClick={() => {
                                        setActiveAgent(agent);
                                        map?.panTo({ lat: agent.lat, lng: agent.long });
                                        map?.setZoom(16);
                                    }}
                                    className={`p-4 rounded-3xl border transition-all cursor-pointer ${activeAgent?.userId === agent.userId ? 'border-rose-200 bg-rose-50/50 shadow-sm' : 'border-gray-50 hover:border-rose-100'}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-600 font-black text-xs border border-rose-100">
                                            {agent.user?.name?.[0]}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-gray-900 truncate">{agent.user?.name}</p>
                                            <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{agent.subLocation || 'In-Transit'}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-[9px] font-black text-emerald-500 uppercase">Live Now</span>
                                        <span className="text-[9px] font-bold text-gray-300 italic">{format(new Date(agent.timestamp), 'hh:mm a')}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div className="p-4 bg-gray-50/50 border-t border-gray-50">
                        <button 
                            onClick={fitBounds}
                            className="w-full py-3 bg-gray-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl shadow-gray-200 active:scale-95"
                        >
                            See All Agents
                        </button>
                    </div>
                </div>

                {/* Map Area */}
                <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative">
                    <div className="absolute top-6 left-6 z-10 flex gap-2">
                        <button onClick={() => setIsSatellite(false)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all ${!isSatellite ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-50'}`}>Standard</button>
                        <button onClick={() => setIsSatellite(true)} className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg transition-all ${isSatellite ? 'bg-gray-900 text-white' : 'bg-white text-gray-900 hover:bg-gray-50'}`}>Satellite</button>
                    </div>

                    <div className="absolute top-6 right-6 z-10">
                        <div className="px-4 py-2 bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-white/20 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[9px] font-black text-gray-900 uppercase tracking-widest">Live Path Syncing</span>
                        </div>
                    </div>

                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={{ height: '100%', width: '100%' }}
                            center={activeAgent ? { lat: activeAgent.lat, lng: activeAgent.long } : { lat: 20.5937, lng: 78.9629 }}
                            zoom={activeAgent ? 16 : 5}
                            onLoad={onMapLoad}
                            options={{
                                mapTypeId: isSatellite ? 'satellite' : 'roadmap',
                                styles: !isSatellite ? [
                                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
                                    { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] }
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
                                            strokeOpacity: 0.3, // Faded line to emphasize points
                                            strokeWeight: 2,
                                            geodesic: true,
                                        }}
                                    />
                                );
                            })}

                            {/* Breadcrumb Interactive Points */}
                            {breadcrumbHistory.map((point, idx) => (
                              <CircleF
                                key={`point-${idx}`}
                                center={{ lat: point.lat, lng: point.long || point.lon }}
                                radius={5} // Meters
                                onClick={() => setSelectedHistoryPoint(point)}
                                options={{
                                  fillColor: '#E11D48',
                                  fillOpacity: 0.6,
                                  strokeColor: '#FFFFFF',
                                  strokeWeight: 1,
                                  clickable: true
                                }}
                              />
                            ))}

                            {/* Live Markers */}
                            {liveLocations.map(agent => (
                                <MarkerF
                                    key={agent.userId}
                                    position={{ lat: agent.lat, lng: agent.long }}
                                    onClick={() => setActiveAgent(agent)}
                                    label={{
                                        text: `${agent.user?.name} • ${agent.subLocation || 'In-Transit'}`,
                                        className: "bg-white/95 px-3 py-1.5 rounded-xl shadow-xl border border-rose-100 text-rose-600 font-black text-[9px] -mt-14 uppercase tracking-tighter whitespace-nowrap"
                                    }}
                                    icon={{
                                        path: window.google.maps.SymbolPath.CIRCLE,
                                        fillColor: '#E11D48',
                                        fillOpacity: 1,
                                        strokeColor: '#FFFFFF',
                                        strokeWeight: 2,
                                        scale: 10,
                                    }}
                                />
                            ))}

                            {activeAgent && (
                                <InfoWindow 
                                    position={{ lat: activeAgent.lat, lng: activeAgent.long }}
                                    onCloseClick={() => setActiveAgent(null)}
                                >
                                    <div className="p-2 min-w-[150px]">
                                        <p className="font-black text-gray-900">{activeAgent.user?.name}</p>
                                        <p className="text-[10px] text-gray-500 uppercase font-bold">{activeAgent.subLocation || 'In-Transit'}</p>
                                        <p className="text-[10px] text-rose-600 font-black mt-2">
                                            Last Ping: {format(new Date(activeAgent.timestamp), 'hh:mm:ss a')}
                                        </p>
                                    </div>
                                </InfoWindow>
                            )}

                            {selectedHistoryPoint && (
                                <InfoWindow 
                                    position={{ lat: selectedHistoryPoint.lat, lng: selectedHistoryPoint.long || selectedHistoryPoint.lon }}
                                    onCloseClick={() => setSelectedHistoryPoint(null)}
                                >
                                    <div className="p-2 min-w-[180px]">
                                        <div className="flex items-center gap-2 mb-2">
                                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                                          <p className="text-[10px] font-black text-gray-900 uppercase">Historical Log</p>
                                        </div>
                                        <p className="text-xs font-bold text-gray-700">{selectedHistoryPoint.user?.name}</p>
                                        <p className="text-[11px] text-gray-900 font-black mt-1 leading-tight">{selectedHistoryPoint.subLocation || 'Location Logged'}</p>
                                        <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-end">
                                          <div>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">Time</p>
                                            <p className="text-[10px] font-black text-rose-600">{format(new Date(selectedHistoryPoint.timestamp || selectedHistoryPoint.createdAt), 'hh:mm:ss a')}</p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[9px] text-gray-400 font-bold uppercase">Acc.</p>
                                            <p className="text-[10px] font-black text-gray-900">{Math.round(selectedHistoryPoint.accuracy)}m</p>
                                          </div>
                                        </div>
                                    </div>
                                </InfoWindow>
                            )}
                        </GoogleMap>
                    ) : (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="animate-spin text-rose-600" />
                        </div>
                    )}
                </div>
              </div>
          )}

          {subTab === 'history' && (
            <div className="space-y-6">
              {historyTab === 'logs' && (
                <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
                    <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <h3 className="text-sm font-black text-gray-900 tracking-tight uppercase">Recent Geo-Logs (Breadcrumbs)</h3>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                          <MapPin size={14} /> Total Points: {reportData.length}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Village</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Location / Landmark</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {[...breadcrumbHistory].sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt)).map((log, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-black text-gray-800">{log.user?.name}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <MapPin size={12} className="text-rose-500" />
                                                <span>{log.villageName || 'In-Transit'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-[11px] font-medium text-gray-500 italic max-w-[200px] truncate">
                                            {log.subLocation || '---'}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                            {format(new Date(log.time || log.createdAt || log.timestamp), 'hh:mm a')}
                                        </td>
                                    </tr>
                                ))}
                                {breadcrumbHistory.length === 0 && (
                                  <tr>
                                    <td colSpan="4" className="px-6 py-20 text-center text-gray-400 font-bold uppercase text-[10px] tracking-widest opacity-50">No geo-logs recorded for this period</td>
                                  </tr>
                                )}
                            </tbody>
                        </table>
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
