-- PostGIS spatial table. Hand-written: Prisma cannot author geometry types or GIST indexes.
-- Mirrored in prisma/kmzb.prisma as Unsupported(...) + @@ignore only to prevent migrate drift;
-- never accessed via Prisma CRUD, only via $queryRaw. Filled by the background KMZB sync.

-- KMZB (Krajowa Mapa Zagrozen Bezpieczenstwa) police incidents, pre-filtered to near-forest on
-- import. Points (EPSG:4326). Truncate+insert each sync, so the table mirrors KMZB's current set.
CREATE TABLE "kmzb_report" (
  "id"         text PRIMARY KEY,
  "type"       text NOT NULL,
  "status"     text NOT NULL,
  "teryt"      text,
  "event_at"   timestamptz,
  "created_at" timestamptz NOT NULL,
  "geom"       geometry(Point, 4326) NOT NULL
);
CREATE INDEX "kmzb_report_geom_idx" ON "kmzb_report" USING GIST ("geom");
