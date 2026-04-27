import prisma from '../utils/prisma.js';

async function main() {
  try {
    console.log('Adding missing isPolygon column to Village table...');

    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Village" 
      ADD COLUMN IF NOT EXISTS "isPolygon" BOOLEAN DEFAULT FALSE;
    `);
    console.log('Checked Village.isPolygon');

    console.log('Database schema fix completed.');

  } catch (error) {
    console.error('Error during manual schema fix:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
