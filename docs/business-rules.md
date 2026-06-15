# Business rules

The authoritative description of the safety logic and report behaviour. Values here mirror the
code; the source of truth for tunables is [`src/features/risk/config.ts`](../src/features/risk/config.ts)
and [`src/features/reports/lifecycle.ts`](../src/features/reports/lifecycle.ts).

## Safety rule

This overrides convenience everywhere (only correctness ranks higher):

- **Missing data is never "safe".** If a signal is unknown (sync failed, point outside imported
  coverage, BDL down) it is reported as `UNKNOWN` and the user is told to stay cautious.
- The assistant **never states categorically that it is safe**. Best case wording is "no known
  hazards nearby", always with the disclaimer that it does not replace official Lasy Państwowe
  notices.
- **An active entry ban, or fire-hazard degree III, always yields `RED`** - regardless of any
  other signal. These are never averaged away.
- Every assessment shows the **data source, freshness timestamp, and disclaimer**.

## Risk assessment

`GET /api/risk?lat=&lng=&radius=` assesses a point. Radius defaults to **5 km**, max **50 km**.
The engine ([`engine.ts`](../src/features/risk/engine.ts)) is pure and deterministic - the route
gathers the signals, the engine scores them.

### Inputs

| Signal | Source |
|---|---|
| Nearby reports | reports within the radius, with age in days |
| Fire-hazard degree (0–3, or unknown) | BDL fire zone containing the point |
| Entry ban (yes/no) | BDL ban polygons containing the point |
| In forest (in/out/unknown) | `forest_area` PostGIS lookup |

### Scoring

1. **Report density** - for each report, `typeWeight × recencyDecay`, summed, divided by the
   saturation constant (**3**), clamped to 0–1.
   - `recencyDecay = 1 − ageDays / 30`, clamped to 0 - a report contributes nothing after **30 days**.
   - Type weights: `SHOTS 1.0`, `SHOTS_HEARD 0.9`, `HUNTING 0.9`, `AGGRESSIVE_ANIMAL 0.8`,
     `FIRE 0.8`, `BLOOD 0.5`, `DEAD_ANIMAL 0.4`, `BLOCKED_PATH 0.3`, `VACCINATION 0.2`,
     `ILLEGAL_DUMP 0.2`, `OTHER 0.2`.
2. **Fire score** - by degree: `0→0, 1→0.2, 2→0.5, 3→0.9`; unknown → 0.
3. **Combined score** (non-hard-RED) - `clamp01(0.7 × reportScore + 0.6 × fireScore)`.

### Level

- **Hard RED** when `entryBan` **or** `fireDegree === 3` → score forced to 1.0.
- Otherwise from the combined 0–1 score:
  - `< 0.25` → **GREEN** ("no known hazards nearby")
  - `< 0.6` → **YELLOW** ("stay cautious")
  - `≥ 0.6` → **RED** ("we advise against going")

The score is also returned as 0–100 for display.

### Freshness

Fire and bans refresh on different cadences, so freshness is reported **per signal**, never
collapsed to the oldest: `fireAsOf` (the intersecting zone's forecast time) and `bansAsOf` (the
last ban sync). Either may be `null` (unknown) - see the safety rule.

## Reports

### Creating a report

- Allowed **only in or near a forest**: the point must be within **500 m** of `forest_area`
  (enforced server-side). This tolerance absorbs GPS error and forest edges.
- Location is the reporter's GPS, or a point picked on the map **within 2 km** of their GPS.
- Rate limit: **5 reports per minute per IP**.
- Offline: a report created without a connection is queued locally and sent when connectivity
  returns (GPS works offline, so its coordinates are valid). See [ADR-0004](./adr/0004-offline-support.md).

### Lifecycle (expiry & fade)

Each type stays relevant for a different time; `expiresAt` is set on creation and the map/API
hide expired reports. A report also **fades** on the map as it ages (opacity `1.0 → 0.35`).

| Type | Time to live |
|---|---|
| `FIRE`, `SHOTS`, `SHOTS_HEARD`, `HUNTING` | 24 h |
| `BLOOD`, `AGGRESSIVE_ANIMAL` | 48 h |
| `VACCINATION`, `OTHER` | 72 h |
| `DEAD_ANIMAL` | 7 days |
| `BLOCKED_PATH` | 14 days |
| `ILLEGAL_DUMP` | 30 days |

### Confirm / flag (integrity)

The crowd curates accuracy:

- **Confirm** ("still there") pushes the expiry out and refreshes the fade anchor.
- **Flag** ("gone / wrong") counts against it.
- A report is **hidden as disputed** when `flags − confirmations ≥ 2`.
- **One vote per IP per report**, enforced by a unique constraint on a salted IP hash (the raw IP
  is never stored). Vote rate limit: **20 per minute per IP**.
