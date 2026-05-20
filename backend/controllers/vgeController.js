/**
 * VGE Targets & Incentives Controller
 * 
 * Endpoints for both agents and admins.
 * hsfghsgdh
 */

import prisma from '../utils/prisma.js';
import { getEffectiveStoreId } from '../utils/storeResolution.js';
import { 
  updateDailyPerformance, 
  getLeaderboard, 
  endOfDayProcess,
  generateMonthlySummary,
  toISTDateString,
  toISTMonthString,
  getConfig as fetchIncentiveConfig
} from '../services/vgeAggregationService.js';
import { 
  calculateIncentive, 
  getNextLevelInfo, 
  getNextSlabInfo 
} from '../services/incentiveEngine.js';

// getEffectiveStoreId is now imported from ../utils/storeResolution.js


// ─── AGENT ENDPOINTS ─────────────────────────────────────

/**
 * GET /api/vge/my-performance
 * Get current day's performance for logged-in agent
 */
export const getMyPerformance = async (req, res) => {
  try {
    const userId = req.user.id;
    const date = req.query.date || toISTDateString();

    // Try to get existing record, or compute fresh
    let perf = await prisma.vgeDailyPerformance.findUnique({
      where: { userId_date: { userId, date } }
    });

    if (!perf) {
      // Calculate on-the-fly if no record yet
      perf = await updateDailyPerformance(userId, date);
    }

    // Get user's daily target fallback
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { dailyTarget: true, baseSalary: true, tenantId: true, vgeType: true, storeId: true }
    });

    // Load config for progress info and base salary, matching user's store
    const config = await fetchIncentiveConfig(user?.tenantId || 'VK001', user?.storeId);
    
    const nextLevel = getNextLevelInfo(perf.totalSales, config);
    const nextSlab = getNextSlabInfo(perf.totalSales, config);

    // If config has rules, use the closest 'from' as the target for progress mapping
    let dailyTarget = user?.dailyTarget || 10000;
    
    let rulesArr = [];
    if (Array.isArray(config?.rules)) rulesArr = config.rules;
    else if (typeof config?.rules === 'string') {
      try { rulesArr = JSON.parse(config.rules); } catch(e){}
    }
        
    // Compute current level live to prevent stale cached database records
    let dynamicLevel = 'NONE';
    const sortedLevels = [...rulesArr].sort((a, b) => (Number(a.salesFrom)||0) - (Number(b.salesFrom)||0));
    sortedLevels.forEach(level => {
      if (perf.totalSales >= (Number(level.salesFrom)||0)) {
        dynamicLevel = level.name;
      }
    });
    perf.level = dynamicLevel;        
    if (nextLevel && nextLevel.nextLevel) {
        const nextRule = rulesArr.find(r => r.name === nextLevel.nextLevel);
        if (nextRule) dailyTarget = Number(nextRule.salesFrom) || dailyTarget;
    }

    res.json({
      ...perf,
      nextLevel,
      nextSlab,
      baseSalary: user?.baseSalary || config?.baseSalary || 12000,
      vgeType: user?.vgeType || 'EMPLOYEE',
      rules: rulesArr || config?.rules || [],
      dailyTarget,
      targetProgress: dailyTarget ? Math.min(100, (perf.totalSales / dailyTarget) * 100) : 0,
    });
  } catch (error) {
    console.error('[VGE] getMyPerformance error:', error);
    res.status(500).json({ message: 'Failed to load performance', error: error.message });
  }
};

/**
 * GET /api/vge/my-history
 * Get performance history for the logged-in agent
 */
export const getMyHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;

    const records = await prisma.vgeDailyPerformance.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: parseInt(days),
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load history', error: error.message });
  }
};

/**
 * GET /api/vge/my-monthly
 * Get monthly summary for the logged-in agent
 */
export const getMyMonthlySummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || toISTMonthString();

    const summary = await prisma.vgeMonthlySummary.findUnique({
      where: { userId_month: { userId, month } }
    });

    if (!summary) {
      return res.json({
        userId,
        month,
        totalSales: 0,
        totalRegistrations: 0,
        totalIncentive: 0,
        totalOrders: 0,
        workingDays: 0,
        avgLevel: 'NONE',
        bestLevel: 'NONE',
      });
    }

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load monthly summary', error: error.message });
  }
};

