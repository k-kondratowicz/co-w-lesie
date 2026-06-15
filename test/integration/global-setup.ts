import { execSync } from 'node:child_process';
import { Client } from 'pg';

const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/cowlesie_test';

// Runs once before the integration suite: ensures a dedicated test database exists and is migrated
// (PostGIS extension, generated geog column, all tables). Reused across runs — tests truncate rows.
export default async function setup() {
  const dbName = new URL(TEST_DATABASE_URL).pathname.slice(1);
  const adminUrl = new URL(TEST_DATABASE_URL);
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });

  try {
    await admin.connect();
  } catch (error) {
    throw new Error(
      `Integration tests need a reachable PostGIS instance at ${adminUrl.host} ` +
        `(start it with \`docker compose up -d\`). Original error: ${(error as Error).message}`,
    );
  }

  const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (existing.rowCount === 0) {
    await admin.query(`CREATE DATABASE "${dbName}"`);
  }

  await admin.end();

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
