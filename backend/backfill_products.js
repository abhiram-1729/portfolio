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
  console.log('🚀 Backfilling StoreId for Products...');
  
  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    include: {
      stores: {
        take: 1,
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  for (const tenant of tenants) {
    if (tenant.stores.length > 0) {
      const storeId = tenant.stores[0].id;
      const count = await prisma.product.count({
        where: { tenantId: tenant.id, storeId: null }
      });

      if (count > 0) {
        const result = await prisma.product.updateMany({
          where: { tenantId: tenant.id, storeId: null },
          data: { storeId }
        });
        console.log(`✅ Updated ${result.count} products for tenant ${tenant.name} (${tenant.id}) to store ${storeId}`);
      } else {
        console.log(`ℹ️ No unassigned products for tenant ${tenant.name}`);
      }
    } else {
      console.warn(`⚠️ Tenant ${tenant.name} has no stores. Cannot backfill.`);
    }
  }

  console.log('✨ Backfill complete!');
}

main()
  .catch(err => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
