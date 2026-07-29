-- PostGIS spatial tables. Hand-written: Prisma cannot author geometry types or GIST indexes.
-- Mirrored in prisma/tourism.prisma as Unsupported(...) + @@ignore only to prevent migrate drift;
-- never accessed via Prisma CRUD, only via $queryRaw.

-- Tourist point objects from the BDL "mapa turystyczna" service (forest parking, vehicle stops,
-- camping spots). Convenience layers, not a safety signal: an object missing here means "we do not
-- know", never "not allowed". Filled by the background sync (truncate+insert), so the table always
-- mirrors what BDL currently publishes. `kind` is our own code (see shared/lib/tourism/mappers.ts),
-- not BDL's Polish free-text description, so the map filter is stable if BDL rewords a label.
CREATE TABLE "tourism_poi" (
  "id"   text PRIMARY KEY,
  "kind" text NOT NULL,
  "name" text,
  "geom" geometry(Point, 4326) NOT NULL
);
CREATE INDEX "tourism_poi_kind_idx" ON "tourism_poi" ("kind");
CREATE INDEX "tourism_poi_geom_idx" ON "tourism_poi" USING GIST ("geom");

-- Areas of the Lasy Panstwowe "Zanocuj w lesie" programme (where dispersed overnight stays are
-- allowed). Polygons, ~1200 nationwide.
CREATE TABLE "overnight_zone" (
  "id"   text PRIMARY KEY,
  "name" text,
  "geom" geometry(MultiPolygon, 4326) NOT NULL
);
CREATE INDEX "overnight_zone_geom_idx" ON "overnight_zone" USING GIST ("geom");
