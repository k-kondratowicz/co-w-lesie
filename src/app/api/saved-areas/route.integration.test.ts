import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { MAX_SAVED_AREAS_PER_VISITOR } from '@/features/saved-areas/constants';
import { prisma } from '@/shared/lib/prisma';
import { VISITOR_ID_HEADER } from '@/shared/lib/security/visitor-id';
import { DELETE, PATCH } from './[id]/route';
import { GET, POST } from './route';

const VISITOR = 'visitor-aaaaaaaa';
const OTHER_VISITOR = 'visitor-bbbbbbbb';

// A point inside the imported forest coverage so it clears the Poland-bbox check.
const KRAKOW = { lng: 19.94, lat: 50.06 };

function postArea(visitorId: string | null, body: unknown) {
  // Each POST gets a fresh client IP so the per-IP rate limiter (shared, in-memory) does not bleed
  // across tests - none of these cases exercise rate limiting, the cap is enforced per visitor.
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-forwarded-for': crypto.randomUUID() };
  if (visitorId) {
    headers[VISITOR_ID_HEADER] = visitorId;
  }

  return POST(new Request('http://localhost/api/saved-areas', { method: 'POST', headers, body: JSON.stringify(body) }));
}

function listAreas(visitorId: string | null) {
  const headers: Record<string, string> = visitorId ? { [VISITOR_ID_HEADER]: visitorId } : {};

  return GET(new Request('http://localhost/api/saved-areas', { headers }));
}

function deleteArea(visitorId: string, id: string) {
  const request = new Request(`http://localhost/api/saved-areas/${id}`, {
    method: 'DELETE',
    headers: { [VISITOR_ID_HEADER]: visitorId },
  });

  return DELETE(request, { params: Promise.resolve({ id }) });
}

function renameArea(visitorId: string, id: string, name: string | null) {
  const request = new Request(`http://localhost/api/saved-areas/${id}`, {
    method: 'PATCH',
    headers: { [VISITOR_ID_HEADER]: visitorId, 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });

  return PATCH(request, { params: Promise.resolve({ id }) });
}

const validBody = { location: [KRAKOW.lng, KRAKOW.lat], radiusMeters: 5000, name: 'Mój las' };

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "SavedArea" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('saved areas API', () => {
  it('rejects requests without a visitor id', async () => {
    expect((await postArea(null, validBody)).status).toBe(400);
    expect((await listAreas(null)).status).toBe(400);
  });

  it('creates an area and lists it only for its owner', async () => {
    const created = await postArea(VISITOR, validBody);
    expect(created.status).toBe(201);
    const area = await created.json();
    expect(area).toMatchObject({ name: 'Mój las', lat: KRAKOW.lat, lng: KRAKOW.lng, radiusMeters: 5000 });

    const mine = await (await listAreas(VISITOR)).json();
    expect(mine).toHaveLength(1);

    // A different visitor must not see it (scoped by the bearer).
    const theirs = await (await listAreas(OTHER_VISITOR)).json();
    expect(theirs).toHaveLength(0);
  });

  it('rejects a point outside Poland with 400', async () => {
    const response = await postArea(VISITOR, { location: [2.35, 48.85], radiusMeters: 5000 });

    expect(response.status).toBe(400);
  });

  it('rejects an out-of-range radius with 400', async () => {
    const response = await postArea(VISITOR, { location: [KRAKOW.lng, KRAKOW.lat], radiusMeters: 100 });

    expect(response.status).toBe(400);
  });

  it('rejects an identical point and radius with 409', async () => {
    expect((await postArea(VISITOR, validBody)).status).toBe(201);

    const duplicate = await postArea(VISITOR, validBody);
    expect(duplicate.status).toBe(409);

    // Same point, different radius is a distinct area.
    expect((await postArea(VISITOR, { ...validBody, radiusMeters: 8000 })).status).toBe(201);
  });

  it('treats a jittered re-save of the same spot as a duplicate', async () => {
    expect((await postArea(VISITOR, validBody)).status).toBe(201);

    // ~0.002 deg lat is roughly 220 m - within the buffer of a 5000 m area, so it is the same spot.
    const jittered = { ...validBody, location: [KRAKOW.lng, KRAKOW.lat + 0.002] };
    expect((await postArea(VISITOR, jittered)).status).toBe(409);
  });

  it('allows a genuinely distant point of the same radius', async () => {
    expect((await postArea(VISITOR, validBody)).status).toBe(201);

    // ~0.05 deg lat is roughly 5.5 km - well beyond the buffer, a different spot.
    const elsewhere = { ...validBody, location: [KRAKOW.lng, KRAKOW.lat + 0.05] };
    expect((await postArea(VISITOR, elsewhere)).status).toBe(201);
  });

  it('enforces the per-visitor cap with 409', async () => {
    for (let i = 0; i < MAX_SAVED_AREAS_PER_VISITOR; i += 1) {
      expect((await postArea(VISITOR, { ...validBody, radiusMeters: 1000 + i * 500 })).status).toBe(201);
    }

    const overflow = await postArea(VISITOR, { ...validBody, radiusMeters: 1000 + MAX_SAVED_AREAS_PER_VISITOR * 500 });
    expect(overflow.status).toBe(409);
  });

  it('deletes only the owner own area', async () => {
    const id = (await (await postArea(VISITOR, validBody)).json()).id as string;

    // Another visitor cannot delete it.
    expect((await deleteArea(OTHER_VISITOR, id)).status).toBe(404);
    expect((await deleteArea(VISITOR, id)).status).toBe(204);
    expect((await deleteArea(VISITOR, id)).status).toBe(404);
  });

  it('renames an area for its owner', async () => {
    const id = (await (await postArea(VISITOR, validBody)).json()).id as string;

    const renamed = await renameArea(VISITOR, id, 'Las pod domem');
    expect(renamed.status).toBe(200);
    expect((await renamed.json()).name).toBe('Las pod domem');

    expect((await renameArea(OTHER_VISITOR, id, 'Cudzy')).status).toBe(404);
  });
});
