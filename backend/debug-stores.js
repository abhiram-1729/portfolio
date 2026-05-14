import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Testing store fetch...');
    const stores = await prisma.store.findMany({
      where: {
        tenantId: 'VK001', // Common tenant ID in this app
        creatorId: 'some-id'
      }
    });
    console.log('Success:', stores.length, 'stores found');
  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
