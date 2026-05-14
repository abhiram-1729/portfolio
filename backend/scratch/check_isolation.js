import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.groupBy({
    by: ['storeId'],
    _count: { id: true },
  });
  console.log('User counts by storeId:', JSON.stringify(users, null, 2));
  
  const perfs = await prisma.vgeDailyPerformance.groupBy({
    by: ['storeId'],
    _count: { id: true },
  });
  console.log('Performance counts by storeId:', JSON.stringify(perfs, null, 2));
}

main().finally(() => prisma.$disconnect());