/**
 * GET /api/vge/leaderboard
 * Get daily leaderboard
 */
export const getLeaderboardHandler = async (req, res) => {
  try {
    const date = req.query.date || toISTDateString();
    const sortBy = req.query.sortBy || 'totalSales';
    const storeId = getEffectiveStoreId(req);

    const leaderboard = await getLeaderboard(date, sortBy, req.user.tenantId, storeId);
    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load leaderboard', error: error.message });
  }
};


// ─── ADMIN ENDPOINTS ─────────────────────────────────────

/**
 * GET /api/vge/admin/all-performance
 * Get all agents' daily performance
 */
export const getAllPerformance = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || toISTDateString();
    const storeId = getEffectiveStoreId(req);
    console.log(`[VGE-DEBUG] getAllPerformance | storeId: ${storeId} | targetDate: ${targetDate}`);
    const where = { 
      date: targetDate, 
      tenantId: req.user.tenantId 
    };

    const isGlobal = req.user?.role === 'TENANT_OWNER' || req.user?.role === 'SUPER_ADMIN' || (req.user?.role === 'ADMIN' && !req.user?.customRoleId) || req.user?.portalType === 'ADMIN';

    // Strict isolation: If a storeId is requested (or required for branch roles),
    // we must filter by it. If null is requested (Global only), we fetch all.
    if (storeId) {
      where.storeId = storeId;
    } else if (isGlobal && !req.query.storeId) {
      // For global view, we don't filter by storeId to see all
    } else if (req.user.storeId) {
      // Fallback for non-global users who somehow missed the storeId in query
      where.storeId = req.user.storeId;
    }
    console.log(`[VGE-DEBUG] Query where:`, JSON.stringify(where));

    const performances = await prisma.vgeDailyPerformance.findMany({
      where,
      orderBy: { totalSales: 'desc' },
      include: {
        user: {
          select: { 
            id: true, name: true, vgeType: true, baseSalary: true,
            assignedVehicle: { select: { vehicleNumber: true } }
          }
        }
      }
    });

    res.json(performances);
  } catch (error) {
    res.status(500).json({ message: 'Failed to load performance data', error: error.message });
  }
};

/**
 * GET /api/vge/admin/agent/:userId
 * Get specific agent's detailed performance history
 */
export const getAgentPerformance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { days = 30 } = req.query;

    const records = await prisma.vgeDailyPerformance.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: parseInt(days),
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, dailyTarget: true, assignedVehicle: { select: { vehicleNumber: true } } }
    });

    res.json({ user, records });
  } catch (error) {
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

/**
 * GET /api/vge/admin/monthly-report
 * Get all monthly summaries
 */
export const getMonthlyReport = async (req, res) => {
  try {
    const { month } = req.query;
    const storeId = getEffectiveStoreId(req);
    const targetMonth = month || toISTMonthString();

    const userWhere = {
      tenantId: req.user.tenantId,
      role: { in: ['SALES_AGENT', 'SUPERVISOR', 'HELPER'] },
      status: 'ACTIVE'
    };

    if (storeId) {
      userWhere.storeId = storeId;
    }

    // 1. Get all relevant users (SALES_AGENT, SUPERVISOR, HELPER)
    const users = await prisma.user.findMany({
      where: userWhere,
      select: {
        id: true,
        name: true,
        vgeType: true,
        baseSalary: true,
        assignedVehicle: { select: { vehicleNumber: true } }
      }
    });

    const summaryWhere = { 
      month: targetMonth, 
      tenantId: req.user.tenantId 
    };

    if (storeId) {
      summaryWhere.storeId = storeId;
    }

    // 2. Get existing summaries for this month
    const summaries = await prisma.vgeMonthlySummary.findMany({
      where: summaryWhere,
      include: {
        user: {
          select: { id: true, name: true, vgeType: true, baseSalary: true, assignedVehicle: { select: { vehicleNumber: true } } }
        }
      }
    });

    // 3. Merge: Every user should have a row. If summary exists, use it. Otherwise use defaults.
    const reportList = users.map(user => {
      const existingSummary = summaries.find(s => s.userId === user.id);
      
      if (existingSummary) return existingSummary;

      // Virtual summary for new/inactive users
      return {
        id: `uninitialized-${user.id}`,
        userId: user.id,
        user,
        month: targetMonth,
        totalSales: 0,
        totalRegistrations: 0,
        totalIncentive: 0,
        totalOrders: 0,
        workingDays: 0,
        bestLevel: 'NONE',
        metadata: {
          baseSalary: user.baseSalary || (user.vgeType === 'FREELANCER' ? 0 : 12000),
          bonus: 0,
          awards: [],
          totalEarnings: user.baseSalary || (user.vgeType === 'FREELANCER' ? 0 : 12000)
        }
      };
    });

    // Sort by totalSales desc
    reportList.sort((a, b) => b.totalSales - a.totalSales);

    res.json(reportList);
  } catch (error) {
    console.error('[VGE] Monthly report error:', error);
    res.status(500).json({ message: 'Error', error: error.message });
  }
};

/**
 * GET /api/vge/admin/config
 * Get incentive configuration
 */
export const getConfig = async (req, res) => {
  try {
    const storeId = getEffectiveStoreId(req);

    const config = await fetchIncentiveConfig(req.user.tenantId, storeId);
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: 'Error loading config', error: error.message });
  }
};

