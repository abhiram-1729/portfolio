import prisma from '../utils/prisma.js';

async function main() {
  try {
    const migrations = await prisma.$queryRaw`SELECT id, migration_name, applied_steps_count FROM _prisma_migrations`;
    console.log('Applied migrations in DB:', migrations);
  } catch (error) {
    console.error('Error fetching migrations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
