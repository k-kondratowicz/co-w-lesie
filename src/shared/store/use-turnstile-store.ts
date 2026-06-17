import { create } from 'zustand';

// Readiness of the inline Turnstile widget, surfaced so the form that guards on it can disable
// submit until a token exists. The token itself stays in a ref (see Turnstile) to avoid
// re-rendering the form on every solve; this store only carries the coarse status.
export type TurnstileStatus = 'idle' | 'verifying' | 'ready' | 'error';

type TurnstileStore = {
  status: TurnstileStatus;
  setStatus: (status: TurnstileStatus) => void;
};

export const useTurnstileStore = create<TurnstileStore>((set) => ({
  status: 'idle',
  setStatus: (status) => set({ status }),
}));
