import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
  try {
    const res = await prisma.closingCash.findUnique({
      where: {
        vehicleId_date_shift: {
          vehicleId: 'some-id',
          date: '2026-04-16',
          shift: 1
        }
      }
    });
    console.log('Query success:', res);
  } catch (err) {
    console.error('Query error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

test();
