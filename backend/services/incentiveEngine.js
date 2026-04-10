/**
 * VGE Incentive Calculation Engine (Template Matched)
 * 
 * Logic follows the "Daily & Monthly Earnings Table" image:
 * 1. Incentives are CUMULATIVE by Level.
 * 2. Each level has a Sales Target and Apps Target (thresholds).
 * 3. Each level defines a fixed reward: (SalesSlab * Sales%) + (AppsSlab * AppsRate).
 * 4. Agent earns the SUM of rewards for all levels they have passed.
 */

const DEFAULT_CONFIG = {
  rules: [],
  baseSalary: 15000
};

/**
 * Calculate the cumulative incentive based on passed levels
 */
export function calculateIncentive(totalSales, totalRegistrations = 0, config = DEFAULT_CONFIG, userType = 'EMPLOYEE') {
  let rules = Array.isArray(config.rules) ? config.rules : [];
  if (typeof config.rules === 'string') {
    try { rules = JSON.parse(config.rules); } catch(e){}
  }

  let totalDailyIncentive = 0;
  let currentLevel = 'Base';

  // Sort by sales target to determine final level name
  const sortedLevels = [...rules].sort((a, b) => (Number(a.salesFrom)||0) - (Number(b.salesFrom)||0));

  sortedLevels.forEach(level => {
    const sFrom = Number(level.salesFrom) || 0;
    const sTo = Number(level.salesTo) || 0;
    const aTarget = Number(level.appsTarget) || 0;

    // Range-base mapping
    const inRange = sTo > 0 ? (totalSales >= sFrom && totalSales <= sTo) : (totalSales >= sFrom);

    if (inRange && totalRegistrations >= aTarget) {
      const sSlab = Number(level.salesSlab) || 0;
      const sType = level.salesType || 'PERCENTAGE';
      const sVal = Number(level.salesValue) || 0;
      const aSlab = Number(level.appsSlab) || 0;
      const aRate = Number(level.appsRate) || 0;

      // FREELANCERS: Only get App part, NO Sales Incentives
      const salesIncentive = (userType === 'FREELANCER') ? 0 : (sType === 'PERCENTAGE' ? (sSlab * sVal / 100) : sVal);
      const appIncentive = aSlab * aRate;

      const levelReward = salesIncentive + appIncentive;
      totalDailyIncentive += levelReward;
      currentLevel = level.name;
    }
  });

  return {
    level: currentLevel,
    eligibleSales: totalSales,
    salesIncentive: totalDailyIncentive,
    regIncentive: 0, 
    totalIncentive: totalDailyIncentive,
    slabsCount: rules.filter(level => totalSales >= (Number(level.salesFrom)||0)).length
  };
}

/**
 * Progress to next level
 */
export function getNextLevelInfo(totalSales, config = DEFAULT_CONFIG) {
  let rules = Array.isArray(config.rules) ? config.rules : [];
  if (typeof config.rules === 'string') {
    try { rules = JSON.parse(config.rules); } catch(e){}
  }

  const nextRules = rules
    .filter(r => (Number(r.salesFrom)||0) > totalSales)
    .sort((a, b) => (Number(a.salesFrom)||0) - (Number(b.salesFrom)||0));

  if (nextRules.length === 0) {
    return { nextLevel: null, amountNeeded: 0, progress: 100 };
  }

  const nextRule = nextRules[0];
  const nextTarget = Number(nextRule.salesFrom);
  
  const prevRules = rules
    .filter(r => (Number(r.salesFrom)||0) <= totalSales)
    .sort((a, b) => (Number(b.salesFrom)||0) - (Number(a.salesFrom)||0));
    
  const currentThreshold = prevRules.length > 0 ? Number(prevRules[0].salesFrom) : 0;
  const progress = ((totalSales - currentThreshold) / (nextTarget - currentThreshold)) * 100;

  return {
    nextLevel: nextRule.name,
    amountNeeded: nextTarget - totalSales,
    progress: Math.min(100, Math.max(0, progress)),
  };
}

/**
 * Progress bar utility
 */
export function getNextSlabInfo(totalSales, config = DEFAULT_CONFIG) {
  const info = getNextLevelInfo(totalSales, config);
  return {
    amountToNextSlab: info.amountNeeded,
    currentSlabProgress: info.progress,
    nextSlabReward: 0,
  };
}

export default {
  calculateIncentive,
  getNextLevelInfo,
  getNextSlabInfo,
  DEFAULT_CONFIG,
};
