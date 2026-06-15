import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { POST } from './route';

type VoteKind = 'CONFIRM' | 'FLAG';

function vote(id: string, kind: VoteKind, ip = '1.1.1.1') {
  const request = new Request(`http://localhost/api/reports/${id}/vote`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify({ kind }),
  });

  return POST(request, { params: Promise.resolve({ id }) });
}

function createReport(expiresAt = new Date(Date.now() + 60 * 60 * 1000)) {
  return prisma.report.create({
    data: { type: 'FIRE', lat: 50.06, lng: 19.94, expiresAt },
    select: { id: true, expiresAt: true },
  });
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ReportVote", "Report" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('POST /api/reports/:id/vote', () => {
  it('confirms once per IP and counts a different IP, extending expiry', async () => {
    const report = await createReport();

    const first = await vote(report.id, 'CONFIRM', '1.1.1.1');
    expect(first.status).toBe(200);
    expect(await first.json()).toMatchObject({ confirmations: 1, flags: 0 });

    const updated = await prisma.report.findUniqueOrThrow({
      where: { id: report.id },
      select: { expiresAt: true, lastConfirmedAt: true },
    });
    expect(updated.expiresAt?.getTime()).toBeGreaterThan(report.expiresAt?.getTime() ?? 0);
    expect(updated.lastConfirmedAt).not.toBeNull();

    // Same IP again → idempotent, tally unchanged.
    const repeat = await vote(report.id, 'CONFIRM', '1.1.1.1');
    expect(await repeat.json()).toMatchObject({ confirmations: 1, alreadyVoted: true });

    // Different IP → counts.
    const other = await vote(report.id, 'CONFIRM', '2.2.2.2');
    expect(await other.json()).toMatchObject({ confirmations: 2 });
  });

  it('counts a flag against the report', async () => {
    const report = await createReport();

    const response = await vote(report.id, 'FLAG', '3.3.3.3');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ confirmations: 0, flags: 1 });
  });

  it('returns 404 for a missing report', async () => {
    const response = await vote('does-not-exist', 'CONFIRM', '4.4.4.4');

    expect(response.status).toBe(404);
  });

  it('rejects an invalid kind with 400', async () => {
    const report = await createReport();

    const response = await vote(report.id, 'BOGUS' as VoteKind, '5.5.5.5');

    expect(response.status).toBe(400);
  });
});
