# Co w lesie

> 🇵🇱 [Wersja polska](./README.pl.md)

A safety app for Polish forests: report incidents you see (gunshots, dead/aggressive animals,
traps, illegal logging, dumping) and check whether it's currently safe to enter a given spot -
combining community reports with the State Forests' fire-hazard zones and entry bans.

**This is a safety application** - see the [safety rule](./docs/business-rules.md#safety-rule):
missing data is never reported as "safe".

## Tech stack

- **Next.js 16** (App Router, React 19, React Compiler) on Vercel
- **PostgreSQL + PostGIS** (Neon in production), **Prisma 7** with `@prisma/adapter-pg`
- **MapLibre GL + PMTiles** for the map and the country-wide forest layer (tiles on Cloudflare R2)
- **zod** validation, **TanStack Query/Form**, **Zustand**, **Biome**, **Vitest**

## Local development

Prerequisites: Node 22+, Docker (for PostGIS).

```bash
# 1. Start PostGIS
docker compose up -d

# 2. Configure env (see "Environment variables" below)
cp .env.example .env   # if present; otherwise create .env

# 3. Apply migrations
npx prisma migrate deploy

# 4. Seed the forest layer (~455k polygons, several minutes) and pull BDL data
npm run seed:forest
npm run sync:bdl

# 5. Run the app
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL/PostGIS connection (pooled URL in prod; **direct** URL for migrations) |
| `CRON_SECRET` | yes | Bearer secret for `/api/cron/*` |
| `NEXT_PUBLIC_FOREST_PMTILES_URL` | yes | URL of the forest PMTiles file (R2 in prod) |
| `NEXT_PUBLIC_SITE_URL` | prod | Canonical site URL (metadata, sitemap, robots) |
| `NEXT_PUBLIC_SENTRY_DSN` | optional | Enables Sentry error monitoring |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | optional | Durable rate limiting (else in-memory) |
| `VOTE_SALT` | optional | Salt for the per-IP report-vote hash |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` / `VAPID_SUBJECT` | push | Web Push (VAPID) for saved-area hazard alerts; absent => push disabled |

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / build / serve |
| `npm test` | Vitest unit tests |
| `npm run test:integration` | DB-backed route tests (needs PostGIS running; uses a `cowlesie_test` database) |
| `npm run lint` / `format` | Biome |
| `npm run seed:forest` | Seed `forest_area` from BDL (all of Poland) |
| `npm run sync:bdl` | Sync fire-hazard zones + entry bans from BDL |
| `npm run dissolve:forest` | Rebuild the dissolved forest geometry |
| `npm run export:forest` / `build:forest-pmtiles` | Export GeoJSON and build the PMTiles layer |
| `npm run generate:icons` | Re-render app icons + OG image from the brand mark |

## Documentation

- [Architecture](./docs/architecture.md) - structure, spatial data flow, conventions
- [Business rules](./docs/business-rules.md) - risk model, report lifecycle, safety rule
- [Deployment](./docs/deployment.md) - topology, env, migrations, cron
- [Decisions (ADRs)](./docs/adr/) - load-bearing technical choices
- [AGENTS.md](./AGENTS.md) - rules for AI/contributors working in this repo
