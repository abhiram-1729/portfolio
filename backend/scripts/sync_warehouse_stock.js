/**
 * One-time script to sync WarehouseInventory from Product.stock.
 * This is useful if sales have been decrementing Product.stock but not WarehouseInventory.
 * 
 * Run: node scripts/sync_warehouse_stock.js
 */
import prisma from '../utils/prisma.js';

async function syncWarehouseStock() {
  console.log('🔄 Syncing WarehouseInventory from Product.stock...\n');

  // Get all products with their warehouse inventory
  const products = await prisma.product.findMany({
    include: {
      WarehouseInventory: true,
    },
  });

  console.log(`📦 Processing ${products.length} products...\n`);

  let updated = 0;
  let skipped = 0;
  let created = 0;

  for (const product of products) {
    const warehouseQty = product.WarehouseInventory.reduce((sum, wi) => sum + wi.quantity, 0);
    const currentStock = product.stock || 0;
    
    // If POS stock is 0 but Warehouse has stock (Procurement case), or they are just different
    if (currentStock !== warehouseQty) {
      await prisma.product.update({
        where: { id: product.id },
        data: { stock: warehouseQty },
      });
      console.log(`  ✅ ${product.name}: POS ${currentStock} → ${warehouseQty} (Synced from Warehouse)`);
      updated++;
    } else {
      skipped++;
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Created: ${created}, Already synced: ${skipped}`);
}

syncWarehouseStock()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });
