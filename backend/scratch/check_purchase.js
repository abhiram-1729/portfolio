
import prisma from '../utils/prisma.js';

async function check() {
  try {
    const items = await prisma.purchaseInvoiceItem.findMany({
      where: { productId: 'cmolc4z8e003aduzn3hxlen6m' },
      include: { invoice: true }
    });
    console.log(JSON.stringify(items, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
check();
