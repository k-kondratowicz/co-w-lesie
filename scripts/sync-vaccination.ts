import 'dotenv/config';
import { syncVaccination } from '@/shared/lib/lisy/sync';
import { prisma } from '@/shared/lib/prisma';

// Dev runner for the fox-vaccine schedule sync (the same function backs /api/cron/sync-vaccination).
// Usage: npm run sync:vaccination

async function main() {
  console.log('Syncing fox-vaccine schedule from lisy.info...');
  const result = await syncVaccination(prisma);
  console.log('  vaccination:', result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
