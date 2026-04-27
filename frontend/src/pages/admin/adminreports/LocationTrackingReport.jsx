import React, { useState, useEffect } from 'react';
import { Navigation, MapPin } from 'lucide-react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindow } from '@react-google-maps/api';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import adminAPI from '../../../services/adminService';
import toast from 'react-hot-toast';
import ReportLayout from './ReportLayout';
import { formatMinutesToHours } from './ReportUtils';
import { Loader2 } from 'lucide-react';

export default function LocationTrackingReport() {
  const [reportData, setReportData] = useState([]);
  const [trackingReportsData, setTrackingReportsData] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [subTab, setSubTab] = useState('live-map');
  const [searchParams] = useSearchParams();
  const [activeAgent, setActiveAgent] = useState(null);
  const storeId = searchParams.get('storeId');

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = { storeId };
      const [locRes, visitRes, devRes] = await Promise.all([
        adminAPI.getLocationCheckIns(),
        adminAPI.getTrackingVillageVisits(params),
        adminAPI.getTrackingTimeDeviation(params)
      ]);
      setReportData(locRes.data);
      setTrackingReportsData({
        villageVisits: visitRes.data,
        timeDeviation: devRes.data
      });
    } catch (error) {
      toast.error('Failed to load location tracking data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [storeId]);

  return (
    <ReportLayout title="Location Tracking" icon={Navigation} activeTab="location-tracking" reportData={reportData} isLoading={isLoading}>
      <div className="space-y-6 animate-in fade-in duration-500">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
              {['live-map', 'history', 'village-visits', 'deviation'].map(tab => (
                <button 
                    key={tab}
                    onClick={() => setSubTab(tab)}
                    className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${subTab === tab ? 'bg-white text-rose-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    {tab.replace('-', ' ')}
                </button>
              ))}
          </div>

          {subTab === 'live-map' && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden h-[600px] relative">
                  {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={{ height: '100%', width: '100%' }}
                        center={{ lat: 20.5937, lng: 78.9629 }}
                        zoom={5}
                        options={{
                            mapTypeControl: true,
                            streetViewControl: false,
                            fullscreenControl: true
                        }}
                    >
                        {Array.isArray(reportData) && reportData.map((log, i) => (
                            log.lat && log.long && (
                                <MarkerF 
                                    key={i} 
                                    position={{ lat: log.lat, lng: log.long }}
                                    onClick={() => setActiveAgent(log)}
                                    icon={{
                                        url: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                                        scaledSize: new window.google.maps.Size(32, 32),
                                        anchor: new window.google.maps.Point(16, 32)
                                    }}
                                >
                                    {activeAgent === log && (
                                        <InfoWindow onCloseClick={() => setActiveAgent(null)}>
                                            <div className="p-2 min-w-[150px]">
                                                <p className="font-black text-gray-900">{log.user?.name}</p>
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">{log.villageName || 'In-Transit'}</p>
                                                {log.subLocation && <p className="text-[9px] text-gray-400 italic mt-0.5 line-clamp-1">{log.subLocation}</p>}
                                                <p className="text-[10px] text-rose-600 font-black mt-2">
                                                    Last updated: {log.createdAt ? format(new Date(log.createdAt), 'hh:mm a') : 'N/A'}
                                                </p>
                                            </div>
                                        </InfoWindow>
                                    )}
                                </MarkerF>
                            )
                        ))}
                    </GoogleMap>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="animate-spin text-emerald-600" />
                    </div>
                  )}
              </div>
          )}

          {subTab === 'history' && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Recent Geo-Logs</h3>
                      <div className="flex gap-2">
                          <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                              {reportData.length} Total Logs
                          </span>
                      </div>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-gray-50/50">
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Timestamp</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {Array.isArray(reportData) && reportData.map((log, i) => (
                                  <tr key={i} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-sm font-black text-gray-800">{log.user?.name}</td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-600 flex items-center gap-2">
                                          <MapPin size={12} className="text-rose-500" />
                                          <div className="flex flex-col">
                                              <span>{log.villageName || 'In-Transit'}</span>
                                              {log.subLocation && <span className="text-[10px] text-gray-400 font-normal italic">{log.subLocation}</span>}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-xs">
                                          <span className={`px-2 py-0.5 rounded ${log.checkInType === 'SHIFT_START' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'}`}>
                                              {log.checkInType || 'BREADCRUMB'}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                          {log.createdAt ? format(new Date(log.createdAt), 'hh:mm a') : 'N/A'}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {subTab === 'village-visits' && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Village Visit Durations</h3>
                  </div>
                  <div className="overflow-x-auto">
                      <table className="w-full text-left">
                          <thead>
                              <tr className="bg-gray-50/50">
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Agent</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Village</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Duration</th>
                                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Time Range</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                              {trackingReportsData?.villageVisits?.map(log => (
                                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-sm font-black text-gray-800">{log.agentName}</td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.villageName}</td>
                                      <td className="px-6 py-4 text-sm font-black text-emerald-600">{log.durationMinutes} mins</td>
                                      <td className="px-6 py-4 text-xs font-bold text-gray-400">
                                          {format(new Date(log.startTime), 'hh:mm a')} - {log.endTime ? format(new Date(log.endTime), 'hh:mm a') : 'Active'}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {subTab === 'deviation' && (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                      <h3 className="text-lg font-black text-gray-900 tracking-tight uppercase">Shift Time Deviation</h3>
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
                                      <td className="px-6 py-4 text-sm font-black text-gray-800">{log.agentName} ({log.shiftType})</td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.expectedTime}</td>
                                      <td className="px-6 py-4 text-sm font-bold text-gray-600">{log.actualTime}</td>
                                      <td className={`px-6 py-4 text-xs font-black ${log.status === 'LATE' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                          {log.deviationMinutes > 0 ? `+${formatMinutesToHours(log.deviationMinutes)} (Late)` : `${formatMinutesToHours(log.deviationMinutes)} (Early/On Time)`}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}
      </div>
    </ReportLayout>
  );
}
