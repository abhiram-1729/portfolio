import prisma from './utils/prisma.js';

async function seedActivities() {
  try {
    console.log('🌱 Seeding test activity logs...');

    const tenants = await prisma.tenant.findMany({ take: 1 });
    if (tenants.length === 0) {
      console.log('❌ No tenants found. Please seed tenants first.');
      return;
    }
    const tenantId = tenants[0].id;

    const stores = await prisma.store.findMany({ where: { tenantId }, take: 1 });
    const storeId = stores.length > 0 ? stores[0].id : null;

    const users = await prisma.user.findMany({ where: { tenantId }, take: 2 });
    if (users.length === 0) {
      console.log('❌ No users found. Please seed users first.');
      return;
    }

    const adminUser = users.find(u => u.role === 'ADMIN' || u.role === 'TENANT_OWNER') || users[0];
    const agentUser = users.find(u => u.role === 'AGENT' || u.role === 'VGE' || u.role === 'DRIVER') || users[0];

    const testLogs = [
      {
        tenantId,
        storeId,
        userId: agentUser.id,
        action: 'EXPENSE_REQUESTED',
        details: 'Requested fuel expense of ₹500',
        metadata: { expenseId: 'exp_001', amount: 500 }
      },
      {
        tenantId,
        storeId,
        userId: agentUser.id,
        action: 'REFILL_REQUESTED',
        details: 'Requested stock refill for vehicle MH12-EF-5678. 15 items requested.',
        metadata: { vehicleId: 'veh_456', itemCount: 15 }
      },
      {
        tenantId,
        storeId,
        userId: adminUser.id,
        action: 'REFILL_APPROVED',
        details: 'Approved refill request for vehicle MH12-EF-5678.',
        metadata: { vehicleId: 'veh_456', requestId: 'req_789' }
      },
      {
        tenantId,
        storeId,
        userId: agentUser.id,
        action: 'CLOSING_CASH_SUBMITTED',
        details: 'Submitted Shift 1 closing cash. Actual: ₹4,500. Expected: ₹4,500. Diff: 0',
        metadata: { shift: 1, actual: 4500, expected: 4500 }
      },
      {
        tenantId,
        storeId,
        userId: adminUser.id,
        action: 'STOCK_AUDITED',
        details: 'Performed inventory audit for vehicle MH12-EF-5678. Variance found in 2 items.',
        metadata: { vehicleId: 'veh_456', variances: 2 }
      }
    ];

    for (const log of testLogs) {
      await prisma.activityLog.create({ data: log });
    }

    console.log('✅ Successfully seeded 5 test activity logs!');
  } catch (error) {
    console.error('❌ Seeding Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedActivities();
