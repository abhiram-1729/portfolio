import prisma from '../utils/prisma.js';

async function main() {
  try {
    console.log('Doing raw inspection of Village table...');
    const result = await prisma.$queryRaw`SELECT * FROM "Village" LIMIT 1`;
    console.log('Raw result keys:', result[0] ? Object.keys(result[0]) : 'No rows');

    const columns = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'Village'
    `;
    console.log('Detailed columns:', columns.map(c => c.column_name));
  } catch (error) {
    console.error('Inspection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
