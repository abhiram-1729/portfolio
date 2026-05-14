import prisma from '../utils/prisma.js';
import { reverseGeocode } from '../utils/geoUtils.js';
import { getIO } from '../services/socketService.js';

/**
 * @desc    Log current location (Breadcrumb)
 * @route   POST /api/location/log
 * @access  Private
 */
export const logLocation = async (req, res, next) => {
  try {
    const { lat, lon, accuracy } = req.body;
    const userId = req.user.id;

    // We still log breadcrumbs even if accuracy is a bit lower (e.g. 100m), 
    // but we store the accuracy for filtering in reports.
    // However, per PRD, we should be strict if it's too bad.
    if (accuracy > 500) {
      return res.status(200).json({ status: 'ignored', message: 'Accuracy too low for breadcrumb' });
    }

    const subLocation = await reverseGeocode(lat, lon);

    const log = await prisma.locationLog.create({
      data: {
        tenantId: req.user.tenantId,
        userId,
        lat,
        long: lon,
        accuracy,
        subLocation,
        timestamp: new Date()
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // Real-time update via Socket.IO
    try {
      const io = getIO();
      io.to(`role:ADMIN`).emit('locationUpdate', {
        ...log,
        long: log.long // Ensure consistency with frontend 'long' property
      });
    } catch (ioError) {
      console.warn('[Socket] Could not emit location update:', ioError.message);
    }

    res.status(201).json({ status: 'success' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get latest locations for all active agents (Admin)
 * @route   GET /api/location/live
 * @access  Admin
 */
export const getLiveLocations = async (req, res, next) => {
  try {
    const { storeId } = req.query;
    const tenantId = req.user.tenantId;

    // 1. Get all agents who have an ACTIVE shift today
    const today = new Date().toISOString().split('T')[0];
    const activeShifts = await prisma.shiftLog.findMany({
      where: {
        tenantId,
        date: today,
        status: 'STARTED',
        user: storeId ? { storeId } : {}
      },
      include: {
        user: {
          select: { id: true, name: true, mobile: true, vgeType: true, storeId: true }
        }
      }
    });

    const activeUserIds = activeShifts.map(s => s.userId);

    // 2. Get the latest location log for each of these active users
    // We don't limit to 15 mins here, so we can show 'Last Known' position
    const latestLogs = await prisma.locationLog.findMany({
      where: {
        tenantId,
        userId: { in: activeUserIds }
      },
      distinct: ['userId'],
      orderBy: { timestamp: 'desc' },
      include: {
        user: {
          select: { id: true, name: true, mobile: true, vgeType: true }
        }
      }
    });

    // 3. Merge: If an agent is on duty but has NO logs, they still need to be in the result
    const mergedResults = activeShifts.map(shift => {
      const log = latestLogs.find(l => l.userId === shift.userId);
      if (log) return { ...log, isOnDuty: true };
      
      // Fallback for agents who just started and haven't pinged yet
      return {
        userId: shift.userId,
        user: shift.user,
        lat: shift.startLat, // Use shift start location as fallback
        long: shift.startLong,
        timestamp: shift.startTime,
        subLocation: 'Just Started (Shift Location)',
        isOnDuty: true,
        isPendingFirstPing: true
      };
    });

    res.json(mergedResults);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get location history for current day (Breadcrumbs)
 * @route   GET /api/location/history
 * @access  Admin
 */
export const getLocationHistory = async (req, res, next) => {
  try {
    const { storeId, date } = req.query;
    const tenantId = req.user.tenantId;

    // Default to today IST
    const start = date ? new Date(date) : new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setHours(23, 59, 59, 999);

    const logs = await prisma.locationLog.findMany({
      where: {
        tenantId,
        timestamp: {
          gte: start,
          lte: end
        },
        user: storeId ? { storeId } : {}
      },
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    res.json(logs);
  } catch (error) {
    next(error);
  }
};
