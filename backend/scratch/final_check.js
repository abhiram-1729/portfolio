import prisma from '../utils/prisma.js';

async function main() {
  try {
    console.log('Final check of database schema...');
    const tables = ['Village', 'VillageActivity', 'LocationCheckIn'];
    
    for (const table of tables) {
      const result = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" LIMIT 1`);
      console.log(`${table} keys:`, result[0] ? Object.keys(result[0]) : 'No rows');
    }

    console.log('Testing getVillages query (Admin pattern)...');
    const villages = await prisma.village.findMany({
      where: { tenantId: 'VK001' },
      orderBy: { name: 'asc' }
    });
    console.log('Villages found:', villages.length);

  } catch (error) {
    console.error('Final check failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
