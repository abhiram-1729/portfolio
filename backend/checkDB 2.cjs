const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.assetTransferLog.count();
    console.log('TABLE EXISTS, count:', count);
  } catch (e) {
    console.log('TABLE MISSING:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}
// dsa
main();
