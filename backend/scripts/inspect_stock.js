import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const warehouses = await prisma.warehouse.findMany();
  console.log('Warehouses:', warehouses);

  const inventory = await prisma.warehouseInventory.findMany({
    take: 10
  });
  console.log('Inventory Sample:', inventory);

  const products = await prisma.product.findMany({
    take: 5,
    select: { id: true, name: true, stock: true }
  });
  console.log('Products Sample:', products);
}

main().catch(console.error).finally(() => prisma.$disconnect());
