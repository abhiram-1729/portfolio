import prisma from '../utils/prisma.js';

async function repair() {
  try {
    console.log('--- DATA REPAIR STARTED ---');
    
    // Use raw query to bypass Prisma Client validation for NULLs in non-nullable fields
    console.log('--- REPAIRING vgeType ---');
    const vgeCount = await prisma.$executeRaw`UPDATE "User" SET "vgeType" = 'EMPLOYEE' WHERE "vgeType" IS NULL`;
    console.log(`Fixed ${vgeCount} users with NULL vgeType.`);

    console.log('--- REPAIRING tenantId ---');
    const tenantCount = await prisma.$executeRaw`UPDATE "User" SET "tenantId" = 'VK001' WHERE "tenantId" IS NULL OR "tenantId" = ''`;
    console.log(`Fixed ${tenantCount} users with missing tenantId.`);

    console.log('--- REPAIR COMPLETE ---');
  } catch (err) {
    console.error('Repair Error:', err.message);
  } finally {
    process.exit(0);
  }
}

repair();
