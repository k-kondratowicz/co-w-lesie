import webpush from 'web-push';
import type { StoredSubscription } from '@/features/push/queries/push-repo';

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

let configured = false;

// Fails closed: without VAPID keys we refuse to send rather than silently no-op, so a
// misconfigured deploy is loud instead of dropping safety alerts.
function configure() {
  if (configured) {
    return;
  }

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error('VAPID keys are not configured (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT)');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export type SendResult = { delivered: boolean; gone: boolean };

// 404/410 from a push service means the subscription is permanently dead - report it as `gone`
// so the caller can prune the row. Other failures are transient (delivered: false, gone: false).
export async function sendPush(subscription: StoredSubscription, payload: PushPayload): Promise<SendResult> {
  configure();

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(payload),
    );

    return {
      delivered: true,
      gone: false,
    };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const gone = statusCode === 404 || statusCode === 410;

    return {
      delivered: false,
      gone,
    };
  }
}
