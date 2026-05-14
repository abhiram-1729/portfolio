import prisma from '../utils/prisma.js';

async function cleanup() {
  try {
    const targetStoreId = 'cmntyd6a80000ooznlwpwffm5'; // orginal1
    const unwantedStoreIds = ['cmntz426700008eznpd9gbjar', 'cmnu78ac00000sizn56pb0gyj']; // Lagroce, reatchall

    console.log(`Starting cleanup... Moving data to ${targetStoreId}`);

    const models = [
      'User', 'Vehicle', 'Product', 'Category', 'Unit', 'Village', 
      'Route', 'Asset', 'Expense', 'Attendance', 'Order', 'ShiftLog', 
      'OrderItem', 'Payment', 'VgeDailyPerformance', 'VgeMonthlySummary',
      'InventoryAudit', 'OpeningCash', 'ClosingCash', 'DailyCashSummary'
    ];

    for (const storeId of unwantedStoreIds) {
      console.log(`Processing unwanted store: ${storeId}`);
      
      for (const model of models) {
        const modelName = model.charAt(0).toLowerCase() + model.slice(1);
        const prismaModel = prisma[modelName];
        if (prismaModel) {
          try {
            const result = await prismaModel.updateMany({
              where: { storeId: storeId },
              data: { storeId: targetStoreId }
            });
            if (result.count > 0) {
              console.log(`  [MOVED] ${model}: ${result.count} records`);
            }
          } catch (err) {
            // console.log(`  [FAILED] ${model}: ${err.message}`);
          }
        }
      }

      // Now delete the store
      try {
        await prisma.store.delete({
          where: { id: storeId }
        });
        console.log(`[DELETED] Store ${storeId} removed successfully.`);
      } catch (err) {
        console.error(`[ERROR] Failed to delete store ${storeId}: ${err.message}`);
      }
    }

    console.log('Cleanup completed successfully.');
  } catch (error) {
    console.error('Cleanup failed:', error);
  } finally {
    process.exit(0);
  }
}

cleanup();
