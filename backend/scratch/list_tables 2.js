import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

async function run() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log("Tables in Database:");
    console.log(res.rows.map(r => r.table_name).join(', '));
  } catch (error) {
    console.error("Error listing tables:", error);
  } finally {
    await pool.end();
  }
}

run();
