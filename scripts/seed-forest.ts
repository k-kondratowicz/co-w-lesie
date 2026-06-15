import 'dotenv/config';
import { syncForestArea } from '@/shared/lib/bdl/sync';
import { type Bbox, POLAND_BBOX } from '@/shared/lib/geo/bbox';
import { prisma } from '@/shared/lib/prisma';

// One-off seed of forest_area for in-forest detection. Defaults to all of Poland
// (~455k compartments, several minutes). Pass a custom bbox to limit the region.
// Usage: npm run seed:forest            (whole country)
//        npm run seed:forest "19.08,49.07,21.55,50.59"   (e.g. Małopolska)

function parseBbox(arg: string | undefined): Bbox {
  if (!arg) {
    return POLAND_BBOX;
  }
  const parts = arg.split(',').map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) {
    throw new Error(`Invalid bbox "${arg}". Expected "minLng,minLat,maxLng,maxLat".`);
  }
  return parts as Bbox;
}

async function main() {
  const bbox = parseBbox(process.argv[2]);
  const startedAt = Date.now();
  console.log('Seeding forest_area for bbox', bbox, '...');

  const result = await syncForestArea(prisma, bbox, (inserted) => {
    process.stdout.write(`\r  inserted ${inserted.toLocaleString()} compartments...`);
  });

  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(`\n  done in ${seconds}s:`, result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
