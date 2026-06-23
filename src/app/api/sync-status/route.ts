import { prisma } from '@/shared/lib/prisma';
import { evaluateSyncFreshness, getSyncTimestamps } from '@/shared/lib/sync-freshness';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Public read of background-data freshness, so the app can warn loudly when the safety-critical
// signals (fire, bans) have gone stale - a dead cron the user would otherwise never see. Always
// 200: the client renders a banner from `criticalStale`. The watchdog (/api/cron/sync-health) is
// what turns this into an alert.
export async function GET() {
  const freshness = evaluateSyncFreshness(await getSyncTimestamps(prisma));

  return Response.json(freshness);
}
