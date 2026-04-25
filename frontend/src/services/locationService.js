import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';
const PENDING_LOGS_KEY = 'vk_pending_location_logs';

/**
 * Log current location to server
 */
export const logLocation = async (data) => {
  try {
    if (!navigator.onLine) {
      queueLog(data);
      return { status: 'queued' };
    }
    return await axios.post(`${API_URL}/location/log`, data, { withCredentials: true });
  } catch (error) {
    queueLog(data);
    return { status: 'queued' };
  }
};

/**
 * Queue log in localStorage when offline
 */
const queueLog = (data) => {
  const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
  pending.push({ ...data, timestamp: new Date().toISOString() });
  localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(pending));
};

/**
 * Sync pending logs from localStorage
 */
export const syncPendingLogs = async () => {
  const pending = JSON.parse(localStorage.getItem(PENDING_LOGS_KEY) || '[]');
  if (pending.length === 0) return;

  const successfulSyncs = [];
  
  for (const log of pending) {
    try {
      await axios.post(`${API_URL}/location/log`, log, { withCredentials: true });
      successfulSyncs.push(log);
    } catch (error) {
      console.error('Failed to sync log:', error);
      break; // Stop syncing if server is down
    }
  }

  // Remove successful syncs
  const remaining = pending.filter(p => !successfulSyncs.includes(p));
  localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remaining));
};

/**
 * Start periodic location tracking
 */
let trackingInterval = null;
export const startLiveTracking = (intervalMs = 60000) => {
  if (trackingInterval) return;

  trackingInterval = setInterval(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        logLocation({ lat: latitude, lon: longitude, accuracy });
      },
      (error) => console.error('GPS Error:', error),
      { enableHighAccuracy: true }
    );
    
    syncPendingLogs();
  }, intervalMs);
};

export const stopLiveTracking = () => {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
};
