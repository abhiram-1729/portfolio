import prisma from '../utils/prisma.js';

async function checkStores() {
  try {
    const stores = await prisma.store.findMany({
      include: {
        _count: {
          select: { users: true, vehicles: true }
        }
      }
    });
    console.log('Stores in DB:', JSON.stringify(stores, null, 2));
    
    const tenants = await prisma.tenant.findMany();
    console.log('Tenants in DB:', JSON.stringify(tenants, null, 2));
    
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, tenantId: true, storeId: true }
    });
    console.log('Users in DB:', JSON.stringify(users, null, 2));

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

checkStores();
