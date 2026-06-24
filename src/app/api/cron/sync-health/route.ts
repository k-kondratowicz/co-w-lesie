import * as Sentry from '@sentry/nextjs';
import type { NextRequest } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { isAuthorizedCron } from '@/shared/lib/security/cron-auth';
import { CRITICAL_DATASETS, evaluateSyncFreshness, getSyncTimestamps } from '@/shared/lib/sync-freshness';

// Watchdog: a dead sync cron never runs, so it can't report its own failure. This separate
// scheduled check evaluates freshness and, when a safety-critical dataset (fire/bans) is stale,
// raises a Sentry alert AND returns 503 - so both Sentry and any uptime monitor catch it. We learn
// the data went stale before a user trusts a stale "no known hazards".
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const freshness = evaluateSyncFreshness(await getSyncTimestamps(prisma));

  if (freshness.criticalStale) {
    const staleList = CRITICAL_DATASETS.filter((dataset) => freshness.datasets[dataset]?.stale).join(', ');

    Sentry.captureMessage(`Sync stale: critical dataset(s) [${staleList}] past freshness threshold`, {
      level: 'error',
      extra: { datasets: freshness.datasets },
    });

    return Response.json({ ok: false, ...freshness }, { status: 503 });
  }

  return Response.json({ ok: true, ...freshness });
}
