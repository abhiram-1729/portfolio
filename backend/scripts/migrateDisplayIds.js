import prisma from '../utils/prisma.js';
import { generateId } from '../utils/idGenerator.js';

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runMigration() {
  console.log('Starting Display ID Migration...');
  try {
    // 1. Fetch all tenants
    const tenants = await prisma.tenant.findMany({
      include: { stores: true }
    });

    console.log(`Found ${tenants.length} tenants to migrate.`);

    for (const tenant of tenants) {
      console.log(`\n--- Migrating Tenant: ${tenant.name} (${tenant.id}) ---`);
      
      for (const store of tenant.stores) {
        console.log(`\n  Processing Hub (Store): ${store.name} (${store.code})`);
        
        if (!store.stateCode || !store.hubCode) {
          console.log(`  [!WARNING] Store ${store.name} is missing stateCode or hubCode. Generating generic codes.`);
          // Auto-generate missing codes
          const stateCode = 'XX';
          const hubCode = store.code.substring(0, 3).toUpperCase().padEnd(3, 'X');
          await prisma.store.update({
             where: { id: store.id },
             data: { stateCode, hubCode }
          });
          store.stateCode = stateCode;
          store.hubCode = hubCode;
        }

        const runEntityMigration = async (modelName, entityCode, storeFilterField = 'storeId') => {
          console.log(`    Migrating ${modelName}...`);
          try {
            const records = await prisma[modelName].findMany({
              where: { tenantId: tenant.id, [storeFilterField]: store.id, displayId: null },
              orderBy: { id: 'asc' }
            });
            
            console.log(`      Found ${records.length} records missing displayId.`);
            let count = 0;
            
            for (const record of records) {
              // Pass the store id explicitly. The generator will resolve the store from DB to build the prefix.
              // Note: generateId uses storeId internally to find state/hub.
              let displayId = '';
              try {
                // Determine format
                let format = 'continuous';
                if (entityCode === 'INV' || entityCode === 'GRN' || entityCode === 'PMT' || entityCode === 'EXP') format = 'daily';
                else if (entityCode === 'PO') format = 'yearly';
                
                // Determine date to use for sequence mapping (fallback to createdAt)
                let targetDate = record.createdAt;
                if (entityCode === 'INV' && record.invoiceDate) targetDate = record.invoiceDate;
                if (entityCode === 'PO' && record.poDate) targetDate = record.poDate;
                
                displayId = await generateId({
                   entity: entityCode,
                   tenantId: tenant.id,
                   storeId: store.id,
                   dateStr: targetDate ? new Date(targetDate).toISOString().slice(0,10).replace(/-/g, '') : undefined
                });

                await prisma[modelName].update({
                  where: { id: record.id },
                  data: { displayId }
                });
                count++;
                
                if (count % 10 === 0 || count === records.length) {
                  console.log(`      Progress: ${count}/${records.length} `);
                }
                
                // Small delay to prevent blowing up the connection pool
                await delay(20);
              } catch (err) {
                 console.error(`\n      [!] Failed to generate ID for ${modelName} ID: ${record.id}:`, err.message);
              }
            }
            console.log(`\n      Completed ${count}/${records.length} ${modelName} records.`);
          } catch (e) {
             console.log(`      [!] Error migrating ${modelName}:`, e.message);
          }
        };

        // Standard entities
        await runEntityMigration('user', 'USR');
        await runEntityMigration('vehicle', 'VCL');
        await runEntityMigration('expense', 'EXP');
        await runEntityMigration('vendor', 'VND');
        await runEntityMigration('purchaseOrder', 'PO');
        await runEntityMigration('goodsReceipt', 'GRN');
        await runEntityMigration('purchaseInvoice', 'INV');
        await runEntityMigration('vendorPayment', 'PMT');
        await runEntityMigration('order', 'ORD'); // Customer Orders
        
      } // End Store Loop
      
      // Items/Products are tenant-level but typically lack storeId. We will use a generic ITM ID for tenant-level items
      console.log(`\n  Processing Tenant level entities (Items)`);
      try {
        const products = await prisma.product.findMany({
            where: { tenantId: tenant.id, displayId: null },
            orderBy: { id: 'asc' }
        });
        console.log(`    Found ${products.length} Products missing displayId.`);
        let pCount = 0;
        for (const p of products) {
            // We use null for storeId so the ID generates strictly at Tenant Level
            const displayId = await generateId({
              entity: 'ITM',
              tenantId: tenant.id
            });
            await prisma.product.update({
                where: { id: p.id },
                data: { displayId }
            });
            pCount++;
            await delay(10);
        }
        console.log(`    Updated ${pCount}/${products.length} Products.`);
      } catch(err) {
         console.log(`    [!] Error migrating Products:`, err.message);
      }
      
    }
    
    console.log('\nMigration Complete!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
