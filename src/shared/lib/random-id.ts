// High-entropy opaque id for client-generated identifiers (the visitor bearer that scopes saved
// areas / push subscriptions, and offline-report queue keys). crypto.randomUUID needs a secure
// context (missing over plain http on a LAN IP), but crypto.getRandomValues does not - so we fall
// back to a full 128-bit random hex id there rather than a guessable Date.now()+Math.random()
// value. Math.random is only a last resort for a crypto-less runtime that should not occur in a browser.
export function createRandomId(): string {
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
