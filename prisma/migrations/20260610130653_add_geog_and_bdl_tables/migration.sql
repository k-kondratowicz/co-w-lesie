-- PostGIS spatial objects. Hand-written: Prisma cannot author generated columns,
-- geometry types, or GIST indexes. These tables/columns are mirrored in the Prisma
-- schema as Unsupported(...) + @@ignore only to prevent migrate drift; they are
-- never accessed via Prisma CRUD, only via $queryRaw.

-- Report: generated geography point from lng/lat (EPSG:4326), used for radius queries.
ALTER TABLE "Report"
  ADD COLUMN "geog" geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography) STORED;

CREATE INDEX "report_geog_idx" ON "Report" USING GIST ("geog");

-- Fire-hazard zones (small; synced from BDL a few times a day).
CREATE TABLE "fire_hazard_zone" (
  "id"         text PRIMARY KEY,
  "degree"     smallint NOT NULL,
  "updated_at" timestamptz NOT NULL,
  "geom"       geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX "fire_hazard_geom_idx" ON "fire_hazard_zone" USING GIST ("geom");

-- Forest entry bans (small; changes rarely).
CREATE TABLE "forest_entry_ban" (
  "id"     text PRIMARY KEY,
  "reason" text,
  "until"  timestamptz,
  "geom"   geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX "forest_entry_ban_geom_idx" ON "forest_entry_ban" USING GIST ("geom");

-- Forest areas for in-forest detection (large; seeded from the Małopolska source).
CREATE TABLE "forest_area" (
  "id"   bigserial PRIMARY KEY,
  "geom" geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX "forest_area_geom_idx" ON "forest_area" USING GIST ("geom");
