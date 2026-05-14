/**
 * VSMS Migration Runner
 * 
 * Since Supabase's PgBouncer transaction pooler (port 6543) is the only reachable
 * endpoint and Prisma's migration engine can't work through it, this script handles
 * the full migration workflow:
 * 
 * Usage:
 *   node scratch/migrate.js                    # Check status
 *   node scratch/migrate.js create <name>      # Create a new migration from schema changes
 *   node scratch/migrate.js apply              # Apply pending migrations
 *   node scratch/migrate.js apply <name>       # Apply a specific migration
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import dotenv from 'dotenv';
dotenv.config();

const { Client } = pg;
const MIGRATIONS_DIR = path.join(process.cwd(), 'prisma', 'migrations');

async function getClient() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

async function ensureMigrationsTable(client) {
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
}

async function getAppliedMigrations(client) {
  await ensureMigrationsTable(client);
  const result = await client.query(
    `SELECT "migration_name", "finished_at" FROM "_prisma_migrations" WHERE "rolled_back_at" IS NULL ORDER BY "started_at"`
  );
  return result.rows;
}

function getLocalMigrations() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs.readdirSync(MIGRATIONS_DIR)
    .filter(d => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
    .filter(d => fs.existsSync(path.join(MIGRATIONS_DIR, d, 'migration.sql')))
    .sort();
}

// ─── STATUS ──────────────────────────────────────────────
async function status() {
  const client = await getClient();
  try {
    const applied = await getAppliedMigrations(client);
    const local = getLocalMigrations();

    console.log('\n📋 Migration Status\n');
    console.log('Local migrations:');
    local.forEach(m => {
      const isApplied = applied.some(a => a.migration_name === m);
      const icon = isApplied ? '✅' : '⏳';
      const appliedAt = applied.find(a => a.migration_name === m)?.finished_at;
      console.log(`  ${icon} ${m}${appliedAt ? ` (applied: ${new Date(appliedAt).toLocaleString()})` : ' [PENDING]'}`);
    });

    const pending = local.filter(m => !applied.some(a => a.migration_name === m));
    if (pending.length > 0) {
      console.log(`\n⚠️  ${pending.length} pending migration(s). Run: node scratch/migrate.js apply`);
    } else {
      console.log('\n✅ All migrations are up to date!');
    }

    // Check for remote-only migrations
    const remoteOnly = applied.filter(a => !local.includes(a.migration_name));
    if (remoteOnly.length > 0) {
      console.log('\n⚠️  Remote-only migrations (not in local directory):');
      remoteOnly.forEach(r => console.log(`   - ${r.migration_name}`));
    }
  } finally {
    await client.end();
  }
}

// ─── CREATE ──────────────────────────────────────────────
const SNAPSHOT_PATH = path.join(MIGRATIONS_DIR, 'schema_snapshot.prisma');

async function create(name) {
  if (!name) {
    console.error('❌ Please provide a migration name: node scratch/migrate.js create <name>');
    process.exit(1);
  }

  const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');

  // Ensure snapshot exists
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    console.error('❌ No schema snapshot found. Creating one from current schema...');
    fs.copyFileSync(schemaPath, SNAPSHOT_PATH);
    console.log('✅ Snapshot created. Make your schema changes, then run this command again.');
    return;
  }

  // Generate timestamp
  const now = new Date();
  const timestamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 14);
  const migrationName = `${timestamp}_${name}`;
  const migrationDir = path.join(MIGRATIONS_DIR, migrationName);

  // Generate diff SQL (offline - no DB connection needed)
  // Compares the last-known schema snapshot to the current schema file
  console.log('🔍 Generating migration SQL from schema diff...');
  
  try {
    const sql = execSync(
      `npx prisma migrate diff --from-schema=${SNAPSHOT_PATH} --to-schema=${schemaPath} --script`,
      { encoding: 'utf-8', cwd: process.cwd() }
    );

    if (!sql.trim() || sql.trim() === '-- This is an empty migration.') {
      console.log('✅ No schema changes detected. Nothing to migrate.');
      return;
    }

    // Create migration directory and write SQL
    fs.mkdirSync(migrationDir, { recursive: true });
    fs.writeFileSync(path.join(migrationDir, 'migration.sql'), sql);

    // Update snapshot to current schema
    fs.copyFileSync(schemaPath, SNAPSHOT_PATH);

    console.log(`\n✅ Migration created: ${migrationName}`);
    console.log(`   📁 ${migrationDir}/migration.sql`);
    console.log(`\n📝 Generated SQL:\n`);
    console.log(sql);
    console.log(`\nTo apply: node scratch/migrate.js apply`);
  } catch (err) {
    console.error('❌ Failed to generate migration:', err.message);
    process.exit(1);
  }
}

// ─── APPLY ───────────────────────────────────────────────
async function apply(specificName) {
  const client = await getClient();
  try {
    const applied = await getAppliedMigrations(client);
    const local = getLocalMigrations();
    
    let pending;
    if (specificName) {
      const actualName = specificName.replace('--force', '').trim();
      if (!specificName.includes('--force') && applied.some(a => a.migration_name === actualName)) {
        console.log(`✅ Migration "${actualName}" is already applied. Pass --force to re-apply.`);
        return;
      }
      if (!local.includes(actualName)) {
        console.error(`❌ Migration "${actualName}" not found locally.`);
        process.exit(1);
      }
      pending = [actualName];
    } else {
      pending = local.filter(m => !applied.some(a => a.migration_name === m));
    }

    if (pending.length === 0) {
      console.log('✅ All migrations are already applied!');
      return;
    }

    console.log(`\n🚀 Applying ${pending.length} migration(s)...\n`);

    for (const migration of pending) {
      const sqlPath = path.join(MIGRATIONS_DIR, migration, 'migration.sql');
      const sql = fs.readFileSync(sqlPath, 'utf-8');

      console.log(`  ⏳ Applying: ${migration}...`);

      try {
        await client.query('BEGIN');
        
        // Strip SQL comment lines before splitting
        const cleanedSql = sql
          .split('\n')
          .filter(line => !line.trim().startsWith('--'))
          .join('\n');

        const statements = cleanedSql
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0);

        for (const stmt of statements) {
          try {
            await client.query(stmt);
          } catch (stmtErr) {
            // Skip "already exists" errors for idempotency
            if (stmtErr.message.includes('already exists') || 
                stmtErr.message.includes('duplicate key')) {
              console.log(`     ⚠️  Skipped (already exists): ${stmt.slice(0, 80)}...`);
            } else {
              throw stmtErr;
            }
          }
        }

        // Record in migration history
        const migrationId = crypto.randomUUID();
        const checksum = Buffer.from(sql).toString('base64').slice(0, 64);
        await client.query(`
          INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "applied_steps_count", "started_at")
          VALUES ($1, $2, NOW(), $3, 1, NOW())
        `, [migrationId, checksum, migration]);

        await client.query('COMMIT');
        console.log(`  ✅ Applied: ${migration}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed: ${migration}`);
        console.error(`     Error: ${err.message}`);
        process.exit(1);
      }
    }

    console.log('\n🎉 All migrations applied successfully!');
    
    // Regenerate Prisma Client
    console.log('\n🔄 Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit', cwd: process.cwd() });
    
  } finally {
    await client.end();
  }
}

// ─── MAIN ────────────────────────────────────────────────
const [,, command, ...args] = process.argv;

switch (command) {
  case 'create':
    create(args[0]);
    break;
  case 'apply':
    apply(args.join(' '));
    break;
  case 'status':
  default:
    status();
    break;
}
