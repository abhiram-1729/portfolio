/**
 * One-time script to sync Product.stock from WarehouseInventory.
 * Product.stock = SUM of WarehouseInventory quantities for that product.
 * 
 * Run: node scripts/sync_product_stock.js
 */
import prisma from '../utils/prisma.js';

async function syncProductStock() {
  console.log('🔄 Syncing Product.stock from WarehouseInventory...\n');

  // Get all warehouse inventory entries
  const warehouseItems = await prisma.warehouseInventory.findMany({
    select: {
      productId: true,
      quantity: true,
    },
  });

  // Aggregate by productId
  const stockMap = {};
  for (const wi of warehouseItems) {
    stockMap[wi.productId] = (stockMap[wi.productId] || 0) + wi.quantity;
  }

  const productIds = Object.keys(stockMap);
  console.log(`📦 Found ${warehouseItems.length} warehouse entries across ${productIds.length} products\n`);

  if (productIds.length === 0) {
    console.log('⚠️  No WarehouseInventory records found.');
    console.log('   This means Product.stock values are the authoritative source.');
    console.log('   If products still show 0 stock, you need to set stock via the admin inventory.');
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const productId of productIds) {
    const newStock = stockMap[productId];
    
    const product = await prisma.product.findFirst({
      where: { id: productId },
      select: { id: true, name: true, stock: true },
    });

    if (!product) {
      skipped++;
      continue;
    }

    if (product.stock !== newStock) {
      await prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
      });
      console.log(`  ✅ ${product.name}: ${product.stock} → ${newStock}`);
      updated++;
    } else {
      console.log(`  ⏭️  ${product.name}: already ${newStock}`);
      skipped++;
    }
  }

  console.log(`\n✅ Done! Updated: ${updated}, Already synced: ${skipped}`);
}

syncProductStock()
  .catch((e) => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  });
