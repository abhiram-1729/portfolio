import { useState, useEffect } from 'react';
import { Plus, Bell, Check, Package, Wallet, MapPin, Settings, AlertTriangle, Info, Search, Filter } from 'lucide-react';
import { useNotificationStore } from '../../store/notificationStore';
import { format } from 'date-fns';
import BroadcastModal from '../../components/admin/BroadcastModal';

const feedIcons = {
  sales: { icon: Info, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  inventory: { icon: Package, color: 'text-blue-600', bg: 'bg-blue-100' },
  cash: { icon: Wallet, color: 'text-green-600', bg: 'bg-green-100' },
  route: { icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-100' },
  system: { icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
  error: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
  default: { icon: Bell, color: 'text-emerald-600', bg: 'bg-emerald-100' }
};

export default function AdminNotifications() {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading } = useNotificationStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const getFeedIcon = (type) => {
    const config = feedIcons[type] || feedIcons.default;
    const Icon = config.icon;
    return <Icon size={20} className={config.color} />;
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !n.isRead;
    return n.type === filter;
  });

  return (
    <div className="space-y-4 md:space-y-6 pb-20">
      {/* Top Action Bar - Optimized for Mobile */}
      <div className="flex items-center justify-between px-1 md:px-0 gap-3">
        <div className="min-w-0">
          <h2 className="text-xl md:text-3xl font-black text-gray-900 tracking-tight truncate leading-tight">System Alerts</h2>
          <p className="text-[10px] md:text-sm text-gray-500 font-medium truncate">Monitor fleet communications</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex-shrink-0 flex items-center justify-center gap-1.5 md:gap-3 bg-emerald-600 hover:bg-emerald-700 text-white px-3 md:px-6 py-2.5 md:py-4 rounded-xl md:rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95 font-black text-[10px] md:text-sm uppercase tracking-tighter md:tracking-normal group"
        >
          <Plus size={16} className="md:size-5 group-hover:rotate-90 transition-transform duration-300" />
          <span className="hidden sm:inline">Create Broadcast</span>
          <span className="sm:hidden">New</span>
        </button>
      </div>

      {/* Filters Hub - Minimal Space Consumption */}
      <div className="flex flex-nowrap gap-1.5 md:gap-2 py-3 border-y border-gray-100 bg-white/70 backdrop-blur-md sticky top-[64px] md:top-[72px] z-20 -mx-4 md:mx-0 px-4 scrollbar-hide overflow-x-auto">
         {[
          { id: 'all', label: 'All' },
          { id: 'unread', label: 'Unread' },
          { id: 'sales', label: 'Sales' },
          { id: 'inventory', label: 'Stock' },
          { id: 'cash', label: 'Cash' },
          { id: 'route', label: 'Routes' }
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 md:px-5 py-1.5 md:py-2 rounded-lg md:rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap whitespace-nowrap shadow-none border ${
              filter === f.id 
                ? 'bg-gray-900 text-white border-gray-900' 
                : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>


      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
        <header className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
             <div className="p-3 bg-red-100 text-red-600 rounded-2xl shadow-inner">
              <Bell size={24} strokeWidth={2.5} />
            </div>
            Critical Feed
          </h2>
          <button 
            onClick={markAllAsRead}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-gray-50 text-gray-600 text-sm font-bold border border-gray-100 hover:bg-gray-100 transition-all active:scale-95 flex items-center gap-2"
          >
            Clear All Alerts
            <Check size={18} />
          </button>
        </header>

        <div className="space-y-4">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => !n.isRead && markAsRead(n.id)}
                className={`group relative p-4 md:p-6 rounded-2xl border transition-all flex gap-3 md:gap-5 cursor-pointer overflow-hidden ${
                  !n.isRead 
                    ? 'border-emerald-100 bg-emerald-50/20 shadow-sm' 
                    : 'border-gray-50 bg-white grayscale opacity-60 hover:grayscale-0 hover:opacity-100'
                }`}
              >
                {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 md:w-1.5 bg-emerald-600 rounded-l-2xl z-20" />}
                
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl flex-shrink-0 transition-transform group-hover:scale-110 h-fit ${!n.isRead ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                  {getFeedIcon(n.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-start justify-between mb-2 gap-2">
                    <div className="flex-1 min-w-0 pr-2">
                      <h4 className={`font-black text-sm md:text-lg leading-tight truncate ${!n.isRead ? 'text-emerald-950' : 'text-gray-600'}`}>{n.title}</h4>
                      <p className="text-gray-500 text-xs md:text-sm mt-1 leading-relaxed line-clamp-2 md:line-clamp-none italic">{n.message}</p>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap bg-gray-50 md:bg-gray-100 px-2 py-1 rounded-md self-start">
                       {format(new Date(n.createdAt), 'h:mm a')}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 mt-1 md:mt-0">
                    <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-tighter ${
                       n.priority === 'high' ? 'bg-red-500 text-white shadow-sm ring-1 ring-red-200' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {n.priority} Priority
                    </span>
                    <span className="px-2 md:px-3 py-0.5 md:py-1 rounded-full bg-gray-100 text-gray-400 text-[8px] md:text-[10px] font-black uppercase tracking-tighter">
                      #{n.type}
                    </span>
                    {!n.isRead && (
                      <span className="text-[8px] md:text-[10px] text-emerald-600 font-black animate-pulse flex items-center gap-1">
                        <span className="w-1 h-1 bg-emerald-600 rounded-full" />
                        NEW
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))

          ) : (
            <div className="py-20 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 flex flex-col items-center">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                <Bell className="text-gray-200" size={32} />
              </div>
              <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Everything is Quiet</p>
              <p className="text-gray-300 text-xs mt-1">No alerts match your filter</p>
            </div>
          )}
        </div>
      </div>

      <BroadcastModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchNotifications}
      />
    </div>
  );
}
