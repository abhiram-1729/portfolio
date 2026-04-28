import prisma from '../utils/prisma.js';

// @desc    Get active late entry config
// @route   GET /api/late-entry/config
// @access  Private
export const getConfig = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const storeId = req.query.storeId || req.user.storeId || null;

    const config = await prisma.lateEntryConfig.findFirst({
      where: { 
        tenantId,
        OR: [
          { storeId: storeId },
          { storeId: null }
        ],
        isActive: true
      },
      orderBy: { scope: 'desc' } // Simple priority
    });

    res.json({ success: true, data: config });
  } catch (error) {
    next(error);
  }
};

// @desc    Create or update late entry config
// @route   POST /api/late-entry/config
// @access  Private (Admin)
export const updateConfig = async (req, res, next) => {
  try {
    const { scope, scopeValue, graceMins, penaltyType, rules, isActive, storeId: bodyStoreId } = req.body;
    const tenantId = req.user.tenantId;
    const storeId = bodyStoreId || req.user.storeId || null;

    const config = await prisma.lateEntryConfig.create({
      data: {
        tenantId,
        storeId,
        scope: scope || 'COMPANY',
        scopeValue,
        graceMins: parseInt(graceMins) || 10,
        penaltyType: penaltyType || 'COUNT',
        rules: rules || [],
        isActive: isActive !== undefined ? isActive : true
      }
    });

    res.status(201).json({ success: true, data: config, message: 'Config saved successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get employee's own late history
// @route   GET /api/late-entry/my
// @access  Private
export const getMyLateHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { month } = req.query; // YYYY-MM

    const where = { userId };
    if (month) {
      where.date = { startsWith: month };
    }

    const records = await prisma.lateEntry.findMany({
      where,
      include: {
        attendance: true,
        exception: true
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// @desc    Get admin report of all late entries
// @route   GET /api/late-entry/admin/report
// @access  Private (Admin/Supervisor)
export const getAdminReport = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate, userId, storeId: filterStoreId } = req.query;

    const where = { tenantId };
    if (userId) where.userId = userId;
    if (filterStoreId) where.storeId = filterStoreId;
    if (startDate && endDate) {
      where.date = { gte: startDate, lte: endDate };
    }

    const records = await prisma.lateEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true } },
        exception: true
      },
      orderBy: { date: 'desc' }
    });

    res.json({ success: true, data: records });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit waiver/exception request
// @route   POST /api/late-entry/exception
// @access  Private
export const requestException = async (req, res, next) => {
  try {
    const { lateEntryId, reason, description } = req.body;
    const userId = req.user.id;
    const tenantId = req.user.tenantId;

    const exception = await prisma.lateEntryException.create({
      data: {
        tenantId,
        userId,
        lateEntryId,
        reason,
        description,
        status: 'PENDING'
      }
    });

    res.status(201).json({ success: true, data: exception, message: 'Exception request submitted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject exception (Manager/Admin)
// @route   PATCH /api/late-entry/exception/:id
// @access  Private (Manager/Admin)
export const reviewException = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, adminRemark } = req.body; // APPROVED | REJECTED
    const adminId = req.user.id;

    const exception = await prisma.lateEntryException.update({
      where: { id },
      data: {
        status,
        approvedById: adminId,
        approvedAt: new Date()
      },
      include: { lateEntry: true }
    });

    if (status === 'APPROVED') {
      // Waive the penalty
      await prisma.lateEntry.update({
        where: { id: exception.lateEntryId },
        data: {
          isWaived: true,
          waivedById: adminId,
          waivedReason: exception.reason
        }
      });

      // TODO: Revert LeaveBalance deduction if needed (complex logic)
    }

    res.json({ success: true, data: exception, message: `Exception ${status}` });
  } catch (error) {
    next(error);
  }
};

// @desc    Get leave balance
// @route   GET /api/late-entry/leave-balance
// @access  Private
export const getLeaveBalance = async (req, res, next) => {
  try {
    const userId = req.query.userId || req.user.id;
    const month = req.query.month || new Date().toISOString().substring(0, 7);

    const balance = await prisma.leaveBalance.findUnique({
      where: { userId_month: { userId, month } }
    });

    res.json({ success: true, data: balance || { annualLeave: 0, sickLeave: 0, casualLeave: 0, lopDays: 0, halfDays: 0 } });
  } catch (error) {
    next(error);
  }
};
