import type { NextRequest } from 'next/server';
import { syncKmzb } from '@/shared/lib/kmzb/sync';
import { prisma } from '@/shared/lib/prisma';
import { isAuthorizedCron } from '@/shared/lib/security/cron-auth';

// Background KMZB sync, triggered by a scheduler (e.g. Vercel Cron). Never hit on a user request.
// KMZB changes slowly (police verification takes days), so ~daily is plenty. Separate from the
// BDL sync route because it is a different, unofficial source with its own failure mode: when it
// fails the table simply keeps the last good set and freshness goes stale - we never imply "safe".

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // never cache; always run the sync.
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncKmzb(prisma);

    return Response.json({ ok: true, syncedAt: new Date().toISOString(), result });
  } catch (error) {
    // Technical log only; the scheduler reads the status code.
    console.error('[sync-kmzb] sync failed', error);

    return Response.json({ ok: false, error: 'Sync failed' }, { status: 502 });
  }
}
