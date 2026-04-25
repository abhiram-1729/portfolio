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

/**
 * Get place name from coordinates using Nominatim (OpenStreetMap)
 * @param {number} lat 
 * @param {number} lon 
 * @returns {Promise<string|null>}
 */
export const reverseGeocode = async (lat, lon) => {
  if (!lat || !lon) return null;
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`, {
      headers: {
        'User-Agent': 'VillagKart-SalesTracker/1.0'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const data = await response.json();
    
    if (data && data.display_name) {
      // Try to get a specific place name or road, otherwise fallback to display_name
      const address = data.address;
      const place = address.amenity || address.shop || address.building || address.road || address.suburb || address.neighbourhood;
      const city = address.city || address.town || address.village || address.county;
      
      if (place && city) {
        return `${place}, ${city}`;
      }
      return data.display_name.split(',').slice(0, 2).join(', '); // Return first two parts for brevity
    }
    return null;
  } catch (error) {
    console.error('[GeoUtils] Reverse geocode error:', error.name === 'AbortError' ? 'Timeout' : error.message);
    return null;
  }
};
