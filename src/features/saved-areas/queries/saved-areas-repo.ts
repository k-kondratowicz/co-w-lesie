import type { PrismaClient } from '@prisma/client';
import { DUPLICATE_BUFFER_MIN_METERS, DUPLICATE_BUFFER_RADIUS_FRACTION } from '@/features/saved-areas/constants';
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

export type AlertArea = {
  id: string;
  visitorId: string;
  name: string | null;
  lat: number;
  lng: number;
  radiusMeters: number;
  lastAlertSignature: string | null;
};

// Every area across all visitors, for the notification cron. Not visitor-scoped on purpose -
// this runs server-side after a sync, never on a user request.
export function listAreasForAlerts(prisma: PrismaClient): Promise<AlertArea[]> {
  return prisma.savedArea.findMany({
    select: { id: true, visitorId: true, name: true, lat: true, lng: true, radiusMeters: true, lastAlertSignature: true },
  });
}

export function updateAlertSignature(prisma: PrismaClient, id: string, signature: string | null): Promise<unknown> {
  return prisma.savedArea.update({ where: { id }, data: { lastAlertSignature: signature }, select: { id: true } });
}

// A re-save of the same spot only differs by GPS jitter, which an exact lat/lng match would miss -
// spawning a near-identical duplicate. Match same-radius areas whose center is within a buffer
// scaled to the area size (see DUPLICATE_BUFFER_*). Different radius = a deliberately wider/tighter
// watch on the spot, left as a distinct area.
export async function findDuplicateArea(
  prisma: PrismaClient,
  visitorId: string,
  input: CreateSavedAreaInput,
): Promise<{ id: string } | null> {
  const [lng, lat] = input.location;
  const buffer = Math.max(DUPLICATE_BUFFER_MIN_METERS, input.radiusMeters * DUPLICATE_BUFFER_RADIUS_FRACTION);

  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT "id"
    FROM "SavedArea"
    WHERE "visitorId" = ${visitorId}
      AND "radiusMeters" = ${input.radiusMeters}
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint("lng", "lat"), 4326)::geography,
        ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
        ${buffer}
      )
    LIMIT 1
  `;

  return rows[0] ?? null;
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
