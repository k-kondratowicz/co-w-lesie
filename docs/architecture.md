# Architecture

## Overview

"Co w lesie" answers two questions for a point in a Polish forest:

1. **What was reported here?** - community incident reports.
2. **Is it safe to go now?** - a risk assessment combining reports with the State Forests' (Lasy
   Państwowe / BDL) fire-hazard zones and entry bans.

It's a Next.js 16 App Router app backed by PostgreSQL + PostGIS, with a country-wide forest
layer served as vector tiles (PMTiles).

## Code layout

Feature-based: domain code lives under `src/features/<feature>/`, cross-cutting code under
`src/shared/`.

```
src/
  app/                     Next routes, API route handlers, metadata
    api/                   reports, risk, bans, context, cron/sync-bdl
  features/
    map/                   MapLibre map, layers, interaction
    reports/               create/list/vote, lifecycle, offline queue
    risk/                  pure risk engine + config (no I/O)
    safety/                "can I enter?" assistant UI
  shared/
    components/            UI (shadcn/ui), dialogs, forms
    hooks/                 geolocation, media query, online status
    lib/
      bdl/                 BDL sync (external I/O lives here)
      geo/                 spatial helpers + PostGIS queries
      prisma.ts            DB client (adapter-pg)
    store/                 Zustand stores
prisma/                    multi-file schema + SQL migrations
scripts/                   seed/sync/export CLIs (tsx)
docs/                      this documentation
```

## The pure-core rule

Domain logic - `features/risk` (the scoring engine) and `shared/lib/geo` math helpers - performs
**no I/O**: no `fetch`, no DB, not even `Date.now()`. It takes plain data and returns a result, so
it is deterministic and unit-tested. All I/O lives in `shared/lib/bdl`, `shared/lib/prisma`, and
the route handlers, which orchestrate but contain no business rules.

See [business-rules.md](./business-rules.md) for what the engine actually computes.

## Spatial data flow

```
External (BDL / Lasy Państwowe)            Our system                         Browser
─────────────────────────────────────────────────────────────────────────────────────
fire-hazard zones, entry bans  ──sync──►  PostGIS (forest_area, bans,    ──API──►  map + risk
forest compartments            (cron)     fire zones, reports)                     assessment
```

- **Users only ever query our local PostGIS.** External BDL services are touched **only** by the
  background sync (`/api/cron/sync-bdl`, `npm run sync:bdl`), never on a user request - so user
  latency and BDL availability are decoupled. See [ADR-0002](./adr/0002-local-postgis-query-model.md).
- The forest **layer** (polygons drawn on the map) is a static PMTiles file on R2; the forest
  **data** used for the "near a forest?" check is the `forest_area` table in PostGIS.

## Spatial conventions

- Everything internal is **EPSG:4326** (lng/lat, degrees). Variables are named `lng`/`lat`
  explicitly; GeoJSON coordinate order is `[lng, lat]`.
- Distances are in **meters**, computed via PostGIS `geography` (`ST_DWithin`, `ST_Distance`).
- BDL REST services are EPSG:2180 - pass `inSR=4326`/`outSR=4326` and let the server reproject;
  never reproject by hand.
- PostGIS geometry/geography columns are created via **raw SQL migrations** and queried with
  `prisma.$queryRaw` (parameterized). They don't need to be modeled in the Prisma schema. See
  the generated-column migration gotcha in [deployment.md](./deployment.md#database-migrations).

## Client state

- **Server/remote state:** TanStack Query, persisted to `localStorage` so the last-seen
  reports/bans render offline (see [ADR-0004](./adr/0004-offline-support.md)).
- **Local UI state:** Zustand stores (`use-location-store`, `use-map-pick-store`,
  `use-risk-overlay-store`, `use-offline-report-store`).
- **Forms:** TanStack Form with zod validators.
