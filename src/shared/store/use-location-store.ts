import { create } from 'zustand';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';

type GeoPos = GeolocationPosition['coords'];
type LocationStatus = 'idle' | 'pending' | 'granted' | 'denied';

// Minimum real movement (metres). A new fix closer than this — and within the reading's own
// accuracy — is treated as GPS jitter, so we keep the previous position (stable reference,
// no needless re-renders / re-assessments for everyone reading the store).
const MOVE_THRESHOLD_METERS = 50;

function hasMovedBeyondJitter(prev: GeoPos | null, next: GeoPos): boolean {
  if (!prev) {
    return true;
  }
  const threshold = Math.max(MOVE_THRESHOLD_METERS, next.accuracy ?? 0);
  return distanceMeters(prev.longitude, prev.latitude, next.longitude, next.latitude) > threshold;
}

interface LocationState {
  position: GeoPos | null;
  status: LocationStatus;
  error: string | null;
  isFetching: boolean;
  // `force: true` bypasses the jitter deadband — always returns a fresh position object so
  // consumers (e.g. the map re-centering) react even when you haven't really moved.
  getCurrentPosition: (opts?: { force?: boolean }) => Promise<GeoPos>;
  clearError: () => void;
}

const DEFAULT_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

const currentPromiseRef: { value: Promise<GeoPos> | null } = { value: null };

export const useLocationStore = create<LocationState>((set, get) => ({
  position: null,
  status: 'idle',
  error: null,
  isFetching: false,
  getCurrentPosition: async (opts) => {
    const force = opts?.force ?? false;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ error: 'Geolocation is not available in this environment.' });
      return Promise.reject(new Error('Geolocation not available'));
    }

    if (currentPromiseRef.value) {
      return currentPromiseRef.value;
    }

    set({ isFetching: true, status: 'pending', error: null });

    const attempt = (positionOptions: PositionOptions): Promise<GeoPos> =>
      new Promise<GeoPos>((resolve, reject) => {
        try {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            positionOptions,
          );
        } catch (err) {
          reject(err);
        }
      });

    const RETRIES = 1;
    const promise = (async () => {
      let lastError: unknown = null;

      for (let attemptIdx = 0; attemptIdx <= RETRIES; attemptIdx += 1) {
        const positionOptions: PositionOptions =
          attemptIdx === 0 ? DEFAULT_POSITION_OPTIONS : { enableHighAccuracy: false, maximumAge: 600000, timeout: 20000 };

        try {
          const coords = await attempt(positionOptions);
          // Ignore sub-threshold jitter unless forced — a fresh reference is what makes
          // consumers (map recenter, refresh button) react even when you didn't really move.
          const stable = force || hasMovedBeyondJitter(get().position, coords) ? coords : (get().position ?? coords);
          set({ position: stable, status: 'granted', isFetching: false, error: null });
          return stable;
        } catch (err) {
          lastError = err;
          if (attemptIdx === RETRIES) {
            const message = err instanceof Error ? err.message : String(err ?? 'Failed to retrieve position');
            set({ error: message, status: 'denied', isFetching: false });
            throw err;
          }
        }
      }

      throw lastError;
    })();

    currentPromiseRef.value = promise;

    promise.finally(() => {
      currentPromiseRef.value = null;
    });

    return promise;
  },
  clearError: () => set({ error: null }),
}));
