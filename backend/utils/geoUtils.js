import * as turf from '@turf/turf';

/**
 * Calculate distance between two points in meters
 * @param {number} lat1 
 * @param {number} lon1 
 * @param {number} lat2 
 * @param {number} lon2 
 * @returns {number} Distance in meters
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const from = turf.point([lon1, lat1]);
  const to = turf.point([lon2, lat2]);
  const distance = turf.distance(from, to, { units: 'meters' });
  return distance;
};

/**
 * Check if a point is within a certain radius of another point
 * @param {number} pointLat 
 * @param {number} pointLon 
 * @param {number} centerLat 
 * @param {number} centerLon 
 * @param {number} radiusInMeters 
 * @returns {boolean}
 */
export const isWithinRadius = (pointLat, pointLon, centerLat, centerLon, radiusInMeters) => {
  const distance = calculateDistance(pointLat, pointLon, centerLat, centerLon);
  return distance <= radiusInMeters;
};

const geoCache = new Map(); // Simple in-memory cache: "lat,lon" -> { address, expiry }
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache

/**
 * Get place name from coordinates using Nominatim (OpenStreetMap)
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<string|null>}
 */
export const reverseGeocode = async (lat, lon) => {
  if (!lat || !lon) return null;
  
  // 1. Check Cache (Precision: 4 decimal places ~11m)
  const cacheKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = geoCache.get(cacheKey);
  if (cached && (Date.now() < cached.expiry)) {
    return cached.address;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // Increased to 10s

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'VillagKart-SalesTracker/1.1 (shivm@villagkart.com)',
        'Accept-Language': 'en'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      const address = data.address || {};
      
      // Build a concise address
      const parts = [];
      const place = address.amenity || address.shop || address.building || address.office || address.tourism || address.leisure;
      const road = address.road || address.pedestrian || address.highway;
      const area = address.suburb || address.neighbourhood || address.residential || address.village;
      const city = address.city || address.town || address.village || address.district;

      if (place) parts.push(place);
      if (road) parts.push(road);
      if (area && !parts.includes(area)) parts.push(area);
      if (city && !parts.includes(city)) parts.push(city);

      let result = parts.length > 0 ? parts.join(', ') : data.display_name.split(',').slice(0, 3).join(', ');
      
      // Clean up duplicates if any
      result = [...new Set(result.split(', '))].join(', ');

      // Update Cache
      geoCache.set(cacheKey, { address: result, expiry: Date.now() + CACHE_TTL });
      
      return result;
    }
    return null;
  } catch (error) {
    const errorMsg = error.name === 'AbortError' ? 'Timeout (10s)' : error.message;
    console.error(`[GeoUtils] Reverse geocode failed for ${lat},${lon}:`, errorMsg);
    
    // Return most recent cache entry for this area even if expired, as a fallback
    if (cached) return cached.address;
    
    return null;
  }
};
