import prisma from '../../utils/prisma.js';

export const createVillage = async (req, res, next) => {
    try {
        console.log('[VillageControl] Create Body:', req.body);
        const { name, latitude, longitude, radius, boundary, isPolygon, storeId: bodyStoreId } = req.body;
        const tenantId = req.user.tenantId || "VK001";
        const storeId = (bodyStoreId && bodyStoreId !== 'null' && bodyStoreId !== '') ? bodyStoreId : req.user.storeId;

        if (!name) {
            res.status(400);
            throw new Error('Village name is required');
        }

        // Robust coordinate parsing
        const lat = latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
        const lng = longitude !== null && longitude !== '' ? parseFloat(longitude) : null;

        const village = await prisma.village.create({ 
            data: { 
                name,
                tenantId,
                storeId,
                latitude: !isNaN(lat) ? lat : null,
                longitude: !isNaN(lng) ? lng : null,
                radius: radius ? parseInt(radius) : 500,
                boundary: boundary || null,
                isPolygon: isPolygon === true || isPolygon === 'true'
            } 
        });
        res.status(201).json(village);
    } catch (error) {
        if (error.code === 'P2002') {
            res.status(400);
            return next(new Error('Village already exists'));
        }
        next(error);
    }
};

export const getVillages = async (req, res, next) => {
    try {
        const { storeId: queryStoreId } = req.query;
        const storeId = (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') ? queryStoreId : req.user.storeId;

        const where = { tenantId: req.user.tenantId };
        if (storeId) where.storeId = storeId;

        try {
            const villages = await prisma.village.findMany({ 
                where,
                orderBy: { name: 'asc' } 
            });
            res.json(villages);
        } catch (prismaError) {
            console.error('[VillageControl] Prisma Error:', prismaError.message);
            // Check if it's a "column does not exist" error
            if (prismaError.message.includes('column') && prismaError.message.includes('does not exist')) {
                console.warn('[VillageControl] Schema mismatch detected. Returning basic village data.');
                // Fallback: Try to fetch only basic columns if boundary is missing
                // In Prisma 7, we can't easily exclude, but we can select specifically
                const basicVillages = await prisma.village.findMany({
                    where,
                    select: {
                        id: true,
                        name: true,
                        tenantId: true,
                        storeId: true,
                        latitude: true,
                        longitude: true,
                        radius: true,
                        status: true,
                        createdAt: true,
                        updatedAt: true
                        // Exclude boundary and isPolygon if they might be missing
                    },
                    orderBy: { name: 'asc' }
                });
                return res.json(basicVillages);
            }
            throw prismaError;
        }
    } catch (error) {
        console.error('[VillageControl] GetVillages Error:', error);
        next(error);
    }
};

export const updateVillage = async (req, res, next) => {
    try {
        const { id } = req.params;
        console.log('[VillageControl] Update Body:', req.body, 'ID:', id);
        const { name, latitude, longitude, radius, boundary, isPolygon } = req.body;
        
        // Robust coordinate parsing
        const lat = latitude !== null && latitude !== '' ? parseFloat(latitude) : null;
        const lng = longitude !== null && longitude !== '' ? parseFloat(longitude) : null;

        const village = await prisma.village.update({ 
            where: { id }, 
            data: { 
                name,
                latitude: !isNaN(lat) ? lat : null,
                longitude: !isNaN(lng) ? lng : null,
                radius: radius ? parseInt(radius) : 500,
                boundary: boundary || null,
                isPolygon: isPolygon === true || isPolygon === 'true'
            } 
        });
        res.json(village);
    } catch (error) {
        next(error);
    }
};

export const deleteVillage = async (req, res, next) => {
    try {
        const { id } = req.params;
        await prisma.village.delete({ where: { id } });
        res.json({ message: 'Village deleted' });
    } catch (error) {
        next(error);
    }
};

export const resolveMapsLink = async (req, res, next) => {
    try {
        const { url } = req.body;
        if (!url) {
            res.status(400);
            return next(new Error('URL is required'));
        }

        // Follow redirect to get full URL
        const response = await fetch(url, { 
            method: 'GET', // Some mobile links require GET to resolve fully
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });
        
        const finalUrl = response.url;
        const html = await response.text(); // Some coordinates are in the HTML meta tags
        console.log('[VillageControl] Resolved URL:', finalUrl);
        
        // Extract coordinates from the final URL or HTML
        let lat, lng;
        
        // Pattern 1: @lat,lng in URL
        const atMatch = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch) {
            lat = atMatch[1];
            lng = atMatch[2];
        } else {
            // Pattern 2: meta tags or embedded JSON in HTML
            const metaMatch = html.match(/\[\[\[(-?\d+\.\d+),(-?\d+\.\d+)\]/);
            if (metaMatch) {
                lat = metaMatch[2]; // Lat/Lng are sometimes swapped in Google's internal JSON
                lng = metaMatch[1];
            } else {
                const ogMatch = html.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || html.match(/ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
                if (ogMatch) {
                    lat = ogMatch[1];
                    lng = ogMatch[2];
                }
            }
        }

        if (lat && lng) {
            console.log('[VillageControl] Found Coords:', lat, lng);
            return res.json({ latitude: lat, longitude: lng });
        }

        res.status(400);
        return next(new Error('Could not extract coordinates from this link. Please try right-clicking the map and copying the coordinates directly.'));
    } catch (error) {
        console.error('[VillageControl] Resolution Error:', error);
        next(error);
    }
};
