#!/usr/bin/env bash
# Build a country-wide forest PMTiles layer from the dissolved PostGIS table.
# Prereq: forest_dissolved exists (see the dissolve step) and `tippecanoe` is installed.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "1/3 Dissolving forest_area → forest_dissolved"
npm run --silent dissolve:forest

echo "2/3 Exporting forest_dissolved → forest_dissolved.geojsonl"
npm run --silent export:forest

echo "3/3 Tiling → poland_forests.pmtiles"
tippecanoe \
  -o poland_forests.pmtiles \
  -l forests \
  -Z6 -z14 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --simplify-only-low-zooms \
  --no-tiny-polygon-reduction-at-maximum-zoom \
  -X \
  --force \
  forest_dissolved.geojsonl

echo "Done → poland_forests.pmtiles"
echo "Next: upload to R2 (CORS must allow GET + Range) and set NEXT_PUBLIC_FOREST_PMTILES_URL."
