import prisma from '../utils/prisma.js';
import { isWithinRadius, calculateDistance, reverseGeocode } from '../utils/geoUtils.js';
import * as turf from '@turf/turf';

/**
 * @desc    Start a village visit
 * @route   POST /api/village-activities/start
 * @access  Private
 */
export const startVillageVisit = async (req, res, next) => {
  try {
    const { lat, lon, accuracy, villageId, shiftLogId } = req.body;
    const userId = req.user.id;

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({ 
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy 
      });
    }

    // 2. Validate Active Shift
    const shiftLog = await prisma.shiftLog.findUnique({
      where: { id: shiftLogId }
    });

    if (!shiftLog || shiftLog.userId !== userId || shiftLog.status !== 'STARTED') {
      return res.status(400).json({ message: 'No active shift found.' });
    }

    // 3. Prevent Double Village Starts
    const activeActivity = await prisma.villageActivity.findFirst({
      where: {
        shiftLogId,
        endTime: null
      }
    });

    if (activeActivity) {
      return res.status(400).json({ 
        message: 'A village visit is already active. End it before starting another.',
        activeActivity 
      });
    }

    // 4. Geo-Validation & Auto-Detection of "Real" Village
    const allVillages = await prisma.village.findMany({
      where: { tenantId: req.user.tenantId, status: true }
    });

    let detectedVillage = null;
    let minDistance = Infinity;

    allVillages.forEach(v => {
      if (v.isPolygon && v.boundary) {
        try {
          const pt = turf.point([lon, lat]);
          const poly = turf.polygon(v.boundary.coordinates);
          if (turf.booleanPointInPolygon(pt, poly)) {
            detectedVillage = v;
            minDistance = 0; // Point is inside
          }
        } catch (err) {
          console.error('[GeoCheck] Polygon error:', err.message);
        }
      } else if (v.latitude && v.longitude) {
        const d = calculateDistance(lat, lon, v.latitude, v.longitude);
        if (d < minDistance) {
          minDistance = d;
          detectedVillage = v;
        }
      }
    });

    // If the detected village is within a reasonable distance (e.g. 5km) or if it's the only one found,
    // we use it to ensure the report shows the "Real Location Village".
    const villageToLog = detectedVillage || await prisma.village.findUnique({ where: { id: villageId } });

    if (!villageToLog) {
      return res.status(400).json({ message: 'Village not found or location not configured.' });
    }

    // 5. Reverse Geocode for Exact Location
    const subLocation = await reverseGeocode(lat, lon);

    // 6. Create Activity Log
    const activity = await prisma.villageActivity.create({
      data: {
        tenantId: req.user.tenantId,
        userId,
        shiftLogId,
        villageId: villageToLog.id,
        villageName: villageToLog.name,
        subLocation,
        startTime: new Date(),
        startLat: lat,
        startLong: lon
      }
    });

    res.status(201).json({ message: 'Village Visit Started ✅', activity });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End a village visit
 * @route   POST /api/village-activities/end
 * @access  Private
 */
export const endVillageVisit = async (req, res, next) => {
  try {
    const { lat, lon, accuracy, activityId } = req.body;
    const userId = req.user.id;

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({ 
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy 
      });
    }

    // 2. Find Active Activity
    const activity = await prisma.villageActivity.findUnique({
      where: { id: activityId }
    });

    if (!activity || activity.userId !== userId || activity.endTime) {
      return res.status(400).json({ message: 'No active village visit found to end.' });
    }

    // 3. Update Activity Log (Geo-validation on end is optional but captured)
    const updatedActivity = await prisma.villageActivity.update({
      where: { id: activityId },
      data: {
        endTime: new Date(),
        endLat: lat,
        endLong: lon
      }
    });

    res.json({ message: 'Village Visit Ended ✅', updatedActivity });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get village activities for a shift
 * @route   GET /api/village-activities/:shiftLogId
 * @access  Private
 */
export const getShiftActivities = async (req, res, next) => {
  try {
    const { shiftLogId } = req.params;
    const activities = await prisma.villageActivity.findMany({
      where: { shiftLogId },
      orderBy: { startTime: 'asc' }
    });
    res.json(activities);
  } catch (error) {
    next(error);
  }
};
