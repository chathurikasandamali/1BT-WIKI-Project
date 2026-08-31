// apps/api/src/db.ts

import { Pool } from 'pg';
import 'dotenv/config';

// In test environment, skip real DB connection
// jest.mock() will replace this module entirely in tests
const isTest = process.env.NODE_ENV === 'test';

if (!process.env.VERCEL_DATABASE_URL && !isTest) {
  throw new Error('VERCEL_DATABASE_URL environment variable is not set');
}

export const pool = new Pool(
  isTest
    ? {} // dummy config — will be replaced by jest.mock()
    : {
        connectionString: process.env.VERCEL_DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        ssl: { rejectUnauthorized: false },
      }
);

pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Database pool error:', err);
  process.exit(1);
});

export default pool;
