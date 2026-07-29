import type { NextRequest } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { isAuthorizedCron } from '@/shared/lib/security/cron-auth';
import { syncOvernightZones, syncTourismPois } from '@/shared/lib/tourism/sync';

// Background sync of the BDL tourism layers (forest parking, camping spots, "Zanocuj w lesie"
// areas), triggered by a scheduler. Never hit on a user request. These are convenience layers, not
// safety signals - when the sync fails the tables keep the last good set and freshness goes stale.

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // never cache; always run the sync.
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const pois = await syncTourismPois(prisma);
    const zones = await syncOvernightZones(prisma);

    return Response.json({ ok: true, syncedAt: new Date().toISOString(), result: { pois, zones } });
  } catch (error) {
    // Technical log only; the scheduler reads the status code.
    console.error('[sync-tourism] sync failed', error);

    return Response.json({ ok: false, error: 'Sync failed' }, { status: 502 });
  }
}
