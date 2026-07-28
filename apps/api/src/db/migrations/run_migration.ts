import dotenv from 'dotenv';
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const file = process.argv[2];

if (!file) {
  console.error('❌ Please specify a migration file.');
  console.error(
    '   Usage: npm run migrate:file migrations/001_create_users.sql'
  );
  process.exit(1);
}

async function run(): Promise<void> {
  const client = new Client({
    connectionString: process.env.VERCEL_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log(`▶  Running: ${file}`);

    const sql = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf8');
    await client.query(sql);

    console.log(`✅ Done: ${file}`);
  } catch (err) {
    console.error('❌ Migration failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
