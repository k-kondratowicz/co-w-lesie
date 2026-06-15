# 0002 - Local-PostGIS-only query model

**Status:** accepted

## Context

The hazard data (fire-hazard zones, entry bans, forest compartments) comes from BDL / Lasy
Państwowe REST services. We could query those services live on each user request, or import the
data and query our own database.

## Decision

**Users only ever query our local PostGIS.** External BDL services are touched **only** by a
background sync job (`/api/cron/sync-bdl`, `npm run sync:bdl`), never on a user request.

## Consequences

- User-facing latency and reliability are decoupled from BDL uptime and rate limits.
- Spatial queries (`ST_DWithin`, `ST_Intersects`, `ST_Distance` over `geography`, GIST indexes)
  run locally and fast.
- Freshness depends on sync cadence, so every assessment shows a per-signal freshness timestamp
  (see [business-rules.md](../business-rules.md#freshness)).
- BDL is EPSG:2180; we request/store as EPSG:4326 and let the server reproject (`inSR/outSR=4326`).
- BDL field shapes can change without notice, so all synced data is validated with zod.
