# 0007 - Domain services in core, coordination stores in shared

**Status:** accepted. Supersedes the `app/_lib` placement of `assess-point` in ADR 0006.

## Context

ADR 0006 put `assess-point` (point assessment: PostGIS queries + the risk engine) in a neutral
`app/_lib/` because it needs `queryReportsInRadius`, which lived in `features/reports`, and
`core` may not import a feature. The result works, but domain logic sits in the routing layer,
and the next service with the same shape has no rule telling it where to go.

`src/shared/store` grew the same way: it holds the stores that coordinate features (who picks a
point on the map, what the map draws for the safety assistant), but nothing says which stores
belong there, so single-feature state lands in `shared` too.

## Decision

1. **Domain services with I/O live in `features/core/<slice>`** and are exposed through a
   separate `index.server.ts`, so client code importing the slice's `index.ts` never pulls
   Prisma into its graph. `assessPoint` moves to `core/risk`. Its report dependencies
   (`queryReportsInRadius` and the report lifecycle it relies on) move down to `core/report`.
   `no-app-domain-lib` in `.dependency-cruiser.cjs` keeps `app/_lib` from coming back.
2. **`shared/store` holds only cross-feature UI coordination stores.** No domain data. A store
   used by one feature lives in that feature.
3. **Data-source integrations stay in `shared/lib/<source>`** (`bdl`, `kmzb`, `lisy`,
   `tourism`), as in ADR 0006. Moving them buys nothing functionally.
4. **A slice's client surface lives in `index.client.ts`**: the browser fetch client (`api.ts`,
   relative `/api/...` URLs that mean nothing on the server), react-query options and zustand
   stores. This replaces ADR 0006's "isomorphic api in index.ts". `server-no-client-surface`
   fails when a route handler can reach any of them, even transitively through a barrel.

## Consequences

- Routes and the notify-areas cron import `assessPoint` from `@/features/core/risk/index.server`.
  The `core-public-api-only` rule already allows any `index.*` entry, so no new exception.
- `core/report` now owns the report lifecycle (TTL, dispute thresholds, age fade), which is the
  same contract the API and the map both depend on.
- Modules that hold Prisma, R2, web-push or secrets start with `import 'server-only'`, so a
  client component importing one fails the build with a clear message. Outside Next that import
  throws, so the `tsx` scripts that reach Prisma run with `--conditions=react-server` (the
  package's empty export) and Vitest aliases it to `test/empty-module.ts`.
- A route-local helper with a single consumer (`app/api/cron/notify-areas/_lib/`) is still fine:
  the rule only bans the shared `app/_lib/` folder.
