import { create } from 'zustand';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const isProd = import.meta.env.PROD || (typeof window !== 'undefined' && window.location.hostname !== 'localhost');
let SOCKET_URL = import.meta.env.VITE_API_URL || '';

if (isProd) {
    if (!SOCKET_URL || SOCKET_URL.startsWith('http://localhost')) {
        // Fallback: If no explicit URL, assume the relative protocol/host (Vercel)
        SOCKET_URL = typeof window !== 'undefined' ? window.location.origin : '';
    }
} else {
    SOCKET_URL = SOCKET_URL || 'http://localhost:5001';
}

// Ensure socket doesn't include /api suffix
SOCKET_URL = SOCKET_URL.replace(/\/api\/?$/, '');

export const useNotificationStore = create((set, get) => ({
    notifications: [],
    unreadCount: 0,
    socket: null,
    loading: false,

    fetchNotifications: async () => {
        set({ loading: true });
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const res = await fetch(`${SOCKET_URL}/api/notifications`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
              const data = await res.json();
              set({ 
                  notifications: data.notifications || [], 
                  unreadCount: data.unreadCount || 0,
                  loading: false 
              });
            } else {
              set({ loading: false });
            }
        } catch (error) {
            console.error('Fetch Notifications Error:', error);
            set({ loading: false });
        }
    },

    markAsRead: async (id) => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${SOCKET_URL}/api/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
              const newNotifs = get().notifications.map(n => 
                  n.id === id ? { ...n, isRead: true } : n
              );
              const newCount = newNotifs.filter(n => !n.isRead).length;
              set({ notifications: newNotifs, unreadCount: newCount });
            }
        } catch (error) {
            console.error('Mark Read Error:', error);
        }
    },

    markAllAsRead: async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${SOCKET_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
              const newNotifs = get().notifications.map(n => ({ ...n, isRead: true }));
              set({ notifications: newNotifs, unreadCount: 0 });
            }
        } catch (error) {
            console.error('Mark All Read Error:', error);
        }
    },

    initSocket: (token) => {
        if (get().socket) return;
        
        console.log('🔗 Initializing Socket with token:', !!token);
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true
        });

        socket.on('notification', (data) => {
            console.log('🔔 New Notification received:', data);
            set((state) => ({
                notifications: [data, ...state.notifications],
                unreadCount: state.unreadCount + 1
            }));
        });

        socket.on('connect', () => console.log('✅ Socket connected'));
        socket.on('connect_error', (err) => console.error('❌ Socket connection error:', err.message));

        set({ socket });
    },

    disconnectSocket: () => {
        if (get().socket) {
            get().socket.disconnect();
            set({ socket: null });
        }
    }
}));
