import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL.replace(':6543', ':5432').replace('pgbouncer=true', 'pgbouncer=false');

async function main() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting directly to database (bypassing pgbouncer)...');
    await client.connect();
    console.log('Connected.');

    console.log('Applying manual schema fixes via DIRECT connection...');

    await client.query('ALTER TABLE "Village" ADD COLUMN IF NOT EXISTS "boundary" JSONB;');
    console.log('Added Village.boundary');

    await client.query('ALTER TABLE "Village" ADD COLUMN IF NOT EXISTS "isPolygon" BOOLEAN DEFAULT FALSE;');
    console.log('Added Village.isPolygon');

    await client.query('ALTER TABLE "VillageActivity" ADD COLUMN IF NOT EXISTS "subLocation" TEXT;');
    console.log('Added VillageActivity.subLocation');

    await client.query('ALTER TABLE "LocationCheckIn" ADD COLUMN IF NOT EXISTS "subLocation" TEXT;');
    console.log('Added LocationCheckIn.subLocation');

    console.log('Manual schema fixes completed successfully.');

  } catch (error) {
    console.error('Error during manual schema fix:', error);
  } finally {
    await client.end();
  }
}

main();
