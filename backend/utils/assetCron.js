import cron from 'node-cron';
import prisma from './prisma.js';

// Run everyday at Midnight (00:00)
export const initAssetCronJobs = () => {
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 [CRON] Starting Daily Asset Depreciation Calculation...');
    try {
      const depreciations = await prisma.assetDepreciation.findMany({
        include: { asset: true }
      });

      let updatedCount = 0;

      for (const dep of depreciations) {
        if (!dep.asset) continue;

        const elapsedMs = Date.now() - new Date(dep.asset.createdAt).getTime();
        const elapsedYears = elapsedMs / (1000 * 60 * 60 * 24 * 365.25);

        let calculatedBookValue = dep.costBasis;

        if (dep.method === 'STRAIGHT_LINE') {
          const annualDep = (dep.costBasis - dep.salvageValue) * (dep.ratePercentage / 100);
          calculatedBookValue = dep.costBasis - (annualDep * elapsedYears);
        } else {
          // Declining balance
          calculatedBookValue = dep.costBasis * Math.pow(1 - (dep.ratePercentage / 100), elapsedYears);
        }

        // Clamp to salvage value
        calculatedBookValue = Math.max(calculatedBookValue, dep.salvageValue);
        if (isNaN(calculatedBookValue) || calculatedBookValue < 0) calculatedBookValue = 0;

        const roundedVal = Math.round(calculatedBookValue);

        // Only update if it has changed to save DB writes
        if (roundedVal !== dep.currentBookVal) {
          await prisma.assetDepreciation.update({
            where: { id: dep.id },
            data: { 
              currentBookVal: roundedVal,
              lastCalculated: new Date()
            }
          });
          updatedCount++;
        }
      }

      console.log(`✅ [CRON] Depreciation updated for ${updatedCount} assets.`);
    } catch (error) {
      console.error('❌ [CRON] Asset Depreciation Error:', error);
    }
  });
};
