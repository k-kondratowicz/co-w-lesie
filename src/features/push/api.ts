import type { PushSubscriptionInput } from '@/features/push/schemas/push-subscription.schema';
import { del, get, post } from '@/shared/lib/api/fetch';
import { VISITOR_ID_HEADER } from '@/shared/lib/security/visitor-id';

const BASE = '/api/push';

function visitorHeader(visitorId: string): HeadersInit {
  return { [VISITOR_ID_HEADER]: visitorId };
}

export const pushApi = {
  vapidPublicKey() {
    return get<{ publicKey: string }>(`${BASE}/vapid-public-key`);
  },
  subscribe(visitorId: string, subscription: PushSubscriptionInput) {
    return post<{ ok: boolean }>(`${BASE}/subscriptions`, subscription, visitorHeader(visitorId));
  },
  unsubscribe(visitorId: string, endpoint: string) {
    return del(`${BASE}/subscriptions`, visitorHeader(visitorId), { endpoint });
  },
};
