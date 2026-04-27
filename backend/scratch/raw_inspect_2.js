import prisma from '../utils/prisma.js';

async function main() {
  try {
    console.log('Inspecting VillageActivity table...');
    const result = await prisma.$queryRaw`SELECT * FROM "VillageActivity" LIMIT 1`;
    console.log('VillageActivity keys:', result[0] ? Object.keys(result[0]) : 'No rows');

    console.log('Inspecting LocationCheckIn table...');
    const result2 = await prisma.$queryRaw`SELECT * FROM "LocationCheckIn" LIMIT 1`;
    console.log('LocationCheckIn keys:', result2[0] ? Object.keys(result2[0]) : 'No rows');

  } catch (error) {
    console.error('Inspection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
