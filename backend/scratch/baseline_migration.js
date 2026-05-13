import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;

async function baselineMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Ensure _prisma_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL PRIMARY KEY,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMPTZ,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0
      );
    `);
    console.log('✅ _prisma_migrations table ensured');

    // 2. Clear any old migration records that don't match our local history
    await client.query(`DELETE FROM "_prisma_migrations"`);
    console.log('✅ Cleared old migration history');

    // 3. Insert our baseline migration as "already applied"
    const migrationId = crypto.randomUUID();
    await client.query(`
      INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count", "started_at")
      VALUES ($1, $2, NOW(), '0_init', 1, NOW())
    `, [migrationId, 'baseline-checksum-' + Date.now()]);
    console.log('✅ Baseline migration "0_init" marked as applied');

    // 4. Verify
    const result = await client.query(`SELECT * FROM "_prisma_migrations"`);
    console.log('\n📋 Current migration history:');
    result.rows.forEach(r => {
      console.log(`   - ${r.migration_name} (applied at: ${r.finished_at})`);
    });

    console.log('\n🎉 Done! Your migration history is now baselined.');
    console.log('   Future schema changes can be tracked with:');
    console.log('   npx prisma migrate diff --from-schema=<old> --to-schema=<new> --script');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

baselineMigration();
