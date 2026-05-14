import prisma from '../utils/prisma.js';
import { uploadToSupabase } from '../utils/supabaseService.js';
import lateEntryEngine from '../services/lateEntryEngine.js';

// Helpdshfgjkdfhkgjber: get today's date string in YYYY-MM-DD format (IST)
const getTodayIST = () => {
  const now = new Date();
  // Offset for IST (+5:30)
  const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
  return ist.toISOString().split('T')[0];
};

// @desc    Agent punches in for the day (with photo proof)
// @route   POST /api/attendance/punch-in
// @access  Private
export const punchIn = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const storeId = req.user.storeId || null;
    const { lat, lng, locationAddress } = req.body;
    const date = getTodayIST();

    // Check if already punched in today
    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You have already punched in for today.',
        attendance: existing
      });
    }

    // Upload photo to Supabase if provided
    let punchInPhoto = null;
    if (req.file) {
      punchInPhoto = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname || `punchin-${userId}-${date}.jpg`,
        req.file.mimetype,
        'attendance',
        `punch-in/${date}`
      );
    }

    const attendance = await prisma.attendance.create({
      data: {
        userId,
        tenantId,
        storeId,
        date,
        punchInTime: new Date(),
        punchInLat: lat ? parseFloat(lat) : null,
        punchInLng: lng ? parseFloat(lng) : null,
        punchInLocation: locationAddress || null,
        punchInPhoto,
        status: 'ACTIVE',
      }
    });

    // Run Late Detection Engine
    try {
      await lateEntryEngine.detectAndRecord(userId, new Date(), date);
    } catch (leError) {
      console.error('Late Detection Engine Error:', leError);
    }

    res.status(201).json({
      success: true,
      message: 'Punched in successfully!',
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Agent punches out
// @route   POST /api/attendance/punch-out
// @access  Private
export const punchOut = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { lat, lng, locationAddress } = req.body;
    const date = getTodayIST();

    const existing = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } }
    });

    if (!existing) {
      return res.status(400).json({
        success: false,
        message: 'No active attendance found for today. Please punch in first.'
      });
    }

    if (existing.status === 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'You have already punched out for today.',
        attendance: existing
      });
    }

    // Upload punch-out photo if provided
    let punchOutPhoto = null;
    if (req.file) {
      punchOutPhoto = await uploadToSupabase(
        req.file.buffer,
        req.file.originalname || `punchout-${userId}-${date}.jpg`,
        req.file.mimetype,
        'attendance',
        `punch-out/${date}`
      );
    }

    // Calculate total hours
    const punchInTime = new Date(existing.punchInTime);
    const punchOutTime = new Date();
    const diffMs = punchOutTime - punchInTime;
    const totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));

    const attendance = await prisma.attendance.update({
      where: { userId_date: { userId, date } },
      data: {
        punchOutTime,
        punchOutLat: lat ? parseFloat(lat) : null,
        punchOutLng: lng ? parseFloat(lng) : null,
        punchOutLocation: locationAddress || null,
        punchOutPhoto,
        totalHours,
        status: 'COMPLETED',
      }
    });

    res.json({
      success: true,
      message: 'Punched out successfully!',
      attendance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's attendance for logged-in user
// @route   GET /api/attendance/today
// @access  Private
export const getToday = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const date = getTodayIST();

    const attendance = await prisma.attendance.findUnique({
      where: { userId_date: { userId, date } }
    });

    res.json({
      success: true,
      punchedIn: !!attendance,
      attendance: attendance || null
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get agent's own attendance history
// @route   GET /api/attendance/my-history
// @access  Private
export const getMyHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month, year } = req.query;

    // Default to current month/year IST
    const now = new Date();
    const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000));
    const targetMonth = parseInt(month) || (ist.getMonth() + 1);
    const targetYear = parseInt(year) || ist.getFullYear();

    // Build date range: YYYY-MM-01 to YYYY-MM-31
    const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
    const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-31`;

    const records = await prisma.attendance.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate }
      },
      include: {
        lateEntry: {
          include: { exception: true }
        }
      },
      orderBy: { date: 'desc' }
    });

    // Calculate summary
    const totalDays = records.length;
    const completedDays = records.filter(r => r.status === 'COMPLETED').length;
    const totalHoursWorked = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);
    const avgHours = completedDays > 0 ? parseFloat((totalHoursWorked / completedDays).toFixed(2)) : 0;

    res.json({
      success: true,
      month: targetMonth,
      year: targetYear,
      summary: {
        totalDays,
        completedDays,
        totalHoursWorked: parseFloat(totalHoursWorked.toFixed(2)),
        avgHours
      },
      records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: get all agents' attendance
// @route   GET /api/attendance/all
// @access  Private (Admin)
export const getAllAttendance = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { date, userId: filterUserId, startDate, endDate, storeId: queryStoreId } = req.query;

    const today = getTodayIST();
    const targetDate = date || today;

    // Build where clause
    const where = { tenantId };

    // Store filter logic
    if (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') {
      where.storeId = queryStoreId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    if (filterUserId) where.userId = filterUserId;

    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    } else {
      where.date = targetDate;
    }

    const records = await prisma.attendance.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            mobile: true,
            role: true,
            assignedVehicleId: true,
            assignedVehicle: { select: { vehicleNumber: true, vehicleName: true } }
          }
        }
      },
      orderBy: { punchInTime: 'asc' }
    });

    // Get total agent count for context
    const agentWhere = {
      tenantId,
      role: 'SALES_AGENT',
      status: 'ACTIVE'
    };
    if (where.storeId) agentWhere.storeId = where.storeId;

    const totalAgents = await prisma.user.count({ where: agentWhere });
    const presentToday = records.length;
    const completedToday = records.filter(r => r.status === 'COMPLETED').length;
    const activeNow = records.filter(r => r.status === 'ACTIVE').length;
    const avgHours = completedToday > 0
      ? parseFloat((records.filter(r => r.status === 'COMPLETED').reduce((sum, r) => sum + (r.totalHours || 0), 0) / completedToday).toFixed(2))
      : 0;

    res.json({
      success: true,
      date: targetDate,
      summary: {
        totalAgents,
        presentToday,
        absentToday: totalAgents - presentToday,
        activeNow,
        completedToday,
        avgHours
      },
      records
    });
  } catch (error) {
    next(error);
  }
};
