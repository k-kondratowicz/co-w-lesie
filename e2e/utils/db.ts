import { Client } from 'pg';

export const E2E_DATABASE_URL = process.env.E2E_DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:54322/cowlesie_e2e';

// Inside the Kraków square below, so the point is in a forest and inside the data coverage.
export const FOREST_SPOT = { latitude: 50.05, longitude: 19.95 };

const SQUARE_WKT = 'MULTIPOLYGON(((19.9 50.0, 20.0 50.0, 20.0 50.1, 19.9 50.1, 19.9 50.0)))';

async function withDb<T>(run: (db: Client) => Promise<T>): Promise<T> {
  const db = new Client({ connectionString: E2E_DATABASE_URL });
  await db.connect();

  try {
    return await run(db);
  } finally {
    await db.end();
  }
}

export function resetData() {
  return withDb((db) =>
    db.query(
      'TRUNCATE "ReportVote", "Report", "SavedArea", "PushSubscription", "BdlSync", "fire_hazard_zone", "forest_entry_ban", "forest_area" CASCADE',
    ),
  );
}

export function seedForest() {
  return withDb((db) => db.query('INSERT INTO "forest_area" ("geom") VALUES (ST_GeomFromText($1, 4326))', [SQUARE_WKT]));
}

export function seedFireZone(degree: 0 | 1 | 2 | 3) {
  return withDb((db) =>
    db.query(
      'INSERT INTO "fire_hazard_zone" ("id", "degree", "updated_at", "geom") VALUES ($1, $2, now(), ST_GeomFromText($3, 4326))',
      ['e2e', degree, SQUARE_WKT],
    ),
  );
}

export function seedBan() {
  return withDb((db) =>
    db.query(
      'INSERT INTO "forest_entry_ban" ("id", "reason", "until", "geom") VALUES ($1, $2, NULL, ST_GeomFromText($3, 4326))',
      ['e2e', 'zagrożenie pożarowe', SQUARE_WKT],
    ),
  );
}

export function markFireAndBansSynced() {
  return withDb((db) => db.query(`INSERT INTO "BdlSync" ("dataset", "syncedAt") VALUES ('fire', now()), ('bans', now())`));
}

export function countReports(type?: string): Promise<number> {
  return withDb(async (db) => {
    const { rows } = await db.query<{ count: number }>(
      'SELECT count(*)::int AS count FROM "Report" WHERE $1::text IS NULL OR "type"::text = $1',
      [type ?? null],
    );

    return rows[0].count;
  });
}
