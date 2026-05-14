const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { role: { in: ['SALES_AGENT', 'SUPERVISOR'] } },
    select: { id: true, name: true, storeId: true }
  });
  console.log('Users with roles:', JSON.stringify(users, null, 2));
  
  const stores = await prisma.store.findMany({
    select: { id: true, name: true }
  });
  console.log('Stores:', JSON.stringify(stores, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
