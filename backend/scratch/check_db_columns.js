import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  try {
    console.log('Checking LocationCheckIn columns...');
    const result = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'LocationCheckIn';");
    console.log('Columns in LocationCheckIn:', result.rows.map(r => r.column_name));

    console.log('Checking DailyCoverage columns...');
    const coverageResult = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'DailyCoverage';");
    console.log('Columns in DailyCoverage:', coverageResult.rows.map(r => r.column_name));
    
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

check();
