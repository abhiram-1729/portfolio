import prisma from '../utils/prisma.js';
// Removed new PrismaClient() call to use project-wide instance

async function repairStock() {
  console.log('🚀 Starting Stock Integrity Repair...');
  
  try {
    const products = await prisma.product.findMany({
      include: {
        WarehouseInventory: true
      }
    });

    console.log(`🔍 Found ${products.length} products to check.`);

    let fixedCount = 0;

    for (const prod of products) {
      const actualQty = prod.WarehouseInventory.reduce((acc, curr) => acc + curr.quantity, 0);
      
      if (prod.stock !== actualQty) {
        console.log(`🛠️ Syncing ${prod.name}: ${prod.stock} -> ${actualQty}`);
        await prisma.product.update({
          where: { id: prod.id },
          data: { stock: actualQty }
        });
        fixedCount++;
      }
    }

    console.log(`✅ Repair Complete! Fixed ${fixedCount} out-of-sync records.`);
  } catch (error) {
    console.error('❌ Repair Failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

repairStock();
