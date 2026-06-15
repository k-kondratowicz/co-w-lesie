# Deployment & operations

## Topology

| Concern | Service |
|---|---|
| App (Next.js) | Vercel |
| Database (PostgreSQL + PostGIS) | Neon |
| Forest tiles (PMTiles, ~200 MB) | Cloudflare R2 |
| Scheduled BDL sync | GitHub Actions → `/api/cron/sync-bdl` |
| Error monitoring | Sentry (events tunneled via `/monitoring`) |
| Analytics | Vercel Analytics + Speed Insights |

Canonical domain: **https://www.co-w-lesie.pl** (non-www and `cowlesie.pl` redirect to it), set
via `NEXT_PUBLIC_SITE_URL`.

## Environment variables

See the table in the [README](../README.md#environment-variables). On Vercel, the app uses the
Neon **pooled** connection string; migrations use the **direct** (non-`-pooler`) one.

## Database migrations

Apply with **`migrate deploy`** and the **direct** Neon URL:

```bash
DATABASE_URL="<NEON_DIRECT_URL>" npx prisma migrate deploy
```

Run migrations against prod **before** pushing code that reads the new columns.

### Why not `migrate dev` / `migrate reset`

- A prior migration's checksum has drifted, so `migrate dev` wants to **reset** - which would
  wipe the ~455k-row `forest_area` seed in local Postgres. Never reset.
- For a new migration, **hand-write** `migration.sql` and `migrate deploy` it.

### Generated-column gotcha (PostGIS)

Prisma can't model the generated `Report.geog` column, so `migrate dev` emits a spurious
`ALTER COLUMN "geog" DROP DEFAULT` (fails - it's `GENERATED`) plus a `report_geog_idx` rename.
Hand-writing the SQL sidesteps this. If you must use `migrate dev`, delete those statements from
the generated file, then `migrate resolve --rolled-back <name>` and `migrate deploy`. Also drop
scratch tables (e.g. `forest_dissolved`, rebuildable via `npm run dissolve:forest`) first so they
aren't flagged as drift.

### After migrating locally

Restart the dev server - it caches the previously generated Prisma client, so new models (e.g.
`ReportVote`) error until restart. Production is unaffected (each build runs `prisma generate`).

## Scheduled BDL sync (cron)

GitHub Actions ([`.github/workflows/sync-bdl.yml`](../.github/workflows/sync-bdl.yml)) calls the
deployed endpoint with `Authorization: Bearer $CRON_SECRET`. Chosen over Vercel Cron (Hobby =
daily only) - see [ADR-0003](./adr/0003-github-actions-cron.md).

- **Fire-hazard zones:** hourly 06:00–16:00 UTC. BDL publishes ~09:00 & ~13:00 Polish time (more
  often in extreme conditions); the window covers both across CET/CEST plus intra-day updates.
- **Entry bans:** daily 03:30 UTC.
- Scheduled runs are **best-effort** (can be minutes late). Use the workflow's manual
  **Run workflow** button for an immediate sync.

Required GitHub repo settings: secret `CRON_SECRET` (matching Vercel), variable `APP_URL`.

## First-time production setup

1. Provision Neon (PostGIS available); grab the pooled + direct URLs.
2. `migrate deploy` (direct URL) to create the schema.
3. Seed `forest_area` - either copy from local with `pg_dump --data-only --table=forest_area`
   piped into prod, or `npm run seed:forest` against prod.
4. Upload the forest PMTiles to R2; set its CORS to allow `GET` + `Range` from the app origin.
5. Set Vercel env vars; deploy.
6. Trigger the sync once (Actions → Run workflow, or `curl` the cron endpoint) to populate
   fire/bans.

## Tiles & offline

The forest PMTiles file is served from R2 via HTTP **Range** requests. It is **not** cached for
offline use - the browser Cache API can't store partial (206) responses. Offline support covers
the app shell, basemap tiles, cached report/ban data, and the offline report queue
([ADR-0004](./adr/0004-offline-support.md)).
