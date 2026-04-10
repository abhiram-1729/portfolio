import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.findFirst();
    console.log('User found:', !!user);
    if (user) console.log('vgeType exists:', 'vgeType' in user, 'Value:', user.vgeType);
  } catch (err) {
    console.error('Prisma Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

test();
