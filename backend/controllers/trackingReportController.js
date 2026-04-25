import prisma from '../utils/prisma.js';
import { format, differenceInMinutes } from 'date-fns';

/**
 * @desc    Get Village Visit Duration Report
 * @route   GET /api/reports/tracking/village-visits
 * @access  Admin
 */
export const getVillageVisitReport = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId, userId } = req.query;
    const tenantId = req.user.tenantId;

    const where = {
      tenantId,
      startTime: {
        gte: startDate ? new Date(startDate) : new Date(new Date().setDate(new Date().getDate() - 7)),
        lte: endDate ? new Date(endDate) : new Date()
      }
    };

    if (storeId) where.shiftLog = { storeId };
    if (userId) where.userId = userId;

    const activities = await prisma.villageActivity.findMany({
      where,
      include: {
        user: { select: { name: true } },
        village: { select: { name: true, radius: true } }
      },
      orderBy: { startTime: 'desc' }
    });

    const report = activities.map(act => {
      const duration = act.endTime ? differenceInMinutes(new Date(act.endTime), new Date(act.startTime)) : 0;
      return {
        id: act.id,
        agentName: act.user.name,
        villageName: act.village?.name || act.villageName,
        subLocation: act.subLocation,
        startTime: act.startTime,
        endTime: act.endTime,
        durationMinutes: duration,
        status: act.endTime ? 'COMPLETED' : 'ACTIVE'
      };
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Geo Compliance Report
 * @route   GET /api/reports/tracking/geo-compliance
 * @access  Admin
 */
export const getGeoComplianceReport = async (req, res, next) => {
  try {
    const { date, storeId } = req.query;
    const tenantId = req.user.tenantId;

    // Check-ins from shiftLogs and villageActivities
    const shiftLogs = await prisma.shiftLog.findMany({
      where: {
        tenantId,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        storeId: storeId || undefined
      },
      include: { user: { select: { name: true } } }
    });

    // We can assume if it's in the DB, it was validated by the controller.
    // But for "deviation" reporting, we might want to log failed attempts (future work).
    // For now, return a summary of successful logs.

    const summary = {
      totalShifts: shiftLogs.length,
      onTimeShifts: shiftLogs.filter(s => s.status === 'COMPLETED').length,
      // More complex logic can be added here
    };

    res.json({ summary, logs: shiftLogs });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Time Deviation Report
 * @route   GET /api/reports/tracking/time-deviation
 * @access  Admin
 */
export const getTimeDeviationReport = async (req, res, next) => {
  try {
    const { date, storeId } = req.query;
    const tenantId = req.user.tenantId;

    const logs = await prisma.shiftLog.findMany({
      where: {
        tenantId,
        date: date || format(new Date(), 'yyyy-MM-dd'),
        storeId: storeId || undefined
      },
      include: { user: { select: { name: true } } }
    });

    const report = logs.map(log => {
      // Shift 1: 5:45 AM, Shift 2: 3:30 PM
      const expectedTime = log.shift === 1 ? '05:45' : '15:30';
      const actualTime = format(new Date(log.startTime), 'HH:mm');
      
      // Basic deviation calculation
      const [exH, exM] = expectedTime.split(':').map(Number);
      const [acH, acM] = actualTime.split(':').map(Number);
      const deviation = (acH * 60 + acM) - (exH * 60 + exM);

      return {
        id: log.id,
        agentName: log.user.name,
        shiftType: log.shift === 1 ? 'Morning' : 'Evening',
        expectedTime,
        actualTime,
        deviationMinutes: deviation,
        status: deviation > 15 ? 'LATE' : 'ON_TIME'
      };
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
};
