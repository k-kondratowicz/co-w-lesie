import type { PrismaClient } from '@prisma/client';
import { DAY_MS, HOUR_MS } from '@/shared/lib/date/time';

// Records when a background dataset was last synced, so the app can show honest data freshness
// (most sources have no inherent timestamp of their own). Shared by every sync job (BDL, KMZB)
// so the freshness contract lives in one place. Backed by the BdlSync table (named for its
// first use; now generic).
export type SyncDataset = 'fire' | 'bans' | 'forest' | 'kmzb' | 'vaccination';

export function recordSync(prisma: PrismaClient, dataset: SyncDataset) {
  const now = new Date();

  return prisma.bdlSync.upsert({
    where: { dataset },
    create: { dataset, syncedAt: now },
    update: { syncedAt: now },
  });
}

// Past these ages a dataset is "stale" - sync cadence is fire ~3h, bans/kmzb ~daily, so each
// threshold is a few cadences out, loose enough not to cry wolf on a single missed run.
const STALE_THRESHOLD_MS: Record<SyncDataset, number> = {
  fire: 6 * HOUR_MS,
  bans: 2 * DAY_MS,
  kmzb: 2 * DAY_MS,
  forest: 90 * DAY_MS, // effectively static; monitored only against a long-dead pipeline
  vaccination: 45 * DAY_MS, // scraped monthly; a couple of cadences out, not safety-critical
};

// Datasets that can flip the assessment to RED (fire degree III, entry ban). When these go stale
// we warn loudly and page ourselves - the safety rule means missing/old here is never "safe".
export const CRITICAL_DATASETS: SyncDataset[] = ['fire', 'bans'];

const MONITORED_DATASETS: SyncDataset[] = ['fire', 'bans', 'kmzb', 'vaccination'];

export type DatasetFreshness = { syncedAt: string | null; ageMs: number | null; stale: boolean };
export type SyncFreshness = {
  datasets: Record<string, DatasetFreshness>;
  criticalStale: boolean;
};

export function getSyncTimestamps(prisma: PrismaClient): Promise<{ dataset: string; syncedAt: Date }[]> {
  return prisma.bdlSync.findMany({ select: { dataset: true, syncedAt: true } });
}

// Pure: turn raw sync timestamps into per-dataset staleness. A dataset with no row has never
// synced - treated as stale (unknown is not fresh). criticalStale drives the banner and alert.
export function evaluateSyncFreshness(rows: { dataset: string; syncedAt: Date }[], now: Date = new Date()): SyncFreshness {
  const byDataset = new Map(rows.map((row) => [row.dataset, row.syncedAt]));

  const datasets: Record<string, DatasetFreshness> = {};
  for (const dataset of MONITORED_DATASETS) {
    const syncedAt = byDataset.get(dataset) ?? null;
    const ageMs = syncedAt ? now.getTime() - syncedAt.getTime() : null;
    const stale = ageMs === null || ageMs > STALE_THRESHOLD_MS[dataset];

    datasets[dataset] = {
      syncedAt: syncedAt ? syncedAt.toISOString() : null,
      ageMs,
      stale,
    };
  }

  const criticalStale = CRITICAL_DATASETS.some((dataset) => datasets[dataset]?.stale ?? true);

  return {
    datasets,
    criticalStale,
  };
}
