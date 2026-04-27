import prisma from '../utils/prisma.js';

async function main() {
  try {
    console.log('Verifying Village query...');
    const villages = await prisma.village.findMany({
      take: 5
    });
    console.log('Successfully queried villages:', villages.length);
    console.log('First village:', villages[0] ? villages[0].name : 'No villages found');
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
