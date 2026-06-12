import { create } from 'zustand';

// Cross-cutting UI state: the risk circle the map should draw. The safety assistant sets it
// after an assessment; ForestMap subscribes and renders a circle colored by level.

export type RiskOverlay = {
  lng: number;
  lat: number;
  radiusMeters: number;
  level: 'GREEN' | 'YELLOW' | 'RED';
};

interface RiskOverlayState {
  overlay: RiskOverlay | null;
  setOverlay: (overlay: RiskOverlay) => void;
  clearOverlay: () => void;
}

export const useRiskOverlayStore = create<RiskOverlayState>((set) => ({
  overlay: null,
  setOverlay: (overlay) => set({ overlay }),
  clearOverlay: () => set({ overlay: null }),
}));
