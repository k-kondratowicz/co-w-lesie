import { Prisma, type PrismaClient } from '@prisma/client';
import { recordSync } from '@/shared/lib/sync-freshness';
import { fetchScheduleHtml } from './client';
import { LISY_SOURCE_URL } from './config';
import { parseSchedule } from './parse';
import { scheduleRowSchema, type ValidatedScheduleRow } from './schemas';

// Background sync: scrape the lisy.info schedule, validate it, and replace the local table
// (truncate+insert in a transaction, so it always mirrors the page with no stale rows). Never hit
// on a user request - the user only ever reads vaccination_campaign. The `html` parameter lets the
// integration test inject a fixture instead of the network.

export type VaccinationSyncResult = { year: number; inserted: number; problems: string[] };

const TX_OPTIONS = { timeout: 30_000, maxWait: 10_000 } as const;

// Deterministic id: the date range plus voivodeship uniquely identifies a campaign on the page.
const campaignId = (row: ValidatedScheduleRow) => `${row.startDate}_${row.endDate}_${row.voivodeship}`;

function valuesRow(row: ValidatedScheduleRow, fetchedAt: Date): Prisma.Sql {
  return Prisma.sql`(${campaignId(row)}, ${row.year}, ${row.startDate}::date, ${row.endDate}::date, ${row.voivodeship}, ${LISY_SOURCE_URL}, ${fetchedAt})`;
}

export async function syncVaccination(prisma: PrismaClient, html?: string): Promise<VaccinationSyncResult> {
  const source = html ?? (await fetchScheduleHtml());
  const { year, rows, problems } = parseSchedule(source);

  // Safety rule: the page always lists at least the current spring/autumn drops, so an empty parse
  // means the layout changed under us. Refuse to wipe the table - keep the last good data and let
  // its (now visibly stale) freshness signal the failure, never silently "no campaigns".
  if (rows.length === 0) {
    throw new Error(
      `lisy.info parse yielded no campaigns (problems: ${problems.join('; ') || 'none'}) - refusing to wipe the table`,
    );
  }

  const byId = new Map<string, ValidatedScheduleRow>();
  for (const row of rows) {
    const validated = scheduleRowSchema.parse(row);
    byId.set(campaignId(validated), validated);
  }
  const validated = [...byId.values()];

  const fetchedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('TRUNCATE TABLE "vaccination_campaign"');
    await tx.$executeRaw`
      INSERT INTO "vaccination_campaign" ("id", "year", "start_date", "end_date", "voivodeship", "source", "fetched_at")
      VALUES ${Prisma.join(validated.map((row) => valuesRow(row, fetchedAt)))}
    `;
  }, TX_OPTIONS);

  await recordSync(prisma, 'vaccination');

  return {
    year,
    inserted: validated.length,
    problems,
  };
}
