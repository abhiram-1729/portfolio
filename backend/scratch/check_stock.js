
import prisma from '../utils/prisma.js';

async function check() {
  try {
    const ledger = await prisma.procurementStockLedger.findMany({
      where: { productId: 'cmolc4z8e003aduzn3hxlen6m' },
      orderBy: { createdAt: 'desc' }
    });
    console.log(JSON.stringify(ledger, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
