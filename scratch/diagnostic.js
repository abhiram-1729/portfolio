import prisma from '../backend/utils/prisma.js';
import { tenantContext } from '../backend/utils/tenantContext.js';

async function runDiagnostic() {
  console.log('--- System Diagnostic ---');
  
  try {
    // Fetch first tenant to set context
    const firstTenant = await prisma.tenant.findFirst();
    if (!firstTenant) {
      console.log('No tenants found.');
      return;
    }
    console.log(`Using Tenant: ${firstTenant.name} (${firstTenant.id})`);

    await tenantContext.run({ tenantId: firstTenant.id }, async () => {
      // 1. Check Order fields
      const orderModel = await prisma.order.findFirst();
      if (orderModel) {
        console.log('Order Fields:', Object.keys(orderModel));
      } else {
        console.log('No orders found for this tenant.');
      }

      // 2. Check BusinessSettings
      const settings = await prisma.businessSettings.findMany();
      console.log(`Settings entries: ${settings.length}`);
      settings.forEach(s => {
        console.log(`Store: ${s.storeId || 'GLOBAL'}, Slabs: ${s.deliverySlabs ? 'PRESENT' : 'MISSING'}`);
      });

      // 3. Check Village radius usage
      const villages = await prisma.village.findMany({ take: 5 });
      villages.forEach(v => {
        console.log(`Village: ${v.name}, Radius: ${v.radius}m`);
      });
    });

  } catch (err) {
    console.error('Diagnostic error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostic();
