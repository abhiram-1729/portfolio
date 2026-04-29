import prisma from '../utils/prisma.js';

async function main() {
  try {
    console.log('Starting manual database schema fix...');

    // Add missing columns to Village
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Village" 
      ADD COLUMN IF NOT EXISTS "boundary" JSONB;
    `);
    console.log('Checked Village.boundary');

    // Add missing columns to VillageActivity
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "VillageActivity" 
      ADD COLUMN IF NOT EXISTS "subLocation" TEXT;
    `);
    console.log('Checked VillageActivity.subLocation');

    // Add missing columns to LocationCheckIn
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "LocationCheckIn" 
      ADD COLUMN IF NOT EXISTS "subLocation" TEXT;
    `);
    console.log('Checked LocationCheckIn.subLocation');

    console.log('Database schema fix completed successfully.');

  } catch (error) {
    console.error('Error during manual schema fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
