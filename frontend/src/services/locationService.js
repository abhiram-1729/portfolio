import api from './api';

const PENDING_LOGS_KEY = 'vk_pending_location_logs';

/**
 * Log current location to server
 */
export const logLocation = async (data) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
        console.warn('[Location] No token found, skipping log.');
        return { status: 'unauthorized' };
    }

    if (!navigator.onLine) {
      queueLog(data);
      return { status: 'queued' };
    }
    return await api.post(`/location/log`, data);
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
      await api.post(`/location/log`, log);
      successfulSyncs.push(log);
    } catch (error) {
      console.error('Failed to sync log:', error);
      break; 
    }
  }

  const remaining = pending.filter(p => !successfulSyncs.includes(p));
  localStorage.setItem(PENDING_LOGS_KEY, JSON.stringify(remaining));
};

/**
 * Start periodic location tracking
 */
let trackingInterval = null;
export const startLiveTracking = (intervalMs = 15000) => {
  if (trackingInterval) return;

  const captureLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        logLocation({ lat: latitude, lon: longitude, accuracy });
      },
      (error) => console.error('GPS Error:', error),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Immediate capture on start
  captureLocation();
  
  trackingInterval = setInterval(() => {
    captureLocation();
    syncPendingLogs();
  }, intervalMs);
};

export const stopLiveTracking = () => {
  if (trackingInterval) {
    clearInterval(trackingInterval);
    trackingInterval = null;
  }
};

export const isTrackingActive = () => {
  return trackingInterval !== null;
};

/**
 * Admin: Get latest locations for all active agents
 */
export const getLiveLocations = async (storeId) => {
    const response = await api.get(`/location/live`, {
        params: { storeId }
    });
    return response.data;
};

/**
 * Admin: Get location history for a specific date/user
 */
export const getLocationHistory = async (params) => {
    const response = await api.get(`/location/history`, {
        params
    });
    return response.data;
};
