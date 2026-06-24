import type { NextRequest } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import { notifySavedAreas } from '@/shared/lib/push/notify-areas';
import { isAuthorizedCron } from '@/shared/lib/security/cron-auth';

// Scheduler-triggered sweep, run shortly after sync-bdl so saved areas are checked against the
// freshly synced fire/ban data. Never hit on a user request.

export const runtime = 'nodejs'; // Prisma pg adapter + web-push require Node, not Edge.
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const summary = await notifySavedAreas(prisma);

    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error('[notify-areas] sweep failed', error);

    return Response.json({ ok: false, error: 'Notify failed' }, { status: 502 });
  }
}
