import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const products = await prisma.product.findMany({
      select: { id: true, name: true, price: true, gst: true }
    });
    console.log(JSON.stringify(products, null, 2));
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
