import { reverseGeocode } from '../utils/geoUtils.js';

const test = async () => {
    // Coordinates for Hubballi, Karnataka (Approx)
    const lat = 15.3647;
    const lon = 75.1240;
    
    console.log(`Testing reverse geocode for ${lat}, ${lon}...`);
    const result = await reverseGeocode(lat, lon);
    console.log('Result:', result || 'FAILED');
};

test();
