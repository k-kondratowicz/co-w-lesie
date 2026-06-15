import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { expiryFrom } from '@/features/reports/lifecycle';
import { prisma } from '@/shared/lib/prisma';
import { checkRateLimit } from '@/shared/lib/rate-limit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VOTE_LIMIT = 20; // votes per IP
const VOTE_WINDOW_MS = 60_000; // per minute

const voteSchema = z.object({ kind: z.enum(['CONFIRM', 'FLAG']) });

function clientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

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

  const { kind } = parsed.data;
  const ipHash = hashIp(ip);

  try {
    const counts = await prisma.$transaction(async (tx) => {
      await tx.reportVote.create({ data: { reportId: id, kind, ipHash } });
      const report = await tx.report.findUniqueOrThrow({ where: { id }, select: { type: true } });

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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Already voted from this IP - idempotent: return the current tally.
      if (error.code === 'P2002') {
        const counts = await prisma.report.findUnique({ where: { id }, select: { confirmations: true, flags: true } });

        return counts
          ? Response.json({ ...counts, alreadyVoted: true })
          : Response.json({ error: 'Nie znaleziono zgłoszenia' }, { status: 404 });
      }
      // Report doesn't exist (missing row / FK violation).
      if (error.code === 'P2025' || error.code === 'P2003') {
        return Response.json({ error: 'Nie znaleziono zgłoszenia' }, { status: 404 });
      }
    }

    console.error('[POST /api/reports/:id/vote] failed', error);

    return Response.json({ error: 'Nie udało się zapisać głosu' }, { status: 500 });
  }
}
