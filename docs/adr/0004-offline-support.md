# 0004 - Offline support scope

**Status:** accepted

## Context

Forests routinely have no signal - exactly when someone wants to file a report or check
conditions. Full offline (including the forest layer and a "download this area" flow) is large;
we wanted a useful subset first.

## Decision

Ship a pragmatic, cross-browser offline tier:

- **Offline report queue** - a report created without a connection is stored (`localStorage` via
  Zustand persist) and flushed when connectivity returns / the tab regains focus. GPS works
  offline, so coordinates are valid. The create mutation uses `networkMode: 'always'` so it runs
  while offline and can catch the failure; the flusher distinguishes **network** failures (retry)
  from **4xx** validation failures (drop).
- **Cached data** - TanStack Query cache persisted to `localStorage`, so the last-seen
  reports/bans render on an offline reload.
- **Basemap offline** - the service worker cache-firsts Carto tiles for already-browsed areas.
- **Offline indicator** - a pill showing offline state + queued count.

## Consequences

- App-level queue (not Background Sync), because Background Sync is unsupported on iOS Safari - a
  large share of hikers. Trade-off: the app must be reopened in range to flush.
- The **forest PMTiles layer is excluded** - Range/206 responses can't go in the Cache API. True
  full-offline (download-area) is deferred to a later iteration.
- Queued reports are validated by the server only when sent, so a report could still be rejected
  later (e.g. not near a forest); the user is told if that happens.
