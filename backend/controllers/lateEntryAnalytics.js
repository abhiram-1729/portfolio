import prisma from '../utils/prisma.js';
import { startOfMonth, endOfMonth, format, subMonths, startOfDay, endOfDay } from 'date-fns';

/**
 * @desc    Get late entry statistics for charts
 * @route   GET /api/late-entries/analytics/stats
 * @access  Private/Admin
 */
export const getLateEntryStats = async (req, res, next) => {
  try {
    const { startDate, endDate, storeId: queryStoreId } = req.query;
    const tenantId = req.user.tenantId;

    const start = startDate ? new Date(startDate) : startOfMonth(new Date());
    const end = endDate ? new Date(endDate) : endOfMonth(new Date());

    const where = {
      tenantId,
      createdAt: { gte: start, lte: end }
    };

    if (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') {
      where.storeId = queryStoreId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    // 1. Daily Trend
    const dailyLates = await prisma.lateEntry.groupBy({
      by: ['date'],
      where,
      _count: { id: true },
      _sum: { penaltyValue: true }
    });

    // 2. Penalty Distribution
    const penaltyDist = await prisma.lateEntry.groupBy({
      by: ['penaltyApplied'],
      where,
      _count: { id: true }
    });

    // 3. Exception Status
    const exceptionStats = await prisma.lateEntryException.groupBy({
      by: ['status'],
      where: {
        ...where,
        // Since lateEntryException also has storeId (assuming schema), we use it.
        // If not, we might need to filter by related lateEntry.
      },
      _count: { id: true }
    });

    res.json({
      success: true,
      data: {
        dailyTrend: dailyLates.map(d => ({
          date: d.date,
          count: d._count.id,
          penalties: d._sum.penaltyValue || 0
        })).sort((a, b) => a.date.localeCompare(b.date)),
        penaltyDistribution: penaltyDist.map(p => ({
          type: p.penaltyApplied,
          count: p._count.id
        })),
        exceptions: exceptionStats.map(e => ({
          status: e.status,
          count: e._count.id
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get top late offenders
 * @route   GET /api/late-entries/analytics/top-offenders
 * @access  Private/Admin
 */
export const getTopOffenders = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { storeId: queryStoreId } = req.query;
    const start = startOfMonth(new Date());

    const where = {
      tenantId,
      createdAt: { gte: start }
    };

    if (queryStoreId && queryStoreId !== 'undefined' && queryStoreId !== 'null') {
      where.storeId = queryStoreId;
    } else if (req.user.storeId && req.user.role !== 'TENANT_OWNER') {
      where.storeId = req.user.storeId;
    }

    const topUsers = await prisma.lateEntry.groupBy({
      by: ['userId'],
      where,
      _count: { id: true },
      _sum: { penaltyValue: true },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    const top10 = topUsers.slice(0, 10);

    // Fetch user details
    const userIds = top10.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, role: true }
    });

    const data = top10.map(u => {
      const user = users.find(usr => usr.id === u.userId);
      return {
        userId: u.userId,
        name: user?.name || 'Unknown',
        role: user?.role || 'N/A',
        lateCount: u._count.id,
        totalPenalties: u._sum.penaltyValue || 0
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
