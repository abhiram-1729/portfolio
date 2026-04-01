import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined');
    return;
  }

  const pool = new pg.Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('--- Testing Prisma Order Create ---');
  
  try {
    const data = {
      customerName: "Test Customer",
      mobile: "1234567890",
      totalAmount: 100.0,
      status: 'PENDING',
      agentId: "test-agent",
      // We use a dummy ID that doesn't exist just to test VALIDATION
      // Prisma validation should happen BEFORE it hits the database
      user: { connect: { id: "non-existent-user" } },
      items: {
        create: [
          {
            productId: "non-existent-product",
            quantity: 1,
            price: 100.0,
          }
        ]
      }
    };

    console.log('Sending data:', JSON.stringify(data, null, 2));
    
    // We expect this to fail with a database error (connect ID not found)
    // but NOT a validation error (unknown argument)
    await prisma.order.create({
      data,
      include: { items: true }
    });

  } catch (error) {
    if (error.name === 'PrismaClientValidationError') {
      console.error('\n❌ VALIDATION ERROR (Unknown argument):');
      console.error(error.message);
    } else {
      console.log('\n✅ VALIDATION PASSED (or other error):');
      console.error(error.message);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
