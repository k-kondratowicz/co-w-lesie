import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CONSENT_STORAGE_KEY, hasAnalyticsConsent, readConsent } from './consent';

function makeStorage(): Storage {
  const map = new Map<string, string>();

  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
}

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: makeStorage() });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('consent', () => {
  it('defaults to pending with nothing stored', () => {
    expect(readConsent()).toBe('pending');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('reads a stored accepted choice', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'accepted');
    expect(readConsent()).toBe('accepted');
    expect(hasAnalyticsConsent()).toBe(true);
  });

  it('treats rejection as no analytics consent', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'rejected');
    expect(readConsent()).toBe('rejected');
    expect(hasAnalyticsConsent()).toBe(false);
  });

  it('falls back to pending for an unexpected stored value', () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, 'garbage');
    expect(readConsent()).toBe('pending');
  });
});
