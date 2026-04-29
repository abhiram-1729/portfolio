import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function checkAndFix() {
  try {
    const tables = {
      'LocationCheckIn': ['subLocation'],
      'LocationLog': ['subLocation'],
      'Village': ['boundary', 'isPolygon'],
      'VillageActivity': ['subLocation'],
      'BusinessSettings': ['shifts', 'shiftMode'],
      'DailyCoverage': ['shiftStatus']
    };

    for (const [table, columns] of Object.entries(tables)) {
      console.log(`Checking table: ${table}`);
      const res = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${table}'`);
      const existingColumns = res.rows.map(r => r.column_name);
      
      for (const col of columns) {
        if (!existingColumns.includes(col)) {
          console.log(`Adding column ${col} to ${table}...`);
          let type = 'TEXT';
          if (['boundary', 'shifts', 'shiftStatus'].includes(col)) type = 'JSONB';
          if (col === 'isPolygon') type = 'BOOLEAN DEFAULT false';
          if (col === 'shiftMode') type = "TEXT DEFAULT 'STANDARD'";

          await pool.query(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type}`);
        } else {
          console.log(`Column ${col} already exists in ${table}.`);
        }
      }
    }

    console.log('Database columns synchronized.');
    await pool.end();
  } catch (error) {
    console.error('Error synchronizing database:', error);
    process.exit(1);
  }
}

checkAndFix();
