
import prisma from '../utils/prisma.js';

async function check() {
  try {
    const ids = ['cmnmv6a2l004lqrp7q9qt2uf9', 'cmolc4z8e0039duzndbhi6v15'];
    for (const id of ids) {
      console.log(`\n--- Product ID: ${id} ---`);
      const product = await prisma.product.findUnique({
        where: { id },
        include: { WarehouseInventory: true, vehicleStocks: true }
      });
      console.log('Stock fields:', { stock: product.stock });
      console.log('Warehouse Inventories:', product.WarehouseInventory);
      console.log('Vehicle Stocks:', product.vehicleStocks);

      const ledger = await prisma.procurementStockLedger.findMany({
        where: { productId: id },
        orderBy: { createdAt: 'desc' },
        take: 5
      });
      console.log('Recent Ledger:', JSON.stringify(ledger, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
