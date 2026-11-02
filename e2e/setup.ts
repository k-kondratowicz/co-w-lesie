import { execSync } from 'node:child_process';
import { Client } from 'pg';
import { E2E_DATABASE_URL } from './utils/db';

// Same shape as test/integration/global-setup.ts
export default async function setup() {
  const dbName = new URL(E2E_DATABASE_URL).pathname.slice(1);
  const adminUrl = new URL(E2E_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });
  try {
    await admin.connect();
  } catch (error) {
    console.error('Failed to connect to the admin database:', error);
    throw error;
  }

  const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }

  await admin.end();

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
    },
  });
}
