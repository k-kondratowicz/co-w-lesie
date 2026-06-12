import 'dotenv/config';
import { prisma } from '@/shared/lib/prisma';

// Builds forest_dissolved — the merged/exploded forest geometry used as tippecanoe input.
// Grid-bucketed ST_Union (by centroid cell) bounds memory and avoids duplication; the only
// seams are at ~0.5° cell edges, irrelevant for a forest mask. Scratch table, safe to drop.
// Usage: npm run dissolve:forest  (run before export:forest when forest_area changes)

async function main() {
  const startedAt = Date.now();
  console.log('Dissolving forest_area → forest_dissolved…');

  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS forest_dissolved');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE forest_dissolved AS
    SELECT (ST_Dump(ST_Union(ST_MakeValid(ST_SnapToGrid(geom, 0.00001))))).geom AS geom
    FROM (
      SELECT geom,
             floor(ST_X(ST_Centroid(geom)) / 0.5) AS gx,
             floor(ST_Y(ST_Centroid(geom)) / 0.5) AS gy
      FROM forest_area
    ) s
    GROUP BY gx, gy
  `);
  await prisma.$executeRawUnsafe('CREATE INDEX forest_dissolved_gix ON forest_dissolved USING GIST (geom)');

  const [{ pieces }] = await prisma.$queryRawUnsafe<{ pieces: number }[]>('SELECT count(*)::int AS pieces FROM forest_dissolved');
  console.log(`  done: ${pieces.toLocaleString()} pieces in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
