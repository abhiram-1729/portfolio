
import prisma from '../utils/prisma.js';

async function fix() {
  try {
    await prisma.product.update({
      where: { id: 'cmolc4z8e003aduzn3hxlen6m' },
      data: { stock: 5 }
    });
    await prisma.warehouseInventory.updateMany({
      where: { productId: 'cmolc4z8e003aduzn3hxlen6m' },
      data: { quantity: 5 }
    });
    console.log('Fixed');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}
fix();
