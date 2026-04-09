import prisma from './utils/prisma.js';
import { tenantContext } from './utils/tenantContext.js';

async function test() {
  const tenantId = 'VK001'; // Default tenant
  
  try {
    await tenantContext.run({ tenantId }, async () => {
      console.log('--- Testing Create Item ---');
      const itemData = {
        name: 'Test Product ' + Date.now(),
        price: 100,
        status: 'ACTIVE',
        // These relations are required in schema
        category: {
            connectOrCreate: {
                where: { tenantId_name: { tenantId, name: 'Uncategorized' } },
                create: { name: 'Uncategorized', tenantId }
            }
        },
        subCategory: {
            create: { name: 'Uncategorized', tenantId }
        },
        brand: {
            connectOrCreate: {
                where: { tenantId_name: { tenantId, name: 'Unbranded' } },
                create: { name: 'Unbranded', tenantId }
            }
        }
      };

      const item = await prisma.product.create({
        data: itemData
      });
      console.log('✅ Success:', item.id);
    });
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

test();
