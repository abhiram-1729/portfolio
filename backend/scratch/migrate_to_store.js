import prisma from '../utils/prisma.js';

async function migrate() {
  const tenantId = 'VK001';
  
  // 1. Find the main store for this tenant (VillagKart)
  const mainStore = await prisma.store.findFirst({
    where: { tenantId }
  });

  if (!mainStore) {
    console.error('No store found for tenant:', tenantId);
    process.exit(1);
  }

  const storeId = mainStore.id;
  console.log(`Starting migration to store: ${mainStore.name} (${storeId})`);

  // 2. Migrate BusinessSettings
  console.log('Migrating BusinessSettings...');
  const existingStoreSettings = await prisma.businessSettings.findUnique({
    where: { tenantId_storeId: { tenantId, storeId } }
  });

  if (existingStoreSettings) {
    console.log('Deleting existing placeholder store settings...');
    await prisma.businessSettings.delete({ where: { id: existingStoreSettings.id } });
  }

  const bSettings = await prisma.businessSettings.updateMany({
    where: { tenantId, storeId: null },
    data: { storeId: storeId }
  });
  console.log(`Migrated ${bSettings.count} BusinessSettings.`);

  // 3. Migrate Units
  const units = await prisma.unit.findMany({ where: { tenantId, storeId: null } });
  let migratedUnits = 0;
  for (const unit of units) {
    try {
      await prisma.unit.update({
        where: { id: unit.id },
        data: { storeId }
      });
      migratedUnits++;
    } catch (e) {
      // Likely name conflict if it's already in the store
    }
  }
  console.log(`Migrated ${migratedUnits} Units.`);

  // 4. Migrate Categories
  const cats = await prisma.category.findMany({ where: { tenantId, storeId: null } });
  let migratedCats = 0;
  for (const cat of cats) {
    try {
      await prisma.category.update({
        where: { id: cat.id },
        data: { storeId }
      });
      migratedCats++;
    } catch (e) {
    }
  }
  console.log(`Migrated ${migratedCats} Categories.`);

  // 5. Migrate Asset Categories
  const assetCats = await prisma.assetCategory.updateMany({
    where: { tenantId, storeId: null },
    data: { storeId }
  });
  console.log(`Migrated ${assetCats.count} Asset Categories.`);

  console.log('Migration Complete.');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
