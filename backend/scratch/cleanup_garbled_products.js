import prisma from '../utils/prisma.js';

async function cleanup() {
  try {
    console.log('🔍 Finding products with garbled names (encoding artifacts)...');
    
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: 'à°' } },
          { name: { contains: 'à±' } },
          { name: { contains: 'à²' } }
        ]
      }
    });

    console.log(`Found ${products.length} garbled products.`);

    if (products.length === 0) {
      console.log('✅ No garbled products found.');
      return;
    }

    for (const product of products) {
      console.log(`🗑️ Deleting ${product.name} (${product.id})...`);
      
      const id = product.id;
      // Use correct model names for direct deletion
      await prisma.cartItem.deleteMany({ where: { productId: id } });
      await prisma.orderItem.deleteMany({ where: { productId: id } });
      await prisma.orderReturn.deleteMany({ where: { productId: id } });
      await prisma.stockTransaction.deleteMany({ where: { productId: id } });
      await prisma.vehicleStock.deleteMany({ where: { productId: id } });
      await prisma.warehouseInventory.deleteMany({ where: { productId: id } });
      await prisma.productVariant.deleteMany({ where: { productId: id } });
      await prisma.refillItem.deleteMany({ where: { productId: id } });
      await prisma.stockAuditItem.deleteMany({ where: { productId: id } });
      await prisma.vendorItemMapping.deleteMany({ where: { productId: id } });
      await prisma.purchaseOrderItem.deleteMany({ where: { productId: id } });
      await prisma.goodsReceiptItem.deleteMany({ where: { productId: id } });
      await prisma.purchaseInvoiceItem.deleteMany({ where: { productId: id } });
      await prisma.damageEntry.deleteMany({ where: { productId: id } });
      await prisma.procurementStockLedger.deleteMany({ where: { productId: id } });

      await prisma.product.delete({ where: { id } });
    }

    console.log('✅ Cleanup complete.');
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

cleanup();
