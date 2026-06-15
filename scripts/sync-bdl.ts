import 'dotenv/config';
import { syncEntryBans, syncFireHazard } from '@/shared/lib/bdl/sync';
import { prisma } from '@/shared/lib/prisma';

// Dev runner for the BDL sync (the same functions back /api/cron/sync-bdl).
// Usage: npm run sync:bdl

async function main() {
  console.log('Syncing fire-hazard zones...');
  const fire = await syncFireHazard(prisma);
  console.log('  fire-hazard:', fire);

  console.log('Syncing forest entry bans...');
  const bans = await syncEntryBans(prisma);
  console.log('  entry-bans:', bans);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
