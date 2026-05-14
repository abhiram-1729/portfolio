import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkProducts() {
  try {
    const products = await prisma.product.findMany({
      take: 10,
      include: { store: true }
    });
    console.log('--- Product Store Info ---');
    products.forEach(p => {
      console.log(`Product: ${p.name}, StoreId: ${p.storeId}, StoreName: ${p.store?.name || 'NULL'}`);
    });
    await prisma.$disconnect();
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

checkProducts();
