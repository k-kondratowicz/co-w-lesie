# Architecture

## Overview

"Co w lesie" answers two questions for a point in a Polish forest:

1. **What was reported here?** - community incident reports.
2. **Is it safe to go now?** - a risk assessment combining reports with the State Forests' (Lasy
   Państwowe / BDL) fire-hazard zones and entry bans.

It's a Next.js 16 App Router app backed by PostgreSQL + PostGIS, with a country-wide forest
layer served as vector tiles (PMTiles).

## Code layout

Feature-based, in layers that import **downward only**:
`app -> features/* -> features/core -> shared`. A feature never imports a sibling feature;
shared domain drops to `features/core`, and composition of two features rises to the `app` route
layer. `features/core` holds domain reused by several features; `shared` holds infrastructure with
no domain. The rules are enforced by `npm run lint:arch` (dependency-cruiser). See
[ADR-0006](./adr/0006-feature-based-structure.md).

```
src/
  app/                     Next routes + API handlers; also the composition layer
    api/                   reports, risk, bans, context, cron/*
  features/
    core/                  domain reused across features (imported via index.ts)
      risk/                pure engine + config + assessment DTO/api/query (no I/O in the engine)
      report/              report types, schema (incl locationSchema), api, popup contract + store
      saved-area/          SavedArea type, schema, api, is-duplicate, useSavedAreas
    map/                   MapLibre map, layers, interaction
    reports/               create/list/vote UI, lifecycle, offline queue, repos
    saved-areas/           saved-areas UI (list, sheet) + statuses hook + repo
    safety/                "can I enter?" assistant UI
    push/                  web-push subscribe/notify UI
  shared/
    components/            UI (shadcn/ui), dialogs, forms
    hooks/                 geolocation, media query, online status
    lib/
      bdl/, kmzb/          external sync (I/O) - slated to move to features/core (R6)
      geo/                 spatial math + PostGIS queries
      api/fetch.ts         typed fetch + ApiError (slice apis live on each slice)
      prisma.ts            DB client (adapter-pg)
    store/                 Zustand stores (cross-feature coordination channels)
prisma/                    multi-file schema + SQL migrations
scripts/                   seed/sync/export CLIs (tsx)
docs/                      this documentation
```

## The pure-core rule

Domain logic - `features/core/risk` (the scoring engine) and `shared/lib/geo` math helpers -
performs **no I/O**: no `fetch`, no DB, not even `Date.now()`. It takes plain data and returns a
result, so it is deterministic and unit-tested. All I/O lives in `shared/lib/bdl`,
`shared/lib/prisma`, the feature repos (`*/queries`), and the route handlers, which orchestrate but
contain no business rules.

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
