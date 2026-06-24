import { z } from 'zod';

// Shape of the browser PushSubscription.toJSON() we accept from the client. expirationTime is
// ignored (usually null and unreliable); we key on the endpoint instead.
export const pushSubscriptionSchema = z.object({
  endpoint: z.url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export const unsubscribeSchema = z.object({
  endpoint: z.url(),
});

export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
