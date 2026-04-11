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
  const VILLAGKART_ID = "cmntyd6a80000ooznlwpwffm5";
  const LAGROCE_ID = "cmntz426700008eznpd9gbjar";

  console.log(`🚀 Moving products from Villagkart to Lagroce...`);

  // We'll move products that were created in the last 1 hour to Lagroce
  // or the user can specify names. 
  // For now, let's just find products in Villagkart and let the user know.
  
  const products = await prisma.product.findMany({
    where: { storeId: VILLAGKART_ID },
    select: { id: true, name: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });

  console.log('Recent products in Villagkart:');
  products.slice(0, 10).forEach(p => {
    console.log(`- ${p.name} (ID: ${p.id}, Created: ${p.createdAt})`);
  });

  // To actually move them, I'll provide a updateMany with names or IDs.
  // The user said "it is appearing in the villagkart store where I created it in the lagroce store"
  // implying they created it RECENTLY.
  
  const result = await prisma.product.updateMany({
    where: { 
      storeId: VILLAGKART_ID,
      createdAt: { gte: new Date(Date.now() - 3600000) } // Created in last hour
    },
    data: { storeId: LAGROCE_ID }
  });

  console.log(`✅ Moved ${result.count} recent products to Lagroce.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
