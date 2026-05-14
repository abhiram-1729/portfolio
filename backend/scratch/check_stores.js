import prisma from '../utils/prisma.js';

async function checkStores() {
  const stores = await prisma.store.findMany({
    orderBy: { createdAt: 'desc' }
  });
  console.log('--- ALL STORES ---');
  stores.forEach(s => {
    console.log(`ID: ${s.id} | Name: ${s.name} | Tenant: ${s.tenantId} | Code: ${s.code} | State: ${s.stateCode} | Hub: ${s.hubCode}`);
  });
  process.exit(0);
}

checkStores();
