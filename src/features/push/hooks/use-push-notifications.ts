import { useCallback, useEffect, useState } from 'react';
import { api } from '@/shared/lib/api/client';
import { useVisitorIdStore } from '@/shared/store/use-visitor-id-store';

// VAPID keys travel as URL-safe base64, but PushManager.subscribe wants the raw bytes.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));

  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }

  return output;
}

function isSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// iOS exposes the Push API only to a home-screen-installed PWA, never to a Safari tab. So an
// unsupported iOS browser is not a dead end - it just needs installing first.
function isIos(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const ua = navigator.userAgent;
  const iPadOnMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return /iPad|iPhone|iPod/.test(ua) || iPadOnMac;
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;

  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

type Status = 'unsupported' | 'needs-install' | 'denied' | 'subscribed' | 'idle';

// The push service (FCM/Mozilla/Apple) can reject subscribe() with an AbortError even when our
// VAPID key is valid - Brave with Google push off, a Chromium build without API keys, or a network
// that blocks the push endpoint. None of that is the user's fault, so we explain it instead of
// letting the rejection surface as an uncaught promise.
const PUSH_SERVICE_REFUSED =
  'Nie udalo sie wlaczyc powiadomien - przegladarka lub siec odmowily polaczenia z usluga push. Sprobuj w Chrome, sprawdz ustawienia powiadomien lub wylacz blokady sieci.';
const PUSH_GENERIC_ERROR = 'Nie udalo sie wlaczyc powiadomien. Sprobuj ponownie.';

export function usePushNotifications() {
  const visitorId = useVisitorIdStore((state) => state.visitorId);
  const [status, setStatus] = useState<Status>('idle');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupported()) {
      setStatus(isIos() && !isStandalone() ? 'needs-install' : 'unsupported');
      return;
    }

    if (Notification.permission === 'denied') {
      setStatus('denied');
      return;
    }

    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.pushManager.getSubscription())
      .then((subscription) => setStatus(subscription ? 'subscribed' : 'idle'))
      .catch(() => setStatus('idle'));
  }, []);

  const subscribe = useCallback(async () => {
    if (!isSupported()) {
      return;
    }

    setPending(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'idle');
        return;
      }

      const { publicKey } = await api.push.vapidPublicKey();
      const registration = await navigator.serviceWorker.register('/sw.js');
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      await api.push.subscribe(visitorId, subscription.toJSON() as Parameters<typeof api.push.subscribe>[1]);
      setStatus('subscribed');
    } catch (cause) {
      setError(cause instanceof DOMException && cause.name === 'AbortError' ? PUSH_SERVICE_REFUSED : PUSH_GENERIC_ERROR);
    } finally {
      setPending(false);
    }
  }, [visitorId]);

  const unsubscribe = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await api.push.unsubscribe(visitorId, subscription.endpoint);
        await subscription.unsubscribe();
      }

      setStatus('idle');
    } finally {
      setPending(false);
    }
  }, [visitorId]);

  return {
    status,
    pending,
    error,
    subscribe,
    unsubscribe,
  };
}
