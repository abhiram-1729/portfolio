import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Clock, Shield, Search, Plus, Save, 
  Trash2, Edit, ChevronRight, Activity, TrendingUp, 
  AlertCircle, CheckCircle2, CloudRain, Zap, PartyPopper, 
  Ban, Map as MapIcon, Settings2, History, Loader2,
  ArrowRight, Filter, Download, MoreVertical
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip 
} from 'recharts';
import { GoogleMap, useJsApiLoader, CircleF } from '@react-google-maps/api';
import adminAPI from '../../services/adminService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

const Sparkline = ({ data, color }) => (
  <div className="h-12 w-24">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <Area 
          type="monotone" 
          dataKey="value" 
          stroke={color} 
          fill={`${color}20`} 
          strokeWidth={2} 
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
);

const StatCard = ({ title, value, subtitle, icon: Icon, color, sparkData }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white p-5 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 group"
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-3 rounded-2xl ${color.bg} ${color.text} transition-colors group-hover:bg-opacity-80`}>
        <Icon size={24} />
      </div>
      <Sparkline data={sparkData} color={color.hex} />
    </div>
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{title}</p>
      <h3 className="text-2xl font-black text-gray-900 leading-none mb-2">{value}</h3>
      <div className="flex items-center gap-1">
        <TrendingUp size={12} className={color.text} />
        <span className={`text-[10px] font-bold ${color.text}`}>{subtitle}</span>
      </div>
    </div>
  </motion.div>
);

export default function AdminDeliveryLogistics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState([]);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    deliverySlabs: [],
    deliverySlots: [],
    deliveryRadiusEnforced: true,
    deliveryRadius: 20,
    surcharges: {
      rain: { active: false, fee: 10 },
      peak: { active: false, fee: 5 },
      festival: { active: false, fee: 20 },
      emergency: { active: false }
    }
  });

  const [newSlab, setNewSlab] = useState({ minOrderValue: '', maxOrderValue: '', fee: '' });
  const [newSlot, setNewSlot] = useState({ name: '', startTime: '09:00', endTime: '12:00', capacity: 10 });
  const [showAddSlab, setShowAddSlab] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  useEffect(() => {
    fetchSettings();
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await adminAPI.getActivityLogs({ 
        limit: 10,
        action: 'SETTINGS_UPDATED' // Filter for logistics/settings related logs
      });
      if (res.data?.logs) {
        setActivities(res.data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getSettings();
      if (res.data?.success) {
        const data = res.data.data;
        setSettings({
          ...settings,
          deliverySlabs: data.deliverySlabs || [],
          deliverySlots: data.deliverySlots || [],
          deliveryRadiusEnforced: data.deliveryRadiusEnforced ?? true,
          deliveryRadius: data.deliveryRadius || 20,
          surcharges: data.surcharges || settings.surcharges
        });
      }
    } catch (error) {
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(settings);
      toast.success('Settings saved successfully');
      fetchActivities(); // Refresh logs
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const addSlab = () => {
    if (!newSlab.minOrderValue || !newSlab.fee) return toast.error('Fill required fields');
    setSettings({
      ...settings,
      deliverySlabs: [...settings.deliverySlabs, { ...newSlab, id: Date.now().toString() }]
    });
    setNewSlab({ minOrderValue: '', maxOrderValue: '', fee: '' });
    setShowAddSlab(false);
  };

  const removeSlab = (id) => {
    setSettings({
      ...settings,
      deliverySlabs: settings.deliverySlabs.filter(s => s.id !== id)
    });
  };

  const addSlot = () => {
    if (!newSlot.name || !newSlot.startTime || !newSlot.endTime) return toast.error('Fill required fields');
    setSettings({
      ...settings,
      deliverySlots: [...settings.deliverySlots, { ...newSlot, id: Date.now().toString(), active: true }]
    });
    setNewSlot({ name: '', startTime: '09:00', endTime: '12:00', capacity: 10 });
    setShowAddSlot(false);
  };

  const toggleSlot = (id) => {
    setSettings({
      ...settings,
      deliverySlots: settings.deliverySlots.map(s => s.id === id ? { ...s, active: !s.active } : s)
    });
  };

  const removeSlot = (id) => {
    setSettings({
      ...settings,
      deliverySlots: settings.deliverySlots.filter(s => s.id !== id)
    });
  };

  const mockSparkData = [
    { value: 30 }, { value: 45 }, { value: 35 }, { value: 55 }, { value: 40 }, { value: 65 }
  ];

  if (loading) {
    return (
      <div className="h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-600" size={48} />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/admin/settings')}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-emerald-600 hover:border-emerald-100 transition-all shadow-sm group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Delivery Logistics</h1>
            <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest italic">Manage delivery fees, time slots, and serviceability</p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-100 rounded-2xl text-gray-600 font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
            <History size={16} /> View Logs
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
            Save Settings
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        <StatCard 
          title="Active Routes" 
          value="12" 
          subtitle="+2 from last month" 
          icon={Truck} 
          color={{ bg: 'bg-emerald-50', text: 'text-emerald-600', hex: '#10b981' }} 
          sparkData={mockSparkData}
        />
        <StatCard 
          title="Delivery Slots" 
          value="5" 
          subtitle="All active" 
          icon={Clock} 
          color={{ bg: 'bg-blue-50', text: 'text-blue-600', hex: '#3b82f6' }} 
          sparkData={mockSparkData.map(d => ({ value: d.value * 0.8 }))}
        />
        <StatCard 
          title="Avg Delivery Fee" 
          value="₹35" 
          subtitle="Across all slabs" 
          icon={TrendingUp} 
          color={{ bg: 'bg-orange-50', text: 'text-orange-600', hex: '#f59e0b' }} 
          sparkData={mockSparkData.map(d => ({ value: d.value * 1.2 }))}
        />
        <StatCard 
          title="Radius Limit" 
          value={`${settings.deliveryRadius} KM`} 
          subtitle="Max delivery range" 
          icon={MapPin} 
          color={{ bg: 'bg-purple-50', text: 'text-purple-600', hex: '#8b5cf6' }} 
          sparkData={mockSparkData.map(d => ({ value: d.value * 0.9 }))}
        />
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-600 p-5 rounded-[2rem] shadow-lg shadow-emerald-100 flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div className="p-3 bg-white/20 rounded-2xl text-white">
              <Shield size={24} />
            </div>
            <div className="px-2 py-1 bg-white/20 rounded-lg">
              <span className="text-[8px] font-black text-white uppercase tracking-tighter">System Status</span>
            </div>
          </div>
          <div>
            <h4 className="text-xl font-black text-white leading-tight">All Systems Operational</h4>
            <p className="text-[10px] font-bold text-white/70 uppercase tracking-widest mt-2">Active Service Mode</p>
          </div>
        </motion.div>
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Delivery Fee Rules */}
        <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Delivery Fee Rules</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Order value based pricing</p>
            </div>
            <button 
              onClick={() => setShowAddSlab(true)}
              className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">#</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Range (₹)</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Fee</th>
                  <th className="px-8 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence>
                  {settings.deliverySlabs.map((slab, index) => (
                    <motion.tr 
                      key={slab.id || index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="group hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-8 py-5 text-sm font-black text-gray-900">{index + 1}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-700">₹{slab.minOrderValue}</span>
                          <ArrowRight size={12} className="text-gray-300" />
                          <span className="text-sm font-bold text-gray-700">{slab.maxOrderValue ? `₹${slab.maxOrderValue}` : '∞'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${slab.fee === 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {slab.fee === 0 ? 'FREE' : `₹${slab.fee}`}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button 
                          onClick={() => removeSlab(slab.id)}
                          className="p-2 text-gray-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
                {settings.deliverySlabs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="px-8 py-12 text-center">
                      <Truck size={48} className="mx-auto text-gray-100 mb-3" />
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No fee rules defined</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          <div className="p-6 bg-gray-50/50 border-t border-gray-100">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                  <CheckCircle2 size={16} />
                </div>
                <p className="text-[10px] font-bold text-gray-600 leading-tight uppercase tracking-widest">
                  Free Delivery Threshold: Orders above ₹1,000 get free delivery
                </p>
              </div>
              <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline whitespace-nowrap">Edit Settings</button>
            </div>
          </div>
        </div>

        {/* Delivery Time Slots */}
        <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Time Slots</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage delivery windows</p>
            </div>
            <button 
              onClick={() => setShowAddSlot(true)}
              className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all"
            >
              <Plus size={20} strokeWidth={3} />
            </button>
          </div>

          <div className="p-6 flex-1 space-y-4 overflow-y-auto max-h-[450px]">
            {settings.deliverySlots.map((slot) => (
              <div key={slot.id} className="p-4 rounded-2xl bg-gray-50/50 border border-gray-100 hover:border-blue-100 transition-all flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl transition-colors ${slot.active ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Clock size={20} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 tracking-tight">{slot.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{slot.startTime} - {slot.endTime}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-[10px] font-black text-gray-900 leading-none mb-1">{slot.capacity || 10}</p>
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Cap/Slot</p>
                  </div>
                  <button 
                    onClick={() => toggleSlot(slot.id)}
                    className={`w-10 h-5 rounded-full transition-all relative ${slot.active ? 'bg-emerald-500' : 'bg-gray-200'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${slot.active ? 'left-6' : 'left-1'}`} />
                  </button>
                  <button 
                    onClick={() => removeSlot(slot.id)}
                    className="p-2 text-gray-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-6 bg-blue-50/30 border-t border-blue-50">
            <button className="w-full py-3 bg-white border border-blue-100 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all group">
              <Settings2 size={14} />
              Slot Settings
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>

        {/* Geo & Radius Control */}
        <div className="lg:col-span-3 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Geo Control</h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Radius & boundaries</p>
            </div>
            <button className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white transition-all">
              <MapIcon size={20} />
            </button>
          </div>

          <div className="p-6 flex-1 space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Delivery Radius</span>
                <span className="text-lg font-black text-purple-600 tracking-tight">{settings.deliveryRadius} KM</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={settings.deliveryRadius}
                onChange={(e) => setSettings({ ...settings, deliveryRadius: parseInt(e.target.value) })}
                className="w-full accent-purple-600 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="h-48 bg-gray-100 rounded-3xl overflow-hidden relative border border-gray-200">
              {isLoaded ? (
                <GoogleMap
                  mapContainerStyle={{ height: '100%', width: '100%' }}
                  center={{ lat: 17.3850, lng: 78.4867 }}
                  zoom={11}
                  options={{
                    disableDefaultUI: true,
                    styles: [
                      {
                        featureType: "all",
                        elementType: "labels",
                        stylers: [{ visibility: "off" }]
                      }
                    ]
                  }}
                >
                  <CircleF 
                    center={{ lat: 17.3850, lng: 78.4867 }}
                    radius={settings.deliveryRadius * 1000}
                    options={{
                      fillColor: '#8b5cf6',
                      fillOpacity: 0.2,
                      strokeColor: '#8b5cf6',
                      strokeWeight: 2,
                      strokeOpacity: 0.5
                    }}
                  />
                </GoogleMap>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <MapIcon size={32} className="text-gray-300 animate-bounce" />
                </div>
              )}
              <div className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur rounded-lg shadow-sm border border-gray-100">
                <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Live Boundary View</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Villages</p>
                <p className="text-xl font-black text-gray-900 tracking-tight leading-none">28</p>
              </div>
              <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Restricted</p>
                <p className="text-xl font-black text-rose-500 tracking-tight leading-none">3</p>
              </div>
            </div>
          </div>

          <div className="p-6 bg-purple-50/30 border-t border-purple-50">
            <button className="w-full py-3 bg-white border border-purple-100 rounded-xl text-[10px] font-black text-purple-600 uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-purple-600 hover:text-white transition-all group">
              <Settings2 size={14} />
              Manage Restricted Areas
              <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Route & Zone Restrictions */}
        <div className="lg:col-span-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Route & Zone Restrictions</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage restricted areas and special conditions</p>
          </div>

          <div className="p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
            <SurchargeCard 
              title="Rain Surcharge" 
              icon={CloudRain} 
              active={settings.surcharges.rain.active} 
              onToggle={() => setSettings({ ...settings, surcharges: { ...settings.surcharges, rain: { ...settings.surcharges.rain, active: !settings.surcharges.rain.active } } })}
              color="text-blue-600"
              bg="bg-blue-50"
              fee={settings.surcharges.rain.fee}
            />
            <SurchargeCard 
              title="Peak Hour" 
              icon={Zap} 
              active={settings.surcharges.peak.active} 
              onToggle={() => setSettings({ ...settings, surcharges: { ...settings.surcharges, peak: { ...settings.surcharges.peak, active: !settings.surcharges.peak.active } } })}
              color="text-orange-600"
              bg="bg-orange-50"
              fee={settings.surcharges.peak.fee}
            />
            <SurchargeCard 
              title="Festival" 
              icon={PartyPopper} 
              active={settings.surcharges.festival.active} 
              onToggle={() => setSettings({ ...settings, surcharges: { ...settings.surcharges, festival: { ...settings.surcharges.festival, active: !settings.surcharges.festival.active } } })}
              color="text-rose-600"
              bg="bg-rose-50"
              fee={settings.surcharges.festival.fee}
            />
            <SurchargeCard 
              title="Emergency" 
              icon={Ban} 
              active={settings.surcharges.emergency.active} 
              onToggle={() => setSettings({ ...settings, surcharges: { ...settings.surcharges, emergency: { ...settings.surcharges.emergency, active: !settings.surcharges.emergency.active } } })}
              color="text-gray-900"
              bg="bg-gray-100"
              fee={null}
            />
          </div>

          <div className="p-6 bg-gray-50/50 border-t border-gray-100">
            <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-2">
              Advanced Restrictions Settings <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-4 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="p-8 border-b border-gray-50">
            <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Activity</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Latest configuration updates</p>
          </div>

          <div className="p-6 flex-1 space-y-6">
            {activities.length > 0 ? activities.map((log) => (
              <ActivityItem 
                key={log.id}
                icon={log.action === 'SETTINGS_UPDATED' ? Settings2 : CheckCircle2} 
                color={log.action === 'SETTINGS_UPDATED' ? 'text-purple-500' : 'text-emerald-500'} 
                title={log.details} 
                user={log.user?.name || 'Unknown'} 
                time={new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} 
              />
            )) : (
              <div className="text-center py-8">
                <History className="mx-auto text-gray-100 mb-2" size={32} />
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No recent activity</p>
              </div>
            )}
          </div>

          <div className="p-6 bg-gray-50/50 border-t border-gray-100 text-center">
            <button className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-emerald-600 transition-colors">View All Activity</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddSlab && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSlab(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                 <button onClick={() => setShowAddSlab(false)} className="p-3 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all">
                  <Ban size={20} />
                </button>
              </div>

              <div className="p-12">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-emerald-50 text-emerald-600 rounded-3xl">
                    <Truck size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">Establish Pricing Slab</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Define logistics fee based on transactional value</p>
                  </div>
                </div>
                
                <div className="space-y-10">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Threshold Minimum (₹)</label>
                      <div className="relative group">
                        <input 
                          type="number" 
                          placeholder="0" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:bg-white focus:border-emerald-500 font-black text-lg transition-all"
                          value={newSlab.minOrderValue}
                          onChange={e => setNewSlab({ ...newSlab, minOrderValue: e.target.value })}
                        />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">₹</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Ceiling Maximum (₹)</label>
                      <div className="relative group">
                        <input 
                          type="number" 
                          placeholder="No Limit" 
                          className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:bg-white focus:border-emerald-500 font-black text-lg transition-all"
                          value={newSlab.maxOrderValue}
                          onChange={e => setNewSlab({ ...newSlab, maxOrderValue: e.target.value })}
                        />
                        <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-300 group-focus-within:text-emerald-500 transition-colors">₹</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Logistic Delivery Fee (₹)</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        placeholder="e.g. 40" 
                        className="w-full pl-14 pr-6 py-6 bg-slate-900 border-2 border-slate-900 rounded-3xl outline-none focus:border-emerald-500 font-black text-2xl text-white transition-all placeholder:text-slate-700"
                        value={newSlab.fee}
                        onChange={e => setNewSlab({ ...newSlab, fee: e.target.value })}
                      />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-slate-600 group-focus-within:text-emerald-500 transition-colors">₹</div>
                      <div className="absolute right-6 top-1/2 -translate-y-1/2">
                        {newSlab.fee === '0' && (
                          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg">Free Delivery</span>
                        )}
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic">Enter 0 to offer complementary delivery for this range</p>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={addSlab}
                      className="w-full py-6 bg-emerald-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-emerald-200 hover:bg-emerald-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      <Plus size={20} strokeWidth={3} />
                      Authorize Fee Slab
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {showAddSlot && (
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddSlot(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="relative w-full max-w-xl bg-white rounded-[3rem] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                 <button onClick={() => setShowAddSlot(false)} className="p-3 text-gray-300 hover:text-gray-900 hover:bg-gray-50 rounded-2xl transition-all">
                  <Ban size={20} />
                </button>
              </div>

              <div className="p-12">
                <div className="flex items-center gap-4 mb-10">
                  <div className="p-4 bg-blue-50 text-blue-600 rounded-3xl">
                    <Clock size={32} />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-gray-900 tracking-tight">Create Delivery Window</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Configure active slots and operational capacity</p>
                  </div>
                </div>
                
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Window Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Early Morning Dispatch" 
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:bg-white focus:border-blue-500 font-black text-lg transition-all"
                      value={newSlot.name}
                      onChange={e => setNewSlot({ ...newSlot, name: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                      <input 
                        type="time" 
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:bg-white focus:border-blue-500 font-black text-lg transition-all appearance-none"
                        value={newSlot.startTime}
                        onChange={e => setNewSlot({ ...newSlot, startTime: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                      <input 
                        type="time" 
                        className="w-full px-6 py-5 bg-slate-50 border-2 border-slate-50 rounded-3xl outline-none focus:bg-white focus:border-blue-500 font-black text-lg transition-all appearance-none"
                        value={newSlot.endTime}
                        onChange={e => setNewSlot({ ...newSlot, endTime: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Hourly Order Capacity</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        placeholder="50" 
                        className="w-full pl-14 pr-6 py-6 bg-slate-900 border-2 border-slate-900 rounded-3xl outline-none focus:border-blue-500 font-black text-2xl text-white transition-all placeholder:text-slate-700"
                        value={newSlot.capacity}
                        onChange={e => setNewSlot({ ...newSlot, capacity: e.target.value })}
                      />
                      <div className="absolute left-6 top-1/2 -translate-y-1/2">
                        <TrendingUp size={24} className="text-slate-600 group-focus-within:text-blue-500 transition-colors" />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 italic text-right">Max fulfillment capacity per window</p>
                  </div>

                  <div className="pt-4">
                    <button 
                      onClick={addSlot}
                      className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                    >
                      <Plus size={20} strokeWidth={3} />
                      Initialize Delivery Window
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SurchargeCard = ({ title, icon: Icon, active, onToggle, color, bg, fee }) => (
  <div className={`p-5 rounded-3xl border transition-all ${active ? `${bg} border-current ${color} shadow-lg shadow-current/5` : 'bg-white border-gray-100 text-gray-400'}`}>
    <div className="flex justify-between items-start mb-6">
      <div className={`p-3 rounded-2xl ${active ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
        <Icon size={24} />
      </div>
      <button 
        onClick={onToggle}
        className={`w-10 h-5 rounded-full transition-all relative ${active ? 'bg-current' : 'bg-gray-200'}`}
      >
        <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${active ? 'left-6' : 'left-1'}`} />
      </button>
    </div>
    <div>
      <h4 className={`text-sm font-black tracking-tight ${active ? 'text-gray-900' : 'text-gray-400'}`}>{title}</h4>
      <p className="text-[10px] font-bold uppercase tracking-widest mt-1">
        {fee ? `₹${fee} / order` : (active ? 'Enabled' : 'Disabled')}
      </p>
    </div>
  </div>
);

const ActivityItem = ({ icon: Icon, color, title, user, time }) => {
  // Helper to clean up technical IDs from descriptions for better clarity
  const cleanTitle = title.replace(/[a-z0-9]{20,}/g, (match) => match.substring(0, 8) + '...');

  return (
    <div className="flex gap-4">
      <div className={`mt-1 p-2 rounded-lg bg-gray-50 ${color} shrink-0`}>
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <h5 className="text-xs font-black text-gray-900 tracking-tight leading-tight mb-1 whitespace-normal break-words">
          {cleanTitle}
        </h5>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{user}</span>
          <span className="text-[9px] font-bold text-gray-300">•</span>
          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{time}</span>
        </div>
      </div>
    </div>
  );
};
