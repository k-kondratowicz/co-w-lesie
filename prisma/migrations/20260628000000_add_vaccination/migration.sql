-- PostGIS spatial tables. Hand-written: Prisma cannot author geometry types or GIST indexes.
-- Mirrored in prisma/vaccination.prisma as Unsupported(...) + @@ignore only to prevent migrate
-- drift; never accessed via Prisma CRUD, only via $queryRaw.

-- Voivodeship boundaries (GUS PRG, EPSG:2180 reprojected to 4326 on import). STATIC reference
-- geometry: seeded once by scripts/seed-voivodeships.ts, never synced - administrative borders
-- effectively never change. Used only for a point-in-voivodeship lookup, not rendered as a layer.
CREATE TABLE "voivodeship" (
  "teryt" text PRIMARY KEY,
  "name"  text NOT NULL UNIQUE,
  "geom"  geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX "voivodeship_geom_idx" ON "voivodeship" USING GIST ("geom");

-- Fox oral-rabies-vaccine baiting campaigns scraped from lisy.info (per voivodeship, per date
-- range). Filled by the monthly background sync (truncate+insert), read via $queryRaw. The page
-- publishes voivodeship names only - no finer area - so the unit is the whole voivodeship. The
-- "active" window the user sees is [start_date - 14d, end_date + 14d], computed at read time.
CREATE TABLE "vaccination_campaign" (
  "id"          text PRIMARY KEY,
  "year"        integer NOT NULL,
  "start_date"  date NOT NULL,
  "end_date"    date NOT NULL,
  "voivodeship" text NOT NULL REFERENCES "voivodeship"("name"),
  "source"      text NOT NULL,
  "fetched_at"  timestamptz NOT NULL
);
CREATE INDEX "vaccination_campaign_voivodeship_idx" ON "vaccination_campaign" ("voivodeship");
CREATE INDEX "vaccination_campaign_dates_idx" ON "vaccination_campaign" ("start_date", "end_date");
