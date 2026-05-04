
import prisma from '../utils/prisma.js';

async function check() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, gst: true },
    take: 10
  });
  console.log(JSON.stringify(products, null, 2));
}

check().catch(console.error).finally(() => prisma.$disconnect());
