import 'dotenv/config';
import prisma from './prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const mobile = '6666666666';
  const password = '6666666666';
  const tenantCode = 'TEN002';
  const tenantName = 'Global Logistics';

  console.log(`🚀 Onboarding New Tenant: ${tenantName}...`);

  // 1. Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { code: tenantCode },
    update: {},
    create: {
      name: tenantName,
      code: tenantCode,
      status: 'ACTIVE',
      planName: 'PREMIUM'
    }
  });

  // 2. Hash Password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 3. Create Tenant Owner
  const user = await prisma.user.upsert({
    where: { mobile: mobile },
    update: {
      tenantId: tenant.id,
      role: 'TENANT_OWNER',
      password: hashedPassword
    },
    create: {
      name: 'Tenant Owner',
      email: 'owner@globallogistics.com',
      mobile: mobile,
      password: hashedPassword,
      role: 'TENANT_OWNER',
      tenantId: tenant.id
    }
  });

  // 4. Create default settings for this tenant
  await prisma.businessSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      businessName: tenantName,
      taxRates: '0,5,12,18'
    }
  });

  console.log('✅ Onboarding Complete!');
  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Login: ${mobile} / ${password}`);
}

main()
  .catch((e) => {
    console.error('❌ Onboarding Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
