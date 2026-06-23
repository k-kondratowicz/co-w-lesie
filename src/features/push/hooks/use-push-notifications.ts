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

type Status = 'unsupported' | 'denied' | 'subscribed' | 'idle';

export function usePushNotifications() {
  const visitorId = useVisitorIdStore((state) => state.visitorId);
  const [status, setStatus] = useState<Status>('idle');
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!isSupported()) {
      setStatus('unsupported');
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
    } finally {
      setPending(false);
    }
  }, [visitorId]);

  const unsubscribe = useCallback(async () => {
    setPending(true);
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
    subscribe,
    unsubscribe,
  };
}
