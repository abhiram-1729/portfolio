import prisma from './prisma.js';

async function main() {
  console.log('🚀 Seeding Initial Tenant...');

  // 1. Create Default Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: 'VK001' },
    update: {},
    create: {
      id: 'VK001', // Explicit ID to match the defaults we set
      name: 'VillagKart',
      code: 'VK001',
      status: 'ACTIVE',
      planName: 'FREE'
    }
  });

  console.log(`✅ Tenant Created/Verified: ${tenant.name} (${tenant.code})`);

  // 2. Since we added @default("VK001") to all models, 
  // and db push was run, Postgres should have already populated 
  // existing records with "VK001".
  
  // However, we should ensure BusinessSettings and IncentiveConfig 
  // are created for this tenant if they don't exist, as they were singletons.
  
  const settings = await prisma.businessSettings.findFirst({
    where: { tenantId: tenant.id }
  });
  
  if (!settings) {
    await prisma.businessSettings.create({
      data: {
        tenantId: tenant.id,
        businessName: 'VillagKart',
        taxRates: '0,5,12,18'
      }
    });
    console.log('✅ Default BusinessSettings created for VK001');
  }

  const incentivConfig = await prisma.vgeIncentiveConfig.findFirst({
    where: { tenantId: tenant.id }
  });

  if (!incentivConfig) {
    await prisma.vgeIncentiveConfig.create({
      data: {
        tenantId: tenant.id,
        minSalesThreshold: 10000,
        minRegThreshold: 5
      }
    });
    console.log('✅ Default VgeIncentiveConfig created for VK001');
  }

  console.log('✨ Seed Complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
