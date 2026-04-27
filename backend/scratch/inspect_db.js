import prisma from '../utils/prisma.js';

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Village'
    `;
    console.log('Village columns:', columns);

    const activityColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'VillageActivity'
    `;
    console.log('VillageActivity columns:', activityColumns);

  } catch (error) {
    console.error('Error fetching columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
