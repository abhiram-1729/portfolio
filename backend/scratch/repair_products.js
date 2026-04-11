import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🔧 Repairing Products with missing StoreId...');
  
  const tenants = await prisma.tenant.findMany({
    include: {
      stores: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  for (const tenant of tenants) {
    if (tenant.stores.length > 0) {
      // Find products for this tenant that have no storeId
      const orphanedProducts = await prisma.product.findMany({
        where: { tenantId: tenant.id, storeId: null }
      });

      if (orphanedProducts.length > 0) {
        // If there's only one store, it's easy. 
        // If there are multiple, we'll assign to the first one for now.
        const defaultStoreId = tenant.stores[0].id;
        
        const result = await prisma.product.updateMany({
          where: { tenantId: tenant.id, storeId: null },
          data: { storeId: defaultStoreId }
        });
        
        console.log(`✅ Fixed ${result.count} products for tenant ${tenant.name}. Assigned to store: ${defaultStoreId}`);
      }
    }
  }

  console.log('✨ Repair complete!');
}

main()
  .catch(err => {
    console.error('❌ Repair failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
