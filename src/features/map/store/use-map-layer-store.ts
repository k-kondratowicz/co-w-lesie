import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Optional BDL tourism layers the user can switch on from the map. Off by default - the map is a
// safety tool first, and these are extra context, not something to clutter the default view with.
export const OPTIONAL_MAP_LAYERS = ['overnightZones', 'parking', 'camping'] as const;

export type OptionalMapLayer = (typeof OPTIONAL_MAP_LAYERS)[number];

type MapLayerState = {
  visible: Record<OptionalMapLayer, boolean>;
  toggle: (layer: OptionalMapLayer) => void;
  hideAll: () => void;
};

const ALL_HIDDEN: Record<OptionalMapLayer, boolean> = { overnightZones: false, parking: false, camping: false };

export const useMapLayerStore = create<MapLayerState>()(
  persist(
    (set) => ({
      visible: ALL_HIDDEN,
      toggle: (layer) => set((state) => ({ visible: { ...state.visible, [layer]: !state.visible[layer] } })),
      hideAll: () => set({ visible: ALL_HIDDEN }),
    }),
    { name: 'cwl-map-layers' },
  ),
);

export function visibleLayerCount(visible: Record<OptionalMapLayer, boolean>): number {
  return OPTIONAL_MAP_LAYERS.filter((layer) => visible[layer]).length;
}
