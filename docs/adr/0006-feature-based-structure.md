# 0006 - Feature-based structure: isolation, public API, enforcement

**Status:** accepted

## Context

The codebase is feature-based (`src/features/<feature>` + `src/shared`), but the rules were
never enforced, so it drifted:

- **Two circular dependencies** between sibling features:
  - `map` <-> `reports` (`forest-map` pulls report components/api; `report-popup-content`
    pulls the map's interaction types back).
  - `safety` <-> `saved-areas` (`safety-assistant` composes the saved-areas list/hooks;
    `use-saved-area-statuses` pulls `safety`'s `riskQueryOptions` back).
- **No public API.** Every cross-module import is a deep path
  (`@/features/x/components/.../Foo`); no feature exposes an `index.ts` surface.
- **`shared/lib` leaks domain.** `bdl`, `kmzb`, `risk`, `sync-freshness`, `push/notify-areas`
  carry forest/BDL/risk domain knowledge, violating "shared owns no domain".
- **`risk` is a sibling feature** despite being pure domain consumed by `safety` and
  `saved-areas` - it should be a shared domain slice, not a peer.

Both cycles come from the same anti-pattern: **a feature composing a sibling feature**.

Reference: pure feature-based architecture (Alexey Osipenko,
"Feature-Based Architecture in React"). We deliberately do **not** adopt full Feature-Sliced
Design (no `entities`/`widgets`/`segments` taxonomy) - it is more structure than this app needs.

## Decision

Adopt the layer model **`app` -> `features/*` -> `features/core` -> `shared`**, with imports
flowing **downward only**. A feature may import `features/core`; `core` may not import a feature.

### Layers

- **`app/`** - Next.js routes + API route handlers. This is also the **composition layer**: when
  a screen needs two features together (the map with report overlays, the safety assistant with
  saved areas), the route wires them. Features are not composed inside other features.
- **`features/<feature>/`** - a business capability (`reports`, `saved-areas`, `push`, `map`,
  `safety`). A feature **must not import a sibling feature**.
- **`features/core/`** - lightweight, domain-aware slices reused by several features or by the
  app layer: `risk` (engine, config, format, presentation, types), `report` (shared types,
  schemas incl. `locationSchema`, GeoJSON + popup contract), and the BDL/KMZB sync slices
  (`bdl`, `kmzb`). `core` must not import a concrete feature.
- **`shared/`** - infrastructure with no domain ownership: `ui`, generic hooks, `lib/api`,
  `lib/geo` (pure spatial math), `lib/date`, `lib/security`, `prisma`, `r2`, `utils`, etc.

### Public API

Every `core` slice exposes an `index.ts`; other modules import it by its folder
(`@/features/core/risk`), never a deep internal path. Deep imports of a core slice are forbidden.

Plain features deliberately do **not** carry a barrel yet: `no-sibling-feature` bans
feature-to-feature imports outright, so a feature has no external consumer to expose a public API
to, and the `app` composition layer may deep-import a feature's components. A feature gains an
`index.ts` only if a genuine cross-feature need ever appears - we don't add unused barrels.

### `shared/lib` cleanup

Domain code moves out of `shared/lib` into `features/core`:
`bdl`, `kmzb` -> `features/core/{bdl,kmzb}` (composed by the cron routes in `app/`);
`sync-freshness` -> `features/core`. `push/send` (generic web-push transport) stays in `shared`.

`risk/assess-point` and `push/notify-areas` are **impure composition** (they query reports/areas
and run the engine), so they are not `core` - `core` may not import a feature. They move up to the
orchestration layer: the `app` route / cron handler that owns the request (see R3/R6).

### Enforcement

`dependency-cruiser` (structure-agnostic, no ESLint needed - keeps the Biome-only setup), wired as
`npm run lint:arch` and run in CI. Rules (all `error` except where noted):

- `no-sibling-feature` - a `features/<a>/` module may not import `features/<b>/` (a != b),
  except `features/core`.
- `core-public-api-only` / `core-cross-slice-public-api-only` - a core slice is imported only
  through its `index.ts`, never a deep internal path (from outside core, and between core slices).
- `core-no-feature-dep` - `features/core` may not import a concrete (non-core) feature.
- `core-no-app` - `features/core` may not import the `app` layer.
- `no-feature-circular` - no dependency cycles within `src/features` (the pre-existing benign
  barrel cycles inside `shared/` are out of scope).
- `shared-no-upward` (`warn` until R6) - `shared` may not import `features`/`app`. The remaining
  hits are domain still living in `shared/lib` (`risk/assess-point`, `push/*`), cleared in R6.

## Consequences

- The two cycles are removed structurally: shared domain (risk, report contract) drops to
  `core`; cross-feature composition rises to `app` route components.
- A barrel (`index.ts`) per slice adds a little indirection but makes the public surface explicit
  and lets the linter catch violations mechanically.
- We picked `dependency-cruiser` over `steiger` (FSD-only, wrong shape for us) and over Biome's
  `noRestrictedImports` (can't express "sibling feature").
- Migration is phased (see PLAN.md): cycle fix and public API first; the `shared/lib` domain
  cleanup (`bdl`/`kmzb` -> `core`) is an independent later phase with no cycle risk.
- This supersedes the informal "feature-based" note in `docs/architecture.md`, which is updated to
  describe the layers and the `lint:arch` guardrail.
