import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, Loader2, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { notificationAPI } from '../services/notificationService';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data } = await notificationAPI.getNotifications({ limit: 10 });
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every minute
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'alert': return <AlertTriangle size={16} className="text-rose-500" />;
      case 'success': return <CheckCircle2 size={16} className="text-emerald-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl bg-white border border-slate-100 shadow-sm hover:bg-slate-50 transition-colors"
      >
        {unreadCount > 0 ? (
          <>
            <Bell size={20} className="text-slate-700" />
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          </>
        ) : (
          <BellOff size={20} className="text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 max-h-[400px] bg-white rounded-2xl shadow-xl border border-slate-100 z-50 flex flex-col overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Notifications</h3>
            {unreadCount > 0 && (
              <button 
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase"
              >
                Mark All Read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {loading && notifications.length === 0 ? (
              <div className="p-8 flex justify-center">
                <Loader2 size={24} className="animate-spin text-emerald-500" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map((notif) => (
                  <div 
                    key={notif.id} 
                    className={`p-4 flex gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${!notif.isRead ? 'bg-emerald-50/30' : ''}`}
                    onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                  >
                    <div className="mt-1 shrink-0">
                      {getIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-bold ${!notif.isRead ? 'text-slate-900' : 'text-slate-700'} truncate`}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-2 block">
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0 shadow-sm shadow-emerald-200" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
