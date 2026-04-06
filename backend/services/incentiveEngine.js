/**
 * VGE Incentive Calculation Engine
 * 
 * Pure calculation logic — no database dependencies.
 * All thresholds are configurable via the `config` parameter.
 */

// Default configuration (mirrors VgeIncentiveConfig model defaults)
const DEFAULT_CONFIG = {
  minSalesThreshold: 10000,
  minRegThreshold: 5,
  salesSlabSize: 5000,
  firstSlabCount: 2,
  firstSlabIncentive: 50,
  remainingSlabIncentive: 100,
  firstRegCount: 10,
  firstRegIncentive: 10,
  remainingRegIncentive: 15,
  starterThreshold: 10000,
  performerThreshold: 15000,
  achieverThreshold: 20000,
  championThreshold: 25000,
  starThreshold: 30000,
  superStarThreshold: 35000,
};

/**
 * Determine the VGE level based on total sales
 */
export function calculateLevel(totalSales, config = DEFAULT_CONFIG) {
  if (totalSales >= config.superStarThreshold) return 'SUPER_STAR';
  if (totalSales >= config.starThreshold) return 'STAR';
  if (totalSales >= config.championThreshold) return 'CHAMPION';
  if (totalSales >= config.achieverThreshold) return 'ACHIEVER';
  if (totalSales >= config.performerThreshold) return 'PERFORMER';
  if (totalSales >= config.starterThreshold) return 'STARTER';
  return 'NONE';
}

/**
 * Calculate sales incentive based on slab system
 */
export function calculateSalesIncentive(totalSales, config = DEFAULT_CONFIG) {
  if (totalSales < config.minSalesThreshold) {
    return { eligibleSales: 0, slabsCount: 0, salesIncentive: 0 };
  }

  const eligibleSales = totalSales - config.minSalesThreshold;
  const slabsCount = Math.floor(eligibleSales / config.salesSlabSize);

  if (slabsCount === 0) {
    return { eligibleSales, slabsCount: 0, salesIncentive: 0 };
  }

  // First N slabs at lower rate, remaining at higher rate
  const firstSlabs = Math.min(slabsCount, config.firstSlabCount);
  const remainingSlabs = Math.max(0, slabsCount - config.firstSlabCount);

  const salesIncentive = 
    (firstSlabs * config.firstSlabIncentive) + 
    (remainingSlabs * config.remainingSlabIncentive);

  return { eligibleSales, slabsCount, salesIncentive };
}

/**
 * Calculate registration incentive
 */
export function calculateRegIncentive(totalRegistrations, config = DEFAULT_CONFIG) {
  if (totalRegistrations < config.minRegThreshold) {
    return { eligibleRegs: 0, regIncentive: 0 };
  }

  const eligibleRegs = totalRegistrations - config.minRegThreshold;

  if (eligibleRegs <= 0) {
    return { eligibleRegs: 0, regIncentive: 0 };
  }

  const firstRegs = Math.min(eligibleRegs, config.firstRegCount);
  const remainingRegs = Math.max(0, eligibleRegs - config.firstRegCount);

  const regIncentive = 
    (firstRegs * config.firstRegIncentive) + 
    (remainingRegs * config.remainingRegIncentive);

  return { eligibleRegs, regIncentive };
}

/**
 * Main calculation function — combines all incentive logic
 * 
 * @param {number} totalSales - Total sales amount for the day
 * @param {number} totalRegistrations - Total verified registrations for the day
 * @param {Object} config - Incentive configuration (optional, uses defaults)
 * @returns {Object} Complete incentive breakdown
 */
export function calculateIncentive(totalSales, totalRegistrations = 0, config = DEFAULT_CONFIG) {
  const level = calculateLevel(totalSales, config);
  const { eligibleSales, slabsCount, salesIncentive } = calculateSalesIncentive(totalSales, config);
  const { eligibleRegs, regIncentive } = calculateRegIncentive(totalRegistrations, config);
  const totalIncentive = salesIncentive + regIncentive;

  return {
    level,
    eligibleSales,
    slabsCount,
    salesIncentive,
    eligibleRegs: eligibleRegs || 0,
    regIncentive,
    totalIncentive,
  };
}

/**
 * Calculate progress to next level
 */
export function getNextLevelInfo(totalSales, config = DEFAULT_CONFIG) {
  const levels = [
    { level: 'STARTER', threshold: config.starterThreshold },
    { level: 'PERFORMER', threshold: config.performerThreshold },
    { level: 'ACHIEVER', threshold: config.achieverThreshold },
    { level: 'CHAMPION', threshold: config.championThreshold },
    { level: 'STAR', threshold: config.starThreshold },
    { level: 'SUPER_STAR', threshold: config.superStarThreshold },
  ];

  const currentLevel = calculateLevel(totalSales, config);
  const currentIndex = levels.findIndex(l => l.level === currentLevel);

  if (currentLevel === 'SUPER_STAR') {
    return { nextLevel: null, amountNeeded: 0, progress: 100 };
  }

  if (currentLevel === 'NONE') {
    const nextLevel = levels[0];
    const amountNeeded = nextLevel.threshold - totalSales;
    const progress = Math.min(100, (totalSales / nextLevel.threshold) * 100);
    return { nextLevel: nextLevel.level, amountNeeded, progress };
  }

  const nextLevel = levels[currentIndex + 1];
  const currentThreshold = levels[currentIndex].threshold;
  const amountNeeded = nextLevel.threshold - totalSales;
  const progressInSlab = ((totalSales - currentThreshold) / (nextLevel.threshold - currentThreshold)) * 100;

  return {
    nextLevel: nextLevel.level,
    amountNeeded,
    progress: Math.min(100, Math.max(0, progressInSlab)),
  };
}

/**
 * Calculate next slab info for progress tracking
 */
export function getNextSlabInfo(totalSales, config = DEFAULT_CONFIG) {
  if (totalSales < config.minSalesThreshold) {
    return {
      amountToNextSlab: config.minSalesThreshold - totalSales,
      currentSlabProgress: (totalSales / config.minSalesThreshold) * 100,
      nextSlabReward: config.firstSlabIncentive,
    };
  }

  const eligibleSales = totalSales - config.minSalesThreshold;
  const completedSlabs = Math.floor(eligibleSales / config.salesSlabSize);
  const progressInSlab = eligibleSales % config.salesSlabSize;
  const amountToNextSlab = config.salesSlabSize - progressInSlab;

  const nextSlabReward = completedSlabs < config.firstSlabCount 
    ? config.firstSlabIncentive 
    : config.remainingSlabIncentive;

  return {
    amountToNextSlab,
    currentSlabProgress: (progressInSlab / config.salesSlabSize) * 100,
    nextSlabReward,
  };
}

export default {
  calculateIncentive,
  calculateLevel,
  calculateSalesIncentive,
  calculateRegIncentive,
  getNextLevelInfo,
  getNextSlabInfo,
  DEFAULT_CONFIG,
};
