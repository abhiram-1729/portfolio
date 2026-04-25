
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Attempting to connect to database...');
    await prisma.$connect();
    console.log('✅ Successfully connected to database!');
    const count = await prisma.user.count();
    console.log(`✅ Found ${count} users in the database.`);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
