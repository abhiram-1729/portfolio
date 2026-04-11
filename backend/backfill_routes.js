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
  console.log('🚀 Backfilling StoreId for Routes and Villages...');
  
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
      
      // Update Routes
      const routeResult = await prisma.route.updateMany({
        where: { tenantId: tenant.id, storeId: null },
        data: { storeId }
      });
      console.log(`✅ Updated ${routeResult.count} routes for tenant ${tenant.name} to store ${storeId}`);

      // Update Villages
      const villageResult = await prisma.village.updateMany({
        where: { tenantId: tenant.id, storeId: null },
        data: { storeId }
      });
      console.log(`✅ Updated ${villageResult.count} villages for tenant ${tenant.name} to store ${storeId}`);
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
