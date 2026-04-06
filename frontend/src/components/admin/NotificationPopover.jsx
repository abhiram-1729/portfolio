import React, { useRef, useEffect } from 'react';
import { useNotificationStore } from '../../store/notificationStore';

import { Bell, Calendar, Check, Package, Wallet, MapPin, Star, Settings, X, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';

const icons = {
  sales: { icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  inventory: { icon: Package, color: 'text-blue-500', bg: 'bg-blue-50' },
  cash: { icon: Wallet, color: 'text-green-500', bg: 'bg-green-50' },
  route: { icon: MapPin, color: 'text-purple-500', bg: 'bg-purple-50' },
  system: { icon: Settings, color: 'text-gray-500', bg: 'bg-gray-50' },
  default: { icon: Bell, color: 'text-emerald-500', bg: 'bg-emerald-50' }
};

export default function NotificationPopover({ isOpen, onClose }) {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const getIcon = (type) => {
    const config = icons[type] || icons.default;
    const Icon = config.icon;
    return (
      <div className={`p-2 rounded-lg ${config.bg} ${config.color}`}>
        <Icon size={16} />
      </div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          className="absolute right-0 top-full mt-2 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50 origin-top-right"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between bg-white sticky top-0 z-10">
            <div>
              <h3 className="font-black text-gray-900 text-lg">Alerts</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                {unreadCount} Unread Notifications
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={markAllAsRead}
                className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-full transition-colors tooltip"
                title="Mark all as read"
              >
                <Check size={18} strokeWidth={2.5} />
              </button>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-50 text-gray-400 rounded-full transition-colors"
              >
                <X size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto no-scrollbar py-2">
            {notifications.length > 0 ? (
              notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markAsRead(n.id)}
                  className={`group relative px-6 py-4 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                    !n.isRead ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  {!n.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
                  )}
                  {getIcon(n.type)}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5">
                      <p className={`text-sm font-bold truncate ${!n.isRead ? 'text-gray-900' : 'text-gray-500'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                        {format(new Date(n.createdAt), 'h:mm a')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-tight line-clamp-2 italic">
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-12 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="text-gray-200" size={32} />
                </div>
                <p className="text-gray-400 text-sm font-medium">No recent alerts</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <Link
            to="/admin/notifications"
            onClick={onClose}
            className="block py-4 border-t border-gray-50 text-center text-xs font-black text-emerald-600 hover:bg-emerald-50 transition-colors bg-gray-50/30 flex items-center justify-center gap-2"
          >
            Explore All Notifications
            <ExternalLink size={12} />
          </Link>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
