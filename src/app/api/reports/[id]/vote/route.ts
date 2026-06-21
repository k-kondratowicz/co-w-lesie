import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { expiryFrom } from '@/features/reports/lifecycle';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';
import { prisma } from '@/shared/lib/prisma';
import { clientIp } from '@/shared/lib/security/client-ip';
import { checkRateLimit } from '@/shared/lib/security/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VOTE_LIMIT = 20; // votes per IP
const VOTE_WINDOW_MS = 60_000; // per minute
// A vote is a first-hand claim ("still there" / "gone"), so the voter must be near the report.
const VOTE_MAX_DISTANCE_METERS = 2000;

const voteSchema = z.object({
  kind: z.enum(['CONFIRM', 'FLAG']),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

// Salted hash so we can dedupe votes per IP without ever storing the raw address.
function hashIp(ip: string): string {
  return createHash('sha256')
    .update(`${ip}:${process.env.VOTE_SALT ?? 'co-w-lesie'}`)
    .digest('hex');
}

// POST /api/reports/:id/vote - confirm ("still there") or flag ("gone/wrong") a report.
// One vote per IP per report (enforced by the ReportVote unique constraint).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ip = clientIp(request);

  const limit = await checkRateLimit(`vote:${ip}`, VOTE_LIMIT, VOTE_WINDOW_MS);

  if (!limit.ok) {
    return Response.json(
      { error: 'Zbyt wiele głosów. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane głosu' }, { status: 400 });
  }

  const parsed = voteSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe dane głosu' }, { status: 400 });
  }

  const { kind, lat, lng } = parsed.data;
  const ipHash = hashIp(ip);

  const report = await prisma.report.findUnique({ where: { id }, select: { type: true, lat: true, lng: true } });

  if (!report) {
    return Response.json({ error: 'Nie znaleziono zgłoszenia' }, { status: 404 });
  }

  if (distanceMeters(report.lng, report.lat, lng, lat) > VOTE_MAX_DISTANCE_METERS) {
    return Response.json({ error: 'Musisz być w pobliżu zgłoszenia, aby zagłosować.' }, { status: 422 });
  }

  try {
    const counts = await prisma.$transaction(async (tx) => {
      await tx.reportVote.create({ data: { reportId: id, kind, ipHash } });

      // Confirming pushes the expiry out and refreshes the freshness anchor; flagging just counts.
      return tx.report.update({
        where: { id },
        data:
          kind === 'CONFIRM'
            ? { confirmations: { increment: 1 }, lastConfirmedAt: new Date(), expiresAt: expiryFrom(report.type) }
            : { flags: { increment: 1 } },
        select: { confirmations: true, flags: true },
      });
    });

    return Response.json(counts);
  } catch (error) {
    // Already voted from this IP - idempotent: return the current tally.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const counts = await prisma.report.findUnique({ where: { id }, select: { confirmations: true, flags: true } });

      return counts
        ? Response.json({ ...counts, alreadyVoted: true })
        : Response.json({ error: 'Nie znaleziono zgłoszenia' }, { status: 404 });
    }

    console.error('[POST /api/reports/:id/vote] failed', error);

    return Response.json({ error: 'Nie udało się zapisać głosu' }, { status: 500 });
  }
}
