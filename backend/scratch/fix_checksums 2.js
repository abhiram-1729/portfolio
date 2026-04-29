// This script updates the Prisma migration checksums in the database
// to match the locally modified migration files.
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const baseline = readFileSync('./prisma/migrations/20260424_baseline/migration.sql');
  const contactphone = readFileSync('./prisma/migrations/20260424083051_contactphone_required/migration.sql');

  const hash1 = createHash('sha256').update(baseline).digest('hex');
  const hash2 = createHash('sha256').update(contactphone).digest('hex');

  console.log('Updating checksum for 20260424_baseline:', hash1);
  await pool.query(
    `UPDATE "_prisma_migrations" SET checksum = $1, logs = NULL, rolled_back_at = NULL WHERE migration_name = $2`,
    [hash1, '20260424_baseline']
  );

  console.log('Updating checksum for 20260424083051_contactphone_required:', hash2);
  await pool.query(
    `UPDATE "_prisma_migrations" SET checksum = $1, logs = NULL, rolled_back_at = NULL WHERE migration_name = $2`,
    [hash2, '20260424083051_contactphone_required']
  );

  console.log('✅ Checksums updated. You can now run: npx prisma migrate dev --name init');
  await pool.end();
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
