import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    const columns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'BusinessSettings'
    `;
    console.log('BusinessSettings Columns:', JSON.stringify(columns, null, 2));

    const coverageColumns = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'DailyCoverage'
    `;
    console.log('DailyCoverage Columns:', JSON.stringify(coverageColumns, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
