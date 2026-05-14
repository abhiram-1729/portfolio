const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const sqlPath = path.join(__dirname, 'prisma', 'migrations', '20260513115400_add_promotions_manual', 'migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Basic SQL parser for multiple statements
  // Note: This is naive and won't handle complex strings with semicolons
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  
  console.log(`Executing ${statements.length} statements...`);
  
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log('Success:', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.warn('Skipping (already exists):', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
      } else {
        console.error('Error executing statement:', statement.substring(0, 50).replace(/\n/g, ' ') + '...');
        console.error(error.message);
      }
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
