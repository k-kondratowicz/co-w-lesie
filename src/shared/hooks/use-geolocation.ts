import { useLocationStore } from '@/shared/store/use-location-store';

export function useGeolocation() {
  const position = useLocationStore((state) => state.position);
  const status = useLocationStore((state) => state.status);
  const error = useLocationStore((state) => state.error);
  const isFetching = useLocationStore((state) => state.isFetching);
  const getCurrentPosition = useLocationStore((state) => state.getCurrentPosition);
  const clearError = useLocationStore((state) => state.clearError);

  return { position, status, error, isFetching, getCurrentPosition, clearError } as const;
}
