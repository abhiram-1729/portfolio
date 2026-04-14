import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../store/notificationStore';
import { Bell, Check, Filter, Trash2, Calendar, Shield, Package, Wallet, MapPin, Star, Settings, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

const typeIcons = {
  sales: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  inventory: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
  cash: { icon: Wallet, color: 'text-green-500', bg: 'bg-green-50' },
  route: { icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-100' },
  performance: { icon: Star, color: 'text-orange-500', bg: 'bg-orange-50' },
  system: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-100' },
  default: { icon: Bell, color: 'text-indigo-500', bg: 'bg-indigo-50' }
};


export default function Notifications() {
  const navigate = useNavigate();
  const { notifications, fetchNotifications, markAsRead, markAllAsRead, loading } = useNotificationStore();
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === filter);

  const getIcon = (type) => {
    const config = typeIcons[type] || typeIcons.default;
    const Icon = config.icon || Bell;
    return (
      <div className={`p-3 rounded-xl ${config.bg} ${config.color}`}>
        <Icon size={20} />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 pt-4">

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
          {['all', 'sales', 'inventory', 'cash', 'route', 'system'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                filter === f 
                ? 'bg-indigo-600 text-white shadow-md' 
                : 'bg-white text-gray-600 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className={`relative bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md ${
                    !notification.isRead ? 'ring-1 ring-indigo-50 border-transparent shadow-indigo-100/50' : ''
                  }`}
                  onClick={() => !notification.isRead && markAsRead(notification.id)}
                >
                  {!notification.isRead && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
                  )}
                  
                  <div className="flex gap-3 md:gap-4">
                    <div className="flex-shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5 gap-2">
                        <h3 className={`font-bold text-sm md:text-base text-gray-900 truncate ${!notification.isRead ? 'text-indigo-950' : ''}`}>
                          {notification.title}
                        </h3>
                        <span className="text-[9px] md:text-[10px] text-gray-400 font-bold whitespace-nowrap flex items-center gap-1 uppercase tracking-tighter mt-0.5">
                          {format(new Date(notification.createdAt), 'h:mm a')}
                        </span>
                      </div>
                      <p className="text-gray-600 text-xs md:text-sm leading-relaxed mb-2 line-clamp-3 md:line-clamp-none italic pr-1">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {notification.priority === 'high' && (
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-[8px] md:text-[10px] font-black uppercase tracking-wider">
                            <div className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                            Urgent
                          </div>
                        )}
                        {!notification.isRead && (
                          <span className="text-[8px] md:text-[10px] text-indigo-600 font-black flex items-center gap-1">
                             <div className="w-1 h-1 bg-indigo-600 rounded-full" />
                             NEW
                          </span>
                        )}
                      </div>

                      {/* Refill Items Grid */}
                      {notification.metadata?.refillItems && (
                        <div className="mt-4 border border-indigo-100 rounded-xl overflow-hidden bg-slate-50/50">
                          <div className="grid grid-cols-4 bg-indigo-50/50 p-2 text-[8px] md:text-[9px] font-black text-indigo-950 uppercase tracking-widest border-b border-indigo-100">
                            <span className="col-span-1">Item</span>
                            <span className="text-center">Req</span>
                            <span className="text-center">Appr</span>
                            <span className="text-right">Status</span>
                          </div>
                          <div className="max-h-48 overflow-y-auto no-scrollbar">
                            {notification.metadata.refillItems.map((item, idx) => (
                              <div key={idx} className="grid grid-cols-4 p-2 border-b border-indigo-50 last:border-0 items-center">
                                <span className="text-[10px] font-bold text-gray-700 truncate pr-1">{item.name}</span>
                                <span className="text-[10px] font-black text-slate-400 text-center">{item.requested}</span>
                                <span className="text-[10px] font-black text-emerald-600 text-center">{item.approved}</span>
                                <div className="text-right">
                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${
                                    item.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
                                    item.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' :
                                    'bg-red-100 text-red-700'
                                  }`}>
                                    {item.status}
                                  </span>
                                </div>
                                {item.adminRemark && (
                                  <div className="col-span-4 mt-1 pl-1 border-l-2 border-indigo-200">
                                    <p className="text-[8px] text-indigo-400 italic font-medium">Remark: {item.adminRemark}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="text-gray-300" size={32} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">All caught up!</h3>
                <p className="text-gray-500 text-sm max-w-[200px] mx-auto mt-1">
                  You don't have any notifications {filter !== 'all' ? `in the ${filter} category` : ''}
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {loading && (
          <div className="flex justify-center mt-8">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
