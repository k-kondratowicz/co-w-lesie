import { create } from 'zustand';
import { distanceMeters } from '@/shared/lib/geo/distance-meters';

type GeoPos = GeolocationPosition['coords'];
type LocationStatus = 'idle' | 'pending' | 'granted' | 'denied';
// 'unknown' until queried; 'unsupported' when the Permissions API isn't available.
type PermissionState = 'unknown' | 'unsupported' | 'granted' | 'prompt' | 'denied';

// Minimum real movement (metres). A new fix closer than this - and within the reading's own
// accuracy - is treated as GPS jitter, so we keep the previous position (stable reference,
// no needless re-renders / re-assessments for everyone reading the store).
const MOVE_THRESHOLD_METERS = 50;

function hasMovedBeyondJitter(prev: GeoPos | null, next: GeoPos): boolean {
  if (!prev) {
    return true;
  }
  const threshold = Math.max(MOVE_THRESHOLD_METERS, next.accuracy ?? 0);
  return distanceMeters(prev.longitude, prev.latitude, next.longitude, next.latitude) > threshold;
}

// Maps a GeolocationPositionError to a Polish message and whether it's a hard permission block
// (code 1) - which the UI surfaces as "enable it in browser settings" instead of a dead retry.
function describeGeolocationError(err: unknown): { message: string; denied: boolean } {
  const code = err && typeof err === 'object' && 'code' in err ? (err as GeolocationPositionError).code : undefined;

  if (code === 1) {
    return { message: 'Dostęp do lokalizacji jest zablokowany w przeglądarce.', denied: true };
  }
  if (code === 2) {
    return { message: 'Nie udało się ustalić lokalizacji. Sprawdź sygnał GPS i spróbuj ponownie.', denied: false };
  }
  if (code === 3) {
    return { message: 'Przekroczono czas oczekiwania na lokalizację. Spróbuj ponownie.', denied: false };
  }

  return { message: 'Nie udało się pobrać lokalizacji.', denied: false };
}

interface LocationState {
  position: GeoPos | null;
  status: LocationStatus;
  permission: PermissionState;
  error: string | null;
  isFetching: boolean;
  // `force: true` bypasses the jitter deadband - always returns a fresh position object so
  // consumers (e.g. the map re-centering) react even when you haven't really moved.
  getCurrentPosition: (opts?: { force?: boolean }) => Promise<GeoPos>;
  // Idempotently start tracking the geolocation permission so the UI can react to it and
  // auto-recover the moment the user re-allows it in browser settings.
  watchPermission: () => void;
  clearError: () => void;
}

const DEFAULT_POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 10000,
};

const currentPromiseRef: { value: Promise<GeoPos> | null } = { value: null };
let permissionWatchStarted = false;

export const useLocationStore = create<LocationState>((set, get) => ({
  position: null,
  status: 'idle',
  permission: 'unknown',
  error: null,
  isFetching: false,
  getCurrentPosition: async (opts) => {
    const force = opts?.force ?? false;

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      set({ error: 'Twoja przeglądarka nie udostępnia lokalizacji.' });
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
          // Ignore sub-threshold jitter unless forced - a fresh reference is what makes
          // consumers (map recenter, refresh button) react even when you didn't really move.
          const stable = force || hasMovedBeyondJitter(get().position, coords) ? coords : (get().position ?? coords);
          set({ position: stable, status: 'granted', permission: 'granted', isFetching: false, error: null });
          return stable;
        } catch (err) {
          lastError = err;

          // A permission block (code 1) won't change on retry - fail fast with guidance.
          const { message, denied } = describeGeolocationError(err);
          if (denied || attemptIdx === RETRIES) {
            set({
              error: message,
              status: denied ? 'denied' : 'idle',
              permission: denied ? 'denied' : get().permission,
              isFetching: false,
            });
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
  watchPermission: () => {
    if (permissionWatchStarted) {
      return;
    }
    permissionWatchStarted = true;

    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      set({ permission: 'unsupported' });
      return;
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((permissionStatus) => {
        set({ permission: permissionStatus.state });

        permissionStatus.onchange = () => {
          set({ permission: permissionStatus.state });

          // Re-allowed in settings → clear the stale error and fetch automatically.
          if (permissionStatus.state === 'granted') {
            set({ error: null });
            get()
              .getCurrentPosition({ force: true })
              .catch(() => {});
          } else if (permissionStatus.state === 'prompt') {
            set({ error: null });
          }
        };
      })
      .catch(() => set({ permission: 'unsupported' }));
  },
  clearError: () => set({ error: null }),
}));
