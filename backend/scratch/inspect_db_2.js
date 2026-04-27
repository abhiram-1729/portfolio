import prisma from '../utils/prisma.js';

async function main() {
  try {
    const storeColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Store'
    `;
    console.log('Store columns:', storeColumns);

    const locationCheckInColumns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'LocationCheckIn'
    `;
    console.log('LocationCheckIn columns:', locationCheckInColumns);

  } catch (error) {
    console.error('Error fetching columns:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
