import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();
  console.log('Total Products:', count);
  
  const freeProducts = await prisma.product.count({ where: { isFree: true } });
  console.log('Free Products:', freeProducts);

  const vehicleStockCount = await prisma.vehicleStock.count({ where: { vehicleId: 'cmnlu0lqe001vqrp7aoqutl4b' } });
  console.log('Stock assigned to vehicle cmnlu0lqe001vqrp7aoqutl4b:', vehicleStockCount);

  if (count > 0) {
    const sample = await prisma.product.findFirst({ select: { name: true, status: true, isFree: true } });
    console.log('Sample Product:', sample);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
