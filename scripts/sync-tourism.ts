import 'dotenv/config';
import { prisma } from '@/shared/lib/prisma';
import { syncOvernightZones, syncTourismPois } from '@/shared/lib/tourism/sync';

// Dev runner for the BDL tourism sync (the same functions back /api/cron/sync-tourism).
// Usage: npm run sync:tourism

async function main() {
  console.log('Syncing tourism points (parking, camping)...');
  const pois = await syncTourismPois(prisma);
  console.log('  tourism-poi:', pois);

  console.log('Syncing "Zanocuj w lesie" areas...');
  const zones = await syncOvernightZones(prisma);
  console.log('  overnight-zone:', zones);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
