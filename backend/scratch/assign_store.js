import prisma from '../utils/prisma.js';

async function main() {
  console.log('Starting data assignment to VillagKart Store...');

  try {
    // 1. Find the main tenant (or just use "VK001" which is default)
    let tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      console.log('No tenant found. Creating default VK001 tenant.');
      tenant = await prisma.tenant.create({
        data: {
          id: 'VK001',
          name: 'VillagKart',
          subdomain: 'villagkart',
        }
      });
    }

    // 2. Find or Create the 'VillagKart' Store
    let store = await prisma.store.findFirst({
      where: {
        name: { contains: 'villagkart', mode: 'insensitive' }
      }
    });

    if (!store) {
      console.log('Store not found. Creating VillagKart Store...');
      store = await prisma.store.create({
        data: {
          name: 'VillagKart',
          code: 'VK-01',
          contactEmail: 'admin@villagkart.com',
          status: 'ACTIVE',
          tenantId: tenant.id
        }
      });
    } else {
      console.log(`Found existing store: ${store.name} (${store.id})`);
    }

    // 3. Assign all Users to this Store
    const updatedUsers = await prisma.user.updateMany({
      where: { storeId: null },
      data: { storeId: store.id }
    });
    console.log(`Assigned ${updatedUsers.count} unassigned Users to the Store.`);

    // 4. Assign all Vehicles to this Store
    const updatedVehicles = await prisma.vehicle.updateMany({
      where: { storeId: null },
      data: { storeId: store.id }
    });
    console.log(`Assigned ${updatedVehicles.count} unassigned Vehicles to the Store.`);

    console.log('✅ Allocation Complete!');
  } catch (error) {
    console.error('Error during assignment:', error);
  } finally {
    process.exit(0);
  }
}

main();
