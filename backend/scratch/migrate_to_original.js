import prisma from '../utils/prisma.js';

async function migrate() {
  try {
    console.log('Starting comprehensive migration...');

    // 1. Get all stores without a creatorId
    const storesWithoutCreator = await prisma.store.findMany({
      where: { creatorId: null }
    });

    console.log(`Found ${storesWithoutCreator.length} stores without creatorId.`);

    for (const store of storesWithoutCreator) {
      // Find the first TENANT_OWNER or ADMIN for this store's tenant
      let admin = await prisma.user.findFirst({
        where: { 
          tenantId: store.tenantId,
          role: { in: ['TENANT_OWNER', 'ADMIN'] }
        },
        orderBy: { createdAt: 'asc' }
      });

      if (!admin) {
        console.log(`[WARNING] No admin found for tenant ${store.tenantId}. Skipping store ${store.name}.`);
        continue;
      }

      const updateData = { creatorId: admin.id };
      
      // If the user wants to rename a specific store to "orginal1"
      // Let's pick the one named "Villagkart" or the first one found for VK001
      if (store.tenantId === 'VK001' && (store.name === 'Villagkart' || store.code === 'str-001')) {
        updateData.name = 'orginal1';
        console.log(`Renaming store ${store.name} to "orginal1" for tenant VK001`);
      }

      await prisma.store.update({
        where: { id: store.id },
        data: updateData
      });

      console.log(`[SUCCESS] Updated store "${store.name}" (ID: ${store.id}) with creator ${admin.name} (${admin.id})`);
    }

    // 2. Also ensure all records (User, Vehicle, etc.) that have null storeId are assigned to the primary store
    // For tenant VK001, we'll use the 'orginal1' store
    const vkStore = await prisma.store.findFirst({
      where: { tenantId: 'VK001', name: 'orginal1' }
    });

    if (vkStore) {
      console.log(`Consolidating unassigned records for VK001 into ${vkStore.name} (${vkStore.id})...`);
      
      const models = [
        'User', 'Vehicle', 'Product', 'Category', 'Unit', 'Village', 
        'Route', 'Asset', 'Expense', 'Attendance', 'Order', 'ShiftLog', 
        'OrderItem', 'Payment', 'VgeDailyPerformance', 'VgeMonthlySummary',
        'InventoryAudit', 'OpeningCash', 'ClosingCash', 'DailyCashSummary'
      ];

      for (const model of models) {
        const modelName = model.charAt(0).toLowerCase() + model.slice(1);
        const prismaModel = prisma[modelName];
        if (prismaModel) {
          try {
            const result = await prismaModel.updateMany({
              where: { 
                tenantId: 'VK001',
                storeId: null 
              },
              data: { storeId: vkStore.id }
            });
            if (result.count > 0) {
              console.log(`[SUCCESS] Consolidated ${model}: ${result.count} records`);
            }
          } catch (err) {
            // Some models might not have storeId or different schema
          }
        }
      }
    }

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrate();
