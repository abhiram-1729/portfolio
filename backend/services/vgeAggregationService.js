/**
 * VGE Aggregation Service
 * 
 * Handles:
 * - Daily performance aggregation from orders
 * - Idempotent upsert (safe for retries/duplicate events)
 * - Real-time Socket.IO emission after updates
 * - End-of-day locking
 * - Monthly summary generation
 */

import prisma from '../utils/prisma.js';
import { calculateIncentive, getNextLevelInfo, getNextSlabInfo } from './incentiveEngine.js';
import { getIO } from './socketService.js';

/**
 * Load incentive config from DB (with fallback to defaults)
 */
async function getConfig() {
  try {
    let config = await prisma.vgeIncentiveConfig.findUnique({ where: { id: 'singleton' } });
    if (!config) {
      config = await prisma.vgeIncentiveConfig.create({ data: { id: 'singleton' } });
    }
    return config;
  } catch (err) {
    console.warn('[VGE] Failed to load config, using defaults:', err.message);
    return null; // Engine will use DEFAULT_CONFIG
  }
}

/**
 * Format a Date to YYYY-MM-DD string in IST
 */
export function toISTDateString(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // en-CA gives YYYY-MM-DD
}

/**
 * Format a Date to YYYY-MM string in IST
 */
export function toISTMonthString(date = new Date()) {
  const ist = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  return `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * CORE: Update daily performance for a specific user + date
 * 
 * This is the main aggregation function. It:
 * 1. Fetches all COMPLETED orders for the user on that date
 * 2. Sums total sales
 * 3. Runs the incentive engine
 * 4. Upserts the result into VgeDailyPerformance
 * 5. Emits real-time update via Socket.IO
 * 
 * Idempotent — safe to call multiple times for the same user+date.
 */
export async function updateDailyPerformance(userId, date = null) {
  const dateStr = date || toISTDateString();

  try {
    // Get user and their current active route assignment to track route contribution
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        routeAssignments: { 
          where: { status: true },
          take: 1
        } 
      }
    });

    const routeId = user?.routeAssignments?.[0]?.routeId || null;

    // Check if day is locked (finalized)
    const existing = await prisma.vgeDailyPerformance.findUnique({
      where: { userId_date: { userId, date: dateStr } }
    });

    if (existing?.isLocked) {
      console.log(`[VGE] Day ${dateStr} is locked for user ${userId}. Skipping recalculation.`);
      return existing;
    }

    // 1. Aggregate completed orders for this user + date
    const dayStart = new Date(`${dateStr}T00:00:00+05:30`);
    const dayEnd = new Date(`${dateStr}T23:59:59.999+05:30`);

    const ordersAgg = await prisma.order.aggregate({
      where: {
        agentId: userId,
        status: 'COMPLETED',
        createdAt: { gte: dayStart, lte: dayEnd }
      },
      _sum: { totalAmount: true },
      _count: { id: true }
    });

    const totalSales = ordersAgg._sum.totalAmount || 0;
    const completedOrders = ordersAgg._count.id || 0;

    // 2. Count unique customer registrations (unique mobile numbers from orders)
    const uniqueCustomers = await prisma.order.findMany({
      where: {
        agentId: userId,
        status: 'COMPLETED',
        createdAt: { gte: dayStart, lte: dayEnd },
        mobile: { not: null }
      },
      distinct: ['mobile'],
      select: { mobile: true }
    });
    const totalRegistrations = uniqueCustomers.length;

    // 3. Calculate incentives
    const config = await getConfig();
    const result = calculateIncentive(totalSales, totalRegistrations, config);

    // 4. Upsert into VgeDailyPerformance
    const performance = await prisma.vgeDailyPerformance.upsert({
      where: { userId_date: { userId, date: dateStr } },
      update: {
        totalSales,
        totalRegistrations,
        completedOrders,
        eligibleSales: result.eligibleSales,
        slabsCount: result.slabsCount,
        level: result.level,
        salesIncentive: result.salesIncentive,
        regIncentive: result.regIncentive,
        totalIncentive: result.totalIncentive,
        routeId
      },
      create: {
        userId,
        date: dateStr,
        routeId,
        totalSales,
        totalRegistrations,
        completedOrders,
        eligibleSales: result.eligibleSales,
        slabsCount: result.slabsCount,
        level: result.level,
        salesIncentive: result.salesIncentive,
        regIncentive: result.regIncentive,
        totalIncentive: result.totalIncentive
      }
    });

    // 5. Emit real-time update
    emitPerformanceUpdate(userId, performance, totalSales, config);

    return performance;
  } catch (error) {
    console.error(`[VGE] Error updating daily performance for ${userId} on ${dateStr}:`, error.message);
    throw error;
  }
}

/**
 * Emit real-time Socket.IO event with performance data
 */
function emitPerformanceUpdate(userId, performance, totalSales, config) {
  try {
    const io = getIO();
    const nextLevel = getNextLevelInfo(totalSales, config);
    const nextSlab = getNextSlabInfo(totalSales, config);

    io.to(`user:${userId}`).emit('performance_update', {
      ...performance,
      nextLevel,
      nextSlab,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    // Socket failure shouldn't break the aggregation pipeline
    console.warn('[VGE] Socket emission failed:', err.message);
  }
}

/**
 * Lock a day's performance (end-of-day finalization)
 */
export async function lockDay(userId, dateStr) {
  try {
    const performance = await prisma.vgeDailyPerformance.update({
      where: { userId_date: { userId, date: dateStr } },
      data: { isLocked: true }
    });
    return performance;
  } catch (error) {
    console.error(`[VGE] Error locking day ${dateStr} for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * End-of-day process: Lock all unlocked records for a date + send notifications
 */
export async function endOfDayProcess(dateStr = null) {
  const date = dateStr || toISTDateString();
  console.log(`[VGE] Running end-of-day process for ${date}`);

  try {
    // Find all unlocked records for this date
    const unlocked = await prisma.vgeDailyPerformance.findMany({
      where: { date, isLocked: false },
      include: { user: { select: { id: true, name: true } } }
    });

    for (const record of unlocked) {
      // Lock the record
      await lockDay(record.userId, date);

      // Send end-of-day notification
      try {
        const { sendNotification } = await import('./notificationService.js');
        await sendNotification({
          userIds: [record.userId],
          title: '🎯 Daily Summary',
          message: record.totalIncentive > 0
            ? `Great work today! You earned ₹${record.totalIncentive} in incentives with ₹${record.totalSales.toLocaleString('en-IN')} sales.`
            : `Today's sales: ₹${record.totalSales.toLocaleString('en-IN')}. Keep pushing to unlock incentives!`,
          type: 'incentive',
          priority: 'medium',
          metadata: {
            date,
            totalSales: record.totalSales,
            totalIncentive: record.totalIncentive,
            level: record.level
          }
        });
      } catch (e) {
        console.warn(`[VGE] Notification failed for ${record.userId}:`, e.message);
      }
    }

    console.log(`[VGE] End-of-day: Locked ${unlocked.length} records for ${date}`);
    return unlocked.length;
  } catch (error) {
    console.error(`[VGE] End-of-day error:`, error.message);
    return 0;
  }
}

/**
 * Generate monthly summary for all agents
 */
export async function generateMonthlySummary(monthStr = null) {
  const month = monthStr || toISTMonthString();
  console.log(`[VGE] Generating monthly summary for ${month}`);

  try {
    // Fetch all daily records for this month
    const dailyRecords = await prisma.vgeDailyPerformance.findMany({
      where: { date: { startsWith: month } }
    });

    // Group by userId
    const groups = {};
    for (const record of dailyRecords) {
      if (!groups[record.userId]) {
        groups[record.userId] = [];
      }
      groups[record.userId].push(record);
    }

    const levelOrder = ['NONE', 'STARTER', 'PERFORMER', 'ACHIEVER', 'CHAMPION', 'STAR', 'SUPER_STAR'];
    let count = 0;

    for (const [userId, records] of Object.entries(groups)) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      const baseSalary = user?.baseSalary || 12000;
      
      const totalSales = records.reduce((sum, r) => sum + r.totalSales, 0);
      const totalRegistrations = records.reduce((sum, r) => sum + r.totalRegistrations, 0);
      const totalIncentive = records.reduce((sum, r) => sum + r.totalIncentive, 0);
      const totalOrders = records.reduce((sum, r) => sum + r.completedOrders, 0);
      const workingDays = records.filter(r => r.totalSales > 0).length;

      // Best level bonus logic
      const levelValues = records.map(r => levelOrder.indexOf(r.level));
      const bestLevelIndex = Math.max(...levelValues);
      const bestLevel = levelOrder[bestLevelIndex] || 'NONE';
      
      let bonus = 0;
      let awards = [];
      
      if (bestLevel === 'CHAMPION') { bonus = 500; awards.push('Monthly Champion Badge'); }
      if (bestLevel === 'STAR') { bonus = 1000; awards.push('High Achiever Cash Bonus'); }
      if (bestLevel === 'SUPER_STAR') { bonus = 2500; awards.push('VGE Super Star Award'); }

      const totalEarnings = baseSalary + totalIncentive + bonus;

      await prisma.vgeMonthlySummary.upsert({
        where: { userId_month: { userId, month } },
        update: {
          totalSales,
          totalRegistrations,
          totalIncentive,
          totalOrders,
          workingDays,
          bestLevel,
          metadata: { 
            baseSalary, 
            bonus, 
            awards, 
            totalEarnings,
            targetCTC: 15000 
          },
        },
        create: {
          userId,
          month,
          totalSales,
          totalRegistrations,
          totalIncentive,
          totalOrders,
          workingDays,
          bestLevel,
          metadata: { 
            baseSalary, 
            bonus, 
            awards, 
            totalEarnings,
            targetCTC: 15000 
          },
        }
      });
      count++;
    }

    console.log(`[VGE] Monthly summary: Generated ${count} summaries for ${month}`);
    return count;
  } catch (error) {
    console.error(`[VGE] Monthly summary error:`, error.message);
    return 0;
  }
}

/**
 * Get leaderboard for a specific date
 */
export async function getLeaderboard(dateStr = null, sortBy = 'totalSales') {
  const date = dateStr || toISTDateString();

  const validSortFields = ['totalSales', 'totalRegistrations', 'totalIncentive'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'totalSales';

  const leaderboard = await prisma.vgeDailyPerformance.findMany({
    where: { date },
    orderBy: { [orderField]: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, assignedVehicle: { select: { vehicleNumber: true } } }
      }
    }
  });

  return leaderboard.map((entry, index) => ({
    rank: index + 1,
    userId: entry.userId,
    name: entry.user?.name || 'Unknown',
    vehicleNumber: entry.user?.assignedVehicle?.vehicleNumber || null,
    totalSales: entry.totalSales,
    totalRegistrations: entry.totalRegistrations,
    completedOrders: entry.completedOrders,
    level: entry.level,
    totalIncentive: entry.totalIncentive,
    salesIncentive: entry.salesIncentive,
    regIncentive: entry.regIncentive,
  }));
}

// Removed default export
