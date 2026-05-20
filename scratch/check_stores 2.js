import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkStores() {
  const stores = await prisma.store.findMany({
    include: {
      tenant: true
    }
  });
  console.log('Stores in DB:', JSON.stringify(stores, null, 2));
  process.exit(0);
}

checkStores();
