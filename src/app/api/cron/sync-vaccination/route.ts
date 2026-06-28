import type { NextRequest } from 'next/server';
import { syncVaccination } from '@/shared/lib/lisy/sync';
import { prisma } from '@/shared/lib/prisma';
import { isAuthorizedCron } from '@/shared/lib/security/cron-auth';

// Background sync of the fox-vaccine schedule from lisy.info, triggered by a scheduler. Never hit
// on a user request. The schedule is published once per year and edited occasionally, so monthly
// is plenty; on failure the table keeps the last good data and freshness goes stale - we never
// imply "no campaign".

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // never cache; always run the sync.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncVaccination(prisma);

    return Response.json({ ok: true, syncedAt: new Date().toISOString(), result });
  } catch (error) {
    // Technical log only; the scheduler reads the status code.
    console.error('[sync-vaccination] sync failed', error);

    return Response.json({ ok: false, error: 'Sync failed' }, { status: 502 });
  }
}
