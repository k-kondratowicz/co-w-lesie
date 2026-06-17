export const CONSENT_STORAGE_KEY = 'cwl-consent';

// 'pending' until the visitor chooses. Functional storage (offline queue, query cache, the user's
// location) is always allowed; this gate only governs analytics + error monitoring.
export type ConsentState = 'pending' | 'accepted' | 'rejected';

export function readConsent(): ConsentState {
  if (typeof window === 'undefined') {
    return 'pending';
  }

  const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);

  return value === 'accepted' || value === 'rejected' ? value : 'pending';
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === 'accepted';
}
