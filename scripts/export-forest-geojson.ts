import 'dotenv/config';
import { once } from 'node:events';
import { createWriteStream } from 'node:fs';
import { prisma } from '@/shared/lib/prisma';

// Streams forest_dissolved to newline-delimited GeoJSON (GeoJSONSeq) - the input for
// tippecanoe. Keyset pagination keeps memory bounded regardless of table size; no GDAL needed.
// Usage: npm run export:forest  (writes forest_dissolved.geojsonl)

const OUTPUT = 'forest_dissolved.geojsonl';
const BATCH = 2000;

async function main() {
  // A stable id to paginate on (bigserial backfills existing rows).
  await prisma.$executeRawUnsafe('ALTER TABLE forest_dissolved ADD COLUMN IF NOT EXISTS id bigserial');

  const output = createWriteStream(OUTPUT);
  let lastId = 0;
  let written = 0;

  for (;;) {
    const rows = await prisma.$queryRawUnsafe<{ id: bigint; geojson: string }[]>(
      'SELECT id, ST_AsGeoJSON(geom) AS geojson FROM forest_dissolved WHERE id > $1 ORDER BY id LIMIT $2',
      lastId,
      BATCH,
    );
    if (rows.length === 0) {
      break;
    }

    let chunk = '';
    for (const row of rows) {
      chunk += `{"type":"Feature","geometry":${row.geojson},"properties":{}}\n`;
    }
    if (!output.write(chunk)) {
      await once(output, 'drain');
    }

    written += rows.length;
    lastId = Number(rows[rows.length - 1].id);
    process.stdout.write(`\r  exported ${written.toLocaleString()} features...`);
  }

  output.end();
  await once(output, 'finish');
  console.log(`\n  done: ${written.toLocaleString()} features → ${OUTPUT}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
