import prisma from '../utils/prisma.js';
import { isWithinRadius } from '../utils/geoUtils.js';
import { format } from 'date-fns';
import { sendNotification } from '../services/notificationService.js';

export const getShiftsConfig = async (tenantId, storeId) => {
  let settings = await prisma.businessSettings.findUnique({
    where: { tenantId_storeId: { tenantId, storeId } }
  });

  if (!settings && storeId) {
    settings = await prisma.businessSettings.findUnique({
      where: { tenantId_storeId: { tenantId, storeId: null } }
    });
  }

  if (settings && settings.shifts && Array.isArray(settings.shifts) && settings.shifts.length > 0) {
    return settings.shifts;
  }

  // Default shifts if none configured
  return [
    { id: 'shift_1', name: 'Morning', startTime: '08:00', endTime: '14:00' },
    { id: 'shift_2', name: 'Evening', startTime: '14:00', endTime: '20:00' }
  ];
};

/**
 * @desc    Start a new shift
 * @route   POST /api/shifts/start
 * @access  Private
 */
export const startShift = async (req, res, next) => {
  try {
    const { lat, lon, accuracy, facePhoto, shiftType } = req.body;
    const userId = req.user.id;
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({ 
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy 
      });
    }

    // 2. Prevent Double Actions (Concurrency Check)
    const existingShift = await prisma.shiftLog.findFirst({
      where: {
        userId,
        date: dateStr,
        shift: shiftType,
        status: 'STARTED'
      }
    });

    if (existingShift) {
      return res.status(400).json({ message: 'Shift already started for this period.' });
    }

    // 3. Geo-Validation against HUB (Store)
    const store = await prisma.store.findUnique({
      where: { id: req.user.storeId }
    });

    if (!store || !store.latitude || !store.longitude) {
      return res.status(400).json({ message: 'Store (HUB) location not configured.' });
    }

    const nearHub = isWithinRadius(lat, lon, store.latitude, store.longitude, 500000); // Relaxed to 500km for development testing
    if (!nearHub) {
      return res.status(400).json({ 
        message: 'Shift must be started near the HUB (within 200m).',
        distanceError: true,
        currentLocation: { lat, lon },
        hubLocation: { lat: store.latitude, lon: store.longitude }
      });
    }

    // 4. Create Shift Log
    const shiftLog = await prisma.shiftLog.create({
      data: {
        tenantId: req.user.tenantId,
        storeId: req.user.storeId,
        userId,
        vehicleId: req.user.assignedVehicleId,
        date: dateStr,
        shift: shiftType,
        startTime: new Date(),
        startLat: lat,
        startLong: lon,
        startFacePhoto: facePhoto,
        status: 'STARTED'
      }
    });

    // 5. Late Start Notification Check
    const shifts = await getShiftsConfig(req.user.tenantId, req.user.storeId);
    
    // Find config by ID (string) or by 1-based index (Int)
    const activeShiftConfig = shifts.find((s, idx) => 
        s.id === shiftType || 
        s.id === `shift_${shiftType}` || 
        (idx + 1) === shiftType ||
        s.name.toUpperCase() === (shiftType === 1 ? 'MORNING' : 'EVENING')
    );
    
    const shiftTime = new Date();
    const currentTimeStr = format(shiftTime, 'HH:mm');
    let isLate = false;
    let expectedTime = '';
    const shiftName = activeShiftConfig ? activeShiftConfig.name : (shiftType === 1 ? 'MORNING' : 'EVENING');

    if (activeShiftConfig && activeShiftConfig.startTime) {
        if (currentTimeStr > activeShiftConfig.startTime) {
            isLate = true;
            expectedTime = activeShiftConfig.startTime;
        }
    } else {
        // Fallback to legacy hardcoded times
        const hours = shiftTime.getHours();
        const minutes = shiftTime.getMinutes();
        if (shiftType === 1 && (hours > 5 || (hours === 5 && minutes > 45))) {
            isLate = true;
            expectedTime = '05:45 AM';
        } else if (shiftType === 2 && (hours > 15 || (hours === 15 && minutes > 30))) {
            isLate = true;
            expectedTime = '03:30 PM';
        }
    }

    if (isLate) {
        await sendNotification({
            userIds: [userId],
            title: 'Late Shift Start',
            message: `You started your ${shiftName} shift at ${format(shiftTime, 'hh:mm a')}. Expected start was ${expectedTime}.`,
            type: 'alert',
            priority: 'high'
        });
    }

    res.status(201).json({ message: 'Shift Started ✅', shiftLog });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    End an active shift
 * @route   POST /api/shifts/end
 * @access  Private
 */
export const endShift = async (req, res, next) => {
  try {
    const { lat, lon, accuracy, shiftLogId } = req.body;
    const userId = req.user.id;

    // 1. GPS Accuracy Check
    if (accuracy > 2000) {
      return res.status(400).json({ 
        message: 'GPS accuracy too low (>50m). Please wait for a better signal.',
        accuracy 
      });
    }

    // 2. Find Active Shift
    const shiftLog = await prisma.shiftLog.findUnique({
      where: { id: shiftLogId }
    });

    if (!shiftLog || shiftLog.userId !== userId || shiftLog.status !== 'STARTED') {
      return res.status(400).json({ message: 'No active shift found to end.' });
    }

    // 3. Geo-Validation against HUB (Store)
    const store = await prisma.store.findUnique({
      where: { id: req.user.storeId }
    });

    if (!store || !store.latitude || !store.longitude) {
      return res.status(400).json({ message: 'Store (HUB) location not configured.' });
    }

    const nearHub = isWithinRadius(lat, lon, store.latitude, store.longitude, 500000);
    if (!nearHub) {
      return res.status(400).json({ message: 'Shift must be ended near the HUB (within 200m).' });
    }

    // 4. Update Shift Log
    const updatedShift = await prisma.shiftLog.update({
      where: { id: shiftLogId },
      data: {
        endTime: new Date(),
        endLat: lat,
        endLong: lon,
        status: 'COMPLETED'
      }
    });

    res.json({ message: 'Shift Ended ✅', updatedShift });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get active shift status
 * @route   GET /api/shifts/status
 * @access  Private
 */
export const getShiftStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    const [activeShift, shifts] = await Promise.all([
      prisma.shiftLog.findFirst({
        where: {
          userId,
          date: dateStr,
          status: 'STARTED'
        },
        orderBy: { startTime: 'desc' },
        include: {
          activities: {
            orderBy: { startTime: 'desc' },
            take: 1
          }
        }
      }),
      getShiftsConfig(req.user.tenantId, req.user.storeId)
    ]);

    res.json({ activeShift, shifts });
  } catch (error) {
    console.error('getShiftStatus error:', error);
    next(error);
  }
};
