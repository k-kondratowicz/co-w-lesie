import { create } from 'zustand';

// Coordinates the "pick a point on the map" flow between a feature (which starts picking and
// consumes the result) and the map (which captures the click). `purpose` lets multiple features
// (safety assistant, report form) share the flow without consuming each other's points.

export type PickPurpose = 'safety' | 'report';
export type PickConstraint = { lng: number; lat: number; radiusMeters: number };
type PickedPoint = { lng: number; lat: number; purpose: PickPurpose };

interface MapPickState {
  /** Map is waiting for the user to click a point. */
  isPicking: boolean;
  /** Who requested the current pick. */
  purpose: PickPurpose | null;
  /** Optional allowed area the map renders as a hint (e.g. report = within 2 km of GPS). */
  constraint: PickConstraint | null;
  /** The last picked point, tagged with its purpose, until the requester consumes it. */
  pickedPoint: PickedPoint | null;
  startPicking: (purpose: PickPurpose, constraint?: PickConstraint) => void;
  cancelPicking: () => void;
  /** Called by the map on click while picking — records the point and exits picking. */
  pickPoint: (lng: number, lat: number) => void;
  clearPicked: () => void;
}

export const useMapPickStore = create<MapPickState>((set, get) => ({
  isPicking: false,
  purpose: null,
  constraint: null,
  pickedPoint: null,
  startPicking: (purpose, constraint) => set({ isPicking: true, purpose, constraint: constraint ?? null, pickedPoint: null }),
  cancelPicking: () => set({ isPicking: false, purpose: null, constraint: null }),
  pickPoint: (lng, lat) => {
    const { purpose } = get();
    if (!purpose) {
      return;
    }
    set({ isPicking: false, constraint: null, purpose: null, pickedPoint: { lng, lat, purpose } });
  },
  clearPicked: () => set({ pickedPoint: null }),
}));
