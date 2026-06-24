import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// This id is an unguessable bearer that scopes a visitor's saved areas and push subscriptions, so
// it must be high-entropy. crypto.randomUUID needs a secure context (missing over plain http on a
// LAN IP), but crypto.getRandomValues does not - so we fall back to a full 128-bit random hex id
// there rather than a guessable Date.now()+Math.random() value. Math.random is only a last resort
// for a crypto-less runtime that should not occur in a browser.
function createVisitorId(): string {
  const webCrypto = globalThis.crypto;

  if (webCrypto?.randomUUID) {
    return webCrypto.randomUUID();
  }

  if (webCrypto?.getRandomValues) {
    const bytes = webCrypto.getRandomValues(new Uint8Array(16));

    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  const rand = () => Math.random().toString(36).slice(2);

  return `${Date.now()}-${rand()}-${rand()}-${rand()}`;
}

type VisitorIdState = {
  visitorId: string;
};

const STORAGE_KEY = 'cwl-visitor-id';

// Anonymous, persisted device identifier (no accounts). Sent as the x-visitor-id header so the
// server can scope a visitor's saved areas. Treated as an unguessable bearer, not auth.
export const useVisitorIdStore = create<VisitorIdState>()(
  persist(() => ({ visitorId: createVisitorId() }), { name: STORAGE_KEY }),
);

// persist only writes on a state change, and this store never calls set(). Without this, the id
// minted in the initializer would never reach localStorage: every refresh would generate a fresh
// one and silently orphan the visitor's saved areas. Persist it once on a first-ever visit.
if (typeof window !== 'undefined' && window.localStorage.getItem(STORAGE_KEY) === null) {
  useVisitorIdStore.setState((state) => ({ visitorId: state.visitorId }));
}
