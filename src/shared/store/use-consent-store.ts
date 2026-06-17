import { create } from 'zustand';
import { CONSENT_STORAGE_KEY, type ConsentState, readConsent } from '@/shared/lib/consent';

type ConsentStore = {
  consent: ConsentState;
  // Read the persisted choice. Starts 'pending' on the server so the banner never flashes during
  // SSR; the client calls this in an effect to pick up the real value.
  hydrate: () => void;
  setConsent: (consent: 'accepted' | 'rejected') => void;
};

export const useConsentStore = create<ConsentStore>((set) => ({
  consent: 'pending',
  hydrate: () => set({ consent: readConsent() }),
  setConsent: (consent) => {
    try {
      window.localStorage.setItem(CONSENT_STORAGE_KEY, consent);
    } catch {
      // storage unavailable (private mode) - the choice just won't persist across sessions
    }

    set({ consent });
  },
}));
