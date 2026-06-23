import { z } from 'zod';
import { deleteSubscription, saveSubscription } from '@/features/push/queries/push-repo';
import { pushSubscriptionSchema, unsubscribeSchema } from '@/features/push/schemas/push-subscription.schema';
import { prisma } from '@/shared/lib/prisma';
import { clientIp } from '@/shared/lib/security/client-ip';
import { checkRateLimit } from '@/shared/lib/security/rate-limit';
import { readVisitorId } from '@/shared/lib/security/visitor-id';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

export async function POST(request: Request) {
  const visitorId = readVisitorId(request);
  if (!visitorId) {
    return Response.json({ error: 'Brak identyfikatora urządzenia' }, { status: 400 });
  }

  const limit = await checkRateLimit(`push-sub:${clientIp(request)}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.ok) {
    return Response.json(
      { error: 'Zbyt wiele prób. Spróbuj ponownie za chwilę.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane subskrypcji' }, { status: 400 });
  }

  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe dane subskrypcji', issues: z.flattenError(parsed.error) }, { status: 400 });
  }

  try {
    await saveSubscription(prisma, visitorId, parsed.data);

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/push/subscriptions] save failed', error);

    return Response.json({ error: 'Nie udało się zapisać subskrypcji' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const visitorId = readVisitorId(request);
  if (!visitorId) {
    return Response.json({ error: 'Brak identyfikatora urządzenia' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nieprawidłowe dane subskrypcji' }, { status: 400 });
  }

  const parsed = unsubscribeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Nieprawidłowe dane subskrypcji' }, { status: 400 });
  }

  const removed = await deleteSubscription(prisma, visitorId, parsed.data.endpoint);

  return new Response(null, { status: removed ? 204 : 404 });
}