/**
 * PUT /api/vge/admin/config
 * Update incentive configuration
 */
export const updateConfig = async (req, res) => {
  try {
    const { ...data } = req.body;
    const storeId = getEffectiveStoreId(req);

    // Remove id and updatedAt from body to prevent overwrite
    delete data.id;
    delete data.updatedAt;

    const where = { tenantId: req.user.tenantId, storeId: storeId || null };

    const config = await prisma.vgeIncentiveConfig.upsert({
      where: { 
        tenantId_storeId: where // This requires a new unique index in schema!
      },
      update: data,
      create: { ...where, ...data }
    });

    res.json({ message: 'Configuration updated', config });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update config', error: error.message });
  }
};

/**
 * POST /api/vge/admin/recalculate
 * Force recalculation for a specific user + date (or all agents for a date)
 */
export const forceRecalculate = async (req, res) => {
  try {
    const { userId, date } = req.body;
    const targetDate = date || toISTDateString();

    if (userId) {
      // Recalculate for specific user
      // Unlock first if locked
      await prisma.vgeDailyPerformance.updateMany({
        where: { userId, date: targetDate },
        data: { isLocked: false }
      });

      const result = await updateDailyPerformance(userId, targetDate);
      return res.json({ message: 'Recalculated', result });
    }

    // Recalculate for all agents who have orders on this date
    const agents = await prisma.order.findMany({
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(`${targetDate}T00:00:00+05:30`),
          lte: new Date(`${targetDate}T23:59:59.999+05:30`)
        }
      },
      distinct: ['agentId'],
      select: { agentId: true }
    });

    const validAgents = agents.filter(a => a.agentId);

    // Unlock all
    await prisma.vgeDailyPerformance.updateMany({
      where: { date: targetDate },
      data: { isLocked: false }
    });

    const results = [];
    for (const agent of validAgents) {
      const result = await updateDailyPerformance(agent.agentId, targetDate);
      results.push(result);
    }

    res.json({ message: `Recalculated ${results.length} agents`, count: results.length });
  } catch (error) {
    res.status(500).json({ message: 'Recalculation failed', error: error.message });
  }
};

/**
 * POST /api/vge/admin/end-of-day
 * Manually trigger end-of-day process
 */
export const triggerEndOfDay = async (req, res) => {
  try {
    const date = req.body.date || toISTDateString();
    const count = await endOfDayProcess(date);
    res.json({ message: `End-of-day completed. Locked ${count} records.`, count });
  } catch (error) {
    res.status(500).json({ message: 'End-of-day failed', error: error.message });
  }
};

/**
 * POST /api/vge/admin/generate-monthly
 * Manually trigger monthly summary generation
 */
export const triggerMonthlySummary = async (req, res) => {
  try {
    const month = req.body.month || toISTMonthString();
    const count = await generateMonthlySummary(month);
    res.json({ message: `Monthly summary generated for ${count} agents.`, count });
  } catch (error) {
    res.status(500).json({ message: 'Monthly summary failed', error: error.message });
  }
};
