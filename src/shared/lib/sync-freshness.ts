import type { PrismaClient } from '@prisma/client';

// Records when a background dataset was last synced, so the app can show honest data freshness
// (most sources have no inherent timestamp of their own). Shared by every sync job (BDL, KMZB)
// so the freshness contract lives in one place. Backed by the BdlSync table (named for its
// first use; now generic).
export type SyncDataset = 'fire' | 'bans' | 'forest' | 'kmzb';

export function recordSync(prisma: PrismaClient, dataset: SyncDataset) {
  const now = new Date();

  return prisma.bdlSync.upsert({
    where: { dataset },
    create: { dataset, syncedAt: now },
    update: { syncedAt: now },
  });
}
