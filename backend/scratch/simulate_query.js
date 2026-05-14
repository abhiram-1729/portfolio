import prisma from '../utils/prisma.js';

async function simulateGetStores() {
  // Simulate a user like 'Abhiram'
  const user = {
    id: 'cmnd2ijlq0000pjznpy4ovpbr',
    role: 'SALES_AGENT',
    tenantId: 'VK001',
    storeId: 'cmntyd6a80000ooznlwpwffm5'
  };

  const isGlobal = 
      user.role === 'TENANT_OWNER' || 
      user.role === 'SUPER_ADMIN' || 
      (user.role === 'ADMIN' && !user.customRoleId) ||
      user.portalType === 'ADMIN';

  console.log('Is Global:', isGlobal);

  const where = {
      tenantId: user.tenantId
  };

  if (!isGlobal && user.storeId) {
      where.id = user.storeId;
  }

  console.log('Query Where:', JSON.stringify(where, null, 2));

  const stores = await prisma.store.findMany({
    where,
    include: {
      _count: {
        select: { users: true, vehicles: true }
      }
    }
  });

  console.log('Found Stores Count:', stores.length);
  console.log('Store Names:', stores.map(s => s.name));
  
  process.exit(0);
}

simulateGetStores();
