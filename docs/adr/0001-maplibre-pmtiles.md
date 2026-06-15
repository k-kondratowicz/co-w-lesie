# 0001 - MapLibre GL + PMTiles (not Mapbox)

**Status:** accepted

## Context

We need an interactive map plus a country-wide forest layer (~455k compartments). Options were
Mapbox GL (paid, token, usage limits) and MapLibre GL (open source). The forest layer is large
and effectively static, so we want to serve it without a tile server.

## Decision

Use **MapLibre GL** (via `@vis.gl/react-maplibre`) with a **PMTiles** archive for the forest
layer, served as a single file from object storage (R2) over HTTP Range requests. Basemap from
Carto's free vector style.

## Consequences

- No tile-server infrastructure and no per-request map cost.
- The PMTiles file is built offline with `tippecanoe` (`npm run build:forest-pmtiles`) - a native
  binary that **cannot** run on Vercel functions; it's a local/CI build step.
- PMTiles uses Range (206) responses, which the browser Cache API can't store - so the forest
  layer is **not** available offline (see [ADR-0004](./0004-offline-support.md)).
- R2 must allow `GET` + `Range` CORS from the app origin.
