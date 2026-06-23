import type { PrismaClient } from '@prisma/client';
import type { CreateSavedAreaInput } from '@/features/saved-areas/schemas/saved-area.schema';
import type { SavedArea } from '@/features/saved-areas/types';

const AREA_SELECT = {
  id: true,
  name: true,
  lat: true,
  lng: true,
  radiusMeters: true,
  createdAt: true,
} as const;

type AreaRow = {
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  createdAt: Date;
};

function toSavedArea(row: AreaRow): SavedArea {
  return {
    id: row.id,
    name: row.name,
    lat: row.lat,
    lng: row.lng,
    radiusMeters: row.radiusMeters,
    createdAt: row.createdAt.toISOString(),
  };
}

export function listSavedAreas(prisma: PrismaClient, visitorId: string): Promise<SavedArea[]> {
  return prisma.savedArea
    .findMany({ where: { visitorId }, select: AREA_SELECT, orderBy: { createdAt: 'desc' } })
    .then((rows) => rows.map(toSavedArea));
}

export function countSavedAreas(prisma: PrismaClient, visitorId: string): Promise<number> {
  return prisma.savedArea.count({ where: { visitorId } });
}

// An area with the same point and radius produces an identical risk-query key, which would make
// the saved-areas list observe duplicate queries (and just clutters the list). Exact match only -
// a slightly different GPS fix is a genuinely different spot.
export function findDuplicateArea(
  prisma: PrismaClient,
  visitorId: string,
  input: CreateSavedAreaInput,
): Promise<{ id: string } | null> {
  const [lng, lat] = input.location;

  return prisma.savedArea.findFirst({
    where: { visitorId, lat, lng, radiusMeters: input.radiusMeters },
    select: { id: true },
  });
}

export async function createSavedArea(prisma: PrismaClient, visitorId: string, input: CreateSavedAreaInput): Promise<SavedArea> {
  const [lng, lat] = input.location;

  const row = await prisma.savedArea.create({
    data: {
      visitorId,
      lat,
      lng,
      radiusMeters: input.radiusMeters,
      name: input.name?.trim() || null,
    },
    select: AREA_SELECT,
  });

  return toSavedArea(row);
}

// Scoped to the visitor so a bearer can only touch its own rows. Returns false when no row
// matched (wrong id or someone else's area), which the route maps to 404.
export async function deleteSavedArea(prisma: PrismaClient, visitorId: string, id: string): Promise<boolean> {
  const { count } = await prisma.savedArea.deleteMany({ where: { id, visitorId } });

  return count > 0;
}

export async function renameSavedArea(
  prisma: PrismaClient,
  visitorId: string,
  id: string,
  name: string | null,
): Promise<SavedArea | null> {
  const { count } = await prisma.savedArea.updateMany({
    where: { id, visitorId },
    data: { name: name?.trim() || null },
  });

  if (count === 0) {
    return null;
  }

  const row = await prisma.savedArea.findUniqueOrThrow({ where: { id }, select: AREA_SELECT });

  return toSavedArea(row);
}
