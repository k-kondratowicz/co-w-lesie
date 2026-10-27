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
| Fire-hazard degree (0-3, or unknown) | BDL fire zone containing the point |
| Entry ban (yes/no) | BDL ban polygons containing the point |
| In forest (in/out/unknown) | `forest_area` PostGIS lookup |

### Scoring

1. **Report density** - for each report, `typeWeight × recencyDecay`, summed, divided by the
   saturation constant (**3**), clamped to 0-1.
   - `recencyDecay = 1 − ageDays / 30`, clamped to 0 - a report contributes nothing after **30 days**.
   - Type weights: `SHOTS 1.0`, `SHOTS_HEARD 0.9`, `HUNTING 0.9`, `AGGRESSIVE_ANIMAL 0.8`,
     `FIRE 0.8`, `BLOOD 0.5`, `DEAD_ANIMAL 0.4`, `BLOCKED_PATH 0.3`, `VACCINATION 0.2`,
     `ILLEGAL_DUMP 0.2`, `OTHER 0.2`.
2. **Fire score** - by degree: `0→0, 1→0.2, 2→0.5, 3→0.9`; unknown → 0.
3. **Combined score** (non-hard-RED) - `clamp01(0.7 × reportScore + 0.6 × fireScore)`.

### Level

- **Hard RED** when `entryBan` **or** `fireDegree === 3` → score forced to 1.0.
- Otherwise from the combined 0-1 score:
  - `< 0.25` → **GREEN** ("no known hazards nearby")
  - `< 0.6` → **YELLOW** ("stay cautious")
  - `≥ 0.6` → **RED** ("we advise against going")
- A would-be **GREEN** becomes **UNKNOWN** ("incomplete data - stay cautious") when either nationwide
  signal is `STALE` - see Freshness below. YELLOW and RED are never softened.

The score is also returned as 0-100 for display.

### Freshness

Fire and bans refresh on different cadences, so freshness is reported **per signal**, never
collapsed to the oldest: `fireAsOf` (the intersecting zone's forecast time) and `bansAsOf` (the
last ban sync). Either may be `null` (unknown) - see the safety rule.

**Stale data is not confirmed data.** Each nationwide signal (fire, bans) carries a state:

| State | Meaning | Effect |
|---|---|---|
| `CURRENT` | synced within the threshold, BDL has data for the point | none |
| `NO_DATA` | synced, but BDL publishes nothing here (fire `-1`/`-2`, outside Poland) | cautious message, level unchanged |
| `STALE` | our last successful sync is older than the threshold or never ran, or (fire) BDL's forecast for the point is older than 24 h | cautious message, GREEN becomes UNKNOWN |

Only `STALE` changes the level, because it is our pipeline failing - the data may be wrong. `NO_DATA`
is BDL telling us nothing is forecast (most of Poland outside the fire season), so the result keeps
its level and the message carries the caution. The result rows say "Brak aktualnych danych" for a
stale signal instead of a misleading "Nie". Staleness never removes a hazard the data still shows -
a stale ban or fire degree III keeps the result RED. A stale critical dataset also shows the app-wide
banner.

| Dataset | Sync cadence | Stale for users after | Watchdog alerts after |
|---|---|---|---|
| Fire hazard | hourly, 06:00-16:00 UTC | **18 h** | **6 h** |
| Entry bans | daily, 03:30 UTC | **2 days** | **2 days** |

The two fire thresholds answer different questions. BDL issues no new forecast overnight, so the
16:00 UTC sync stays current until the next morning: a user-facing threshold must span that 14 h
gap or every assessment would turn cautious at night. The watchdog runs only inside the sync
window, where 6 h without a sync already means a dead cron.

A fresh sync does not make the forecast fresh: BDL keeps serving its last forecast after it stops
issuing (e.g. at the end of the fire season). So fire is also `STALE` when the forecast's own issue
time (`fireAsOf`) is older than **24 h** - long enough to carry the ~13:00 issue through to the
next morning's (~20 h), short enough to catch a forecast that is days old.

