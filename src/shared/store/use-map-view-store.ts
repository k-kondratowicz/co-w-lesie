import { create } from 'zustand';

type MapView = { longitude: number; latitude: number; zoom: number };

// Remembers the last map viewport so leaving the map (e.g. to the privacy policy) and coming
// back restores where you were, instead of remounting at the zoomed-out country default.
type MapViewStore = {
  view: MapView | null;
  setView: (view: MapView) => void;
};

export const useMapViewStore = create<MapViewStore>((set) => ({
  view: null,
  setView: (view) => set({ view }),
}));
