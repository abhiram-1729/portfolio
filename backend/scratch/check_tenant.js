import prisma from '../utils/prisma.js';

async function check() {
  try {
    console.log('--- STARTING TENANT CHECK ---');
    const tenants = await prisma.tenant.findMany();
    console.log('Existing Tenants:', tenants.map(t => t.id));
    
    const exists = tenants.find(t => t.id === 'VK001');
    if (!exists) {
      console.log('MISSING VK001! Creating default organization...');
      await prisma.tenant.create({ 
        data: { 
          id: 'VK001', 
          name: 'VillagKart Default' 
        } 
      });
      console.log('Record created successfully.');
    } else {
      console.log('Default organization VK001 already exists.');
    }
    console.log('--- CHECK COMPLETE ---');
  } catch (err) {
    console.error('Check Error:', err.message);
  } finally {
    process.exit(0);
  }
}

check();