### Entry-ban end date

A ban's `data_koncowa` is a calendar date, not an instant: every value BDL serves is 00:00 UTC with
no time zone declared, and they cluster on month ends (31.10, 30.11, 31.12). A ban therefore holds
**through the whole end day, Polish time** - "do 31.12.2026" ends at 23:59:59.999 Warsaw time, which
is also what the UI's "Obowiązuje do: 31.12.2026" promises. This is the latest instant any reading
of the field allows (exclusive end, UTC instant, or inclusive day), so if LP means the ban ends at
the start of that day, we only stay cautious a day longer. A ban with no end date - null, or BDL's
`0001-01-01` sentinel that GeoJSON omits - is active until BDL stops publishing it.

### Sync safeguards

A sync replaces its table only with a plausible result; otherwise it fails, keeps the last good
data, and leaves the freshness timestamp to go visibly stale (so the rule above takes over).

- **Fire hazard** - BDL publishes every zone (~60) year-round, outside the season as code `-2`
  ("no data"). An empty response is refused. Only zones with an explicit "nothing forecast" code
  (`-1` not covered, `-2` no data) are skipped. Any other zone with an unrecognised code or an
  unparseable date fails the whole run: dropping it would read as "no forecast" there, which stays
  GREEN, and could silently erase a degree-III RED.
- **Entry bans** - a result with no active ban is refused. Nationwide that is implausible: in late
  October 2026, outside the fire season, BDL still published 789 bans, all coded "inne przyczyny"
  (non-fire). Zero signals a broken fetch or date-format drift, not every ban being lifted.
- **Paging** - the client keeps paging while the server reports `exceededTransferLimit`, and fails
  instead of storing a partial set when the page cap is hit or an empty page still reports more
  results. Each page request times out after 60 s.
- **Missing geometry** - a fire zone or ban without geometry fails the run instead of being dropped:
  skipping it would silently remove that hazard. Non-safety layers (forest seed, tourism) skip such
  rows, since nothing is assessed against them.

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
- **Voting requires proximity**: a vote is a first-hand claim, so the voter must be within **2 km**
  of the report (the server checks the voter's location against the report). Votes from further away
  are rejected (422), mirroring the "be near a forest" rule for creating a report.

## Saved areas & hazard alerts

A visitor can bookmark areas (center + radius) and opt into push alerts. See
[ADR 0005](./adr/0005-web-push-notifications.md) for the technical decisions; the rules:

- **Visitor scoping.** Areas and push subscriptions are keyed by an anonymous, client-generated
  `visitorId` (no accounts), sent as the `x-visitor-id` header. It is an unguessable bearer, so it
  must be high-entropy: a UUID (or 128-bit random hex in a non-secure context where `randomUUID`
  is unavailable), persisted client-side. A visitor only ever sees/edits their own areas.
- **Duplicate buffer.** Saving an area dedupes against an existing same-radius area whose center is
  within `max(100 m, radius * 10%)` (`DUPLICATE_BUFFER_*` in
  [`constants.ts`](../src/features/saved-areas/constants.ts)). GPS jitter on a re-save of the same
  spot is the same area (HTTP 409); a different radius or a genuinely distant point is a new area.
  Enforced on both the client (button state) and the server (the API is the source of truth).
- **Onset-only alerts.** The post-sync sweep pushes only when a RED hazard (entry ban or
  fire-hazard degree III) has **newly appeared** since the last alert, deduped via a
  `lastAlertSignature` per area. A standing hazard never re-alerts.
- **Never an "all clear".** When a hazard lifts the signature is reset silently (so a later
  re-onset alerts again) but nothing is sent - a "now safe" push would violate the safety rule.
- **Alerts favour re-sending over suppression.** The signature advances only after a notification
  is actually delivered (or there is no one to notify). A transient push-service failure leaves it
  unchanged so the next sweep retries, rather than silently dropping a safety alert.
