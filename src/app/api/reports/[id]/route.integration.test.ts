import type { Prisma } from '@prisma/client';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { GET } from './route';

function getReport(id: string) {
  const request = new Request(`http://localhost/api/reports/${id}`);

  return GET(request, { params: Promise.resolve({ id }) });
}

function createReport(overrides: Partial<Prisma.ReportUncheckedCreateInput> = {}) {
  return prisma.report.create({
    data: {
      type: 'FIRE',
      lat: 50.06,
      lng: 19.94,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      ...overrides,
    },
    select: { id: true },
  });
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "ReportVote", "Report" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('GET /api/reports/:id', () => {
  it('returns a valid report with all expected fields', async () => {
    const report = await createReport({ description: 'Pożar przy ścieżce' });

    const response = await getReport(report.id);

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body).toMatchObject({
      id: report.id,
      type: 'FIRE',
      description: 'Pożar przy ścieżce',
      lng: 19.94,
      lat: 50.06,
      confirmations: 0,
      flags: 0,
    });
    expect(body.createdAt).toBeDefined();
    expect(body.expiresAt).toBeDefined();
  });

  it('returns 404 for a nonexistent report', async () => {
    const response = await getReport('does-not-exist');

    expect(response.status).toBe(404);
  });

  it('returns 404 for an expired report', async () => {
    const report = await createReport({
      expiresAt: new Date(Date.now() - 1000),
    });

    const response = await getReport(report.id);

    expect(response.status).toBe(404);
  });

  it('returns 404 for a flagged-beyond-threshold report', async () => {
    const report = await createReport({ flags: 5, confirmations: 0 });

    const response = await getReport(report.id);

    expect(response.status).toBe(404);
  });

  it('returns a flagged report that has not reached the threshold', async () => {
    const report = await createReport({ flags: 3, confirmations: 0 });

    const response = await getReport(report.id);

    expect(response.status).toBe(200);
  });
});
