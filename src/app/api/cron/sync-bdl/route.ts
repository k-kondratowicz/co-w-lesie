import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { type SyncResult, syncEntryBans, syncFireHazard } from '@/shared/lib/bdl/sync';
import { prisma } from '@/shared/lib/prisma';
import { isAuthorizedCron } from '@/shared/lib/security/cron-auth';

// Background BDL sync, triggered by a scheduler (e.g. Vercel Cron). Never hit on a user
// request. Forest areas are a one-off seed (npm run seed:forest), so they are not synced
// here - only the frequently-changing fire-hazard zones and entry bans.
//
// Cadence (configured in the scheduler, not here): fire ~every 3h, bans ~daily. The
// `dataset` query param lets one schedule target a subset.

export const runtime = 'nodejs'; // Prisma pg adapter requires Node, not Edge.
export const dynamic = 'force-dynamic'; // never cache; always run the sync.
export const maxDuration = 120;

const querySchema = z.object({
  dataset: z.enum(['all', 'fire', 'bans']).default('all'),
});

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = querySchema.safeParse({
    dataset: request.nextUrl.searchParams.get('dataset') ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: 'Invalid dataset', details: z.flattenError(parsed.error) }, { status: 400 });
  }

  const { dataset } = parsed.data;

  try {
    const results: Record<string, SyncResult> = {};
    const tasks: Promise<void>[] = [];

    if (dataset === 'all' || dataset === 'fire') {
      tasks.push(
        syncFireHazard(prisma).then((r) => {
          results.fire = r;
        }),
      );
    }

    if (dataset === 'all' || dataset === 'bans') {
      tasks.push(
        syncEntryBans(prisma).then((r) => {
          results.bans = r;
        }),
      );
    }

    await Promise.all(tasks);
    return Response.json({ ok: true, syncedAt: new Date().toISOString(), results });
  } catch (error) {
    // Technical log only; the scheduler reads the status code.
    console.error('[sync-bdl] sync failed', error);
    return Response.json({ ok: false, error: 'Sync failed' }, { status: 502 });
  }
}
