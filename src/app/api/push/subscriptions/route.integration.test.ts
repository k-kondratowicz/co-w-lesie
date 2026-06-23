import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '@/shared/lib/prisma';
import { VISITOR_ID_HEADER } from '@/shared/lib/security/visitor-id';
import { DELETE, POST } from './route';

const VISITOR = 'visitor-aaaaaaaa';
const OTHER_VISITOR = 'visitor-bbbbbbbb';

const subscription = {
  endpoint: 'https://push.example.com/sub-1',
  keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
};

function subscribe(visitorId: string | null, body: unknown) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (visitorId) {
    headers[VISITOR_ID_HEADER] = visitorId;
  }

  return POST(new Request('http://localhost/api/push/subscriptions', { method: 'POST', headers, body: JSON.stringify(body) }));
}

function unsubscribe(visitorId: string, endpoint: string) {
  return DELETE(
    new Request('http://localhost/api/push/subscriptions', {
      method: 'DELETE',
      headers: { [VISITOR_ID_HEADER]: visitorId, 'content-type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }),
  );
}

beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "PushSubscription" RESTART IDENTITY CASCADE');
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('push subscriptions API', () => {
  it('rejects a subscription without a visitor id', async () => {
    expect((await subscribe(null, subscription)).status).toBe(400);
  });

  it('rejects a malformed subscription with 400', async () => {
    expect((await subscribe(VISITOR, { endpoint: 'not-a-url' })).status).toBe(400);
  });

  it('stores a subscription and upserts on the same endpoint', async () => {
    expect((await subscribe(VISITOR, subscription)).status).toBe(200);
    expect((await subscribe(VISITOR, { ...subscription, keys: { p256dh: 'rotated', auth: 'rotated' } })).status).toBe(200);

    const rows = await prisma.pushSubscription.findMany({ where: { endpoint: subscription.endpoint } });
    expect(rows).toHaveLength(1);
    expect(rows[0]?.p256dh).toBe('rotated');
  });

  it('deletes only the owner own subscription', async () => {
    await subscribe(VISITOR, subscription);

    expect((await unsubscribe(OTHER_VISITOR, subscription.endpoint)).status).toBe(404);
    expect((await unsubscribe(VISITOR, subscription.endpoint)).status).toBe(204);
    expect((await unsubscribe(VISITOR, subscription.endpoint)).status).toBe(404);
  });
});
