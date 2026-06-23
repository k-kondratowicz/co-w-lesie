import type { PrismaClient } from '@prisma/client';
import type { PushSubscriptionInput } from '@/features/push/schemas/push-subscription.schema';

export type StoredSubscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

// Upsert on the endpoint: the same device re-subscribing (or moving to a new visitorId) must not
// create duplicate rows, and a re-subscribe after key rotation has to overwrite the stale keys.
export function saveSubscription(prisma: PrismaClient, visitorId: string, input: PushSubscriptionInput): Promise<{ id: string }> {
  const data = {
    visitorId,
    p256dh: input.keys.p256dh,
    auth: input.keys.auth,
  };

  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: { endpoint: input.endpoint, ...data },
    update: data,
    select: { id: true },
  });
}

// Scoped to the visitor so a bearer can only drop its own device. Returns false when nothing
// matched, which the route maps to 404.
export async function deleteSubscription(prisma: PrismaClient, visitorId: string, endpoint: string): Promise<boolean> {
  const { count } = await prisma.pushSubscription.deleteMany({ where: { endpoint, visitorId } });

  return count > 0;
}

export function listSubscriptions(prisma: PrismaClient, visitorId: string): Promise<StoredSubscription[]> {
  return prisma.pushSubscription.findMany({
    where: { visitorId },
    select: { endpoint: true, p256dh: true, auth: true },
  });
}

// A push service that reports the endpoint as gone (404/410) means the subscription is dead -
// prune it so the next send does not waste a request on it.
export function deleteSubscriptionByEndpoint(prisma: PrismaClient, endpoint: string): Promise<unknown> {
  return prisma.pushSubscription.deleteMany({ where: { endpoint } });
}
