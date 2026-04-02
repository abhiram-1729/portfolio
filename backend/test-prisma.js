import prisma from './utils/prisma.js';

async function main() {
  console.log('Testing Prisma connection...');
  try {
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    const vehicleCount = await prisma.vehicle.count();
    console.log('Vehicle count:', vehicleCount);
    
    console.log('Prisma test SUCCESS');
  } catch (err) {
    console.error('Prisma test FAILED:', err);
  } finally {
    process.exit(0);
  }
}

main();
