import { create } from 'zustand';

export type SafetyTarget = { lat: number; lng: number; radiusMeters: number };

// One-shot channel for asking the safety assistant to assess a specific point (e.g. a saved area
// picked from its own sheet). Mirrors the map-pick flow: a requester sets it, the assistant
// consumes it once and opens. Kept separate from map picks so the two don't consume each other.
type SafetyTargetState = {
  requested: SafetyTarget | null;
  request: (target: SafetyTarget) => void;
  consume: () => void;
};

export const useSafetyTargetStore = create<SafetyTargetState>((set) => ({
  requested: null,
  request: (target) => set({ requested: target }),
  consume: () => set({ requested: null }),
}));
