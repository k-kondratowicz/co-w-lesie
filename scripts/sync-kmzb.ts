import 'dotenv/config';
import { syncKmzb } from '@/shared/lib/kmzb/sync';
import { prisma } from '@/shared/lib/prisma';

// Dev runner for the KMZB sync (the same function backs /api/cron/sync-kmzb).
// Usage: npm run sync:kmzb

async function main() {
  console.log('Syncing KMZB incidents near forests...');
  const result = await syncKmzb(prisma);
  console.log('  kmzb:', result);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
