<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:project-rules -->
# Project: "Co w lesie"

App for reporting forest incidents (gunshots, dead animals, traps, illegal logging, dumping)
and assessing whether it is safe to enter the forest. **This is a safety application** — wrong
output has real-world consequences. The caution rule (below) overrides convenience.

## Stack (do not assume; this repo pins specific versions)
- Next.js 16 (App Router) + React 19 + React Compiler enabled. For any Next-specific API
  (route handlers, caching/revalidate, cron, server actions) follow the nextjs-agent-rules
  block above: read `node_modules/next/dist/docs/` first. Do not invent signatures from memory.
- Prisma 7 with `@prisma/adapter-pg`, multi-file schema (`prisma/*.prisma`).
- PostgreSQL + **PostGIS** (local Docker image must be `postgis/postgis`, not plain `postgres`).
- zod 4 for all input validation. TanStack Form + TanStack Query. Zustand for client state.
- MapLibre GL + PMTiles (NOT Mapbox). shadcn/ui (radix-nova, olive). Biome for lint/format.

## Language
- Code, identifiers, commit messages, and THIS file: **English**.
- All user-facing UI text and human-facing planning docs (PLAN.md, README): **Polish**.
- Be consistent within a file; never mix languages in one document.

## Architecture rules
- Feature-based: domain code under `src/features/<feature>/`, cross-cutting under `src/shared/`.
- **Pure domain logic** (`features/risk`, `shared/lib/geo` helpers) does NO I/O — no `fetch`,
  no DB calls. It takes data and returns a result, so it is unit-testable. I/O lives in
  `shared/lib/bdl`, `shared/lib/prisma`, and route handlers.
- **Spatial data flow:** the USER only ever queries our local PostGIS. External BDL/Lasy
  Państwowe services are touched ONLY by the background sync job, never on a user request.
- Spatial conventions: everything internal is EPSG:4326 (lng/lat, degrees). PostGIS distances
  in METERS via `geography` (`ST_DWithin`, `ST_Distance`). BDL services are EPSG:2180 — when
  querying their REST API pass `inSR=4326`/`outSR=4326` and let the server reproject; never
  reproject by hand. Name variables `lng`/`lat` explicitly; GeoJSON order is `[lng, lat]`.
- PostGIS geometry is added via raw SQL migrations and queried with `prisma.$queryRaw`
  (parameterized). It does not need to live in the Prisma schema.
- **Migration gotcha (generated columns):** Prisma cannot model the `Report.geog` generated
  column, so `prisma migrate dev` regenerates a spurious `ALTER COLUMN "geog" DROP DEFAULT`
  (which fails — it's `GENERATED`) plus a `report_geog_idx` → `Report_geog_idx` rename. When
  adding an unrelated migration: hand-edit the generated `migration.sql` to delete those two
  statements, then `prisma migrate resolve --rolled-back <name>` and `prisma migrate deploy`
  (deploy applies without re-diffing). Also drop scratch tables (e.g. `forest_dissolved`,
  rebuildable via `npm run dissolve:forest`) before migrating so they aren't flagged as drift.
- Validate every external (BDL) and client input with zod; BDL fields may change without notice.
- API routes should orchestrate, not contain business rules.
- Database access belongs in repositories/services.
- Business logic must not live inside React components.

## Safety rule (overrides everything except correctness)
- Missing data ≠ safe. If a signal is unknown (sync failed, point outside imported coverage,
  BDL down) return status `UNKNOWN` and tell the user to stay cautious — never imply "safe".
- The safety assistant never states categorically that it is safe. Best case: "no known
  hazards nearby" plus an always-visible disclaimer that it does not replace official LP notices.
- Entry ban present or fire-hazard degree III → result is always RED, regardless of other signals.
- Every risk/assessment screen shows data source, data freshness timestamp, and the disclaimer.

## Definition of done
1. Input validated with zod; user-facing errors in Polish, technical logs separate.
2. Domain logic (`risk`, `geo`) has unit tests (Vitest).
3. External-failure paths (BDL/sync down, no GPS, point outside coverage) handled per the
   safety rule.
4. No `any`; no `console.log` in production code; pass Biome.
5. DB changes via a Prisma migration (incl. manual SQL for PostGIS) — never edit the DB by hand.

### Code changes
- Prefer modifying existing code over introducing new abstractions; avoid premature
  abstractions and speculative generalization.
- Don't add files or extract a helper/hook/component for *hypothetical* reuse, or to split a
  small, cohesive unit.
- Do extract a single-use piece when it clarifies a *large or multi-concern* unit — split along
  a real seam (e.g. presentational vs. interaction vs. orchestration), for readability, not reuse.

## Coding style
- Prefer `type` for application code.
- Use `interface` only when declaration merging or extensible public contracts are required.
- Use `import type` for type-only imports.
- Prefer early returns over nested conditionals.
- Avoid unnecessary `else` blocks after `return`.
- Keep functions focused on a single responsibility.
- Prefer descriptive names over abbreviations.
- Prefer composition over large functions.
- Optimize for readability before cleverness.
- Minimize mutable state.
- Use blank lines to separate logical sections.
- Give `return` breathing room: a blank line before it, and format returned object literals
  multiline (one property per line, trailing comma) — even short ones.
- Explain intent, constraints, or business rules in comments; do not comment obvious code.
- Use Prisma `select` to fetch only required fields.

## Do NOT without asking
- Change the DB schema "in passing" — schema change = a deliberate, separate migration.
- Add dependencies without justification (every map/GIS lib has weight).
- Hardcode secrets — env vars only.
- Emit content that reassures about safety in violation of the safety rule.
- Guess at Next 16 APIs — read the bundled docs first.
<!-- END:project-rules -->
