import { create } from 'zustand';

// Shared state for the inline Turnstile challenge, published by the widget and read by the form
// that guards on it. `token` is the solved challenge token (null until the user passes); `failed`
// flags a script/challenge error so the widget can show a retry hint. "Verifying" is simply the
// absence of both. The form keeps submit disabled while `token` is null and sends it on submit.
type TurnstileStore = {
  token: string | null;
  failed: boolean;
  solve: (token: string) => void;
  fail: () => void;
  reset: () => void;
};

export const useTurnstileStore = create<TurnstileStore>((set) => ({
  token: null,
  failed: false,
  solve: (token) => set({ token, failed: false }),
  fail: () => set({ token: null, failed: true }),
  reset: () => set({ token: null, failed: false }),
}));
