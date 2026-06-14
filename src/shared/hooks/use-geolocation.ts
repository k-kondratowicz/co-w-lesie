import { useEffect } from 'react';
import { useLocationStore } from '@/shared/store/use-location-store';

export function useGeolocation() {
  const position = useLocationStore((state) => state.position);
  const status = useLocationStore((state) => state.status);
  const permission = useLocationStore((state) => state.permission);
  const error = useLocationStore((state) => state.error);
  const isFetching = useLocationStore((state) => state.isFetching);
  const getCurrentPosition = useLocationStore((state) => state.getCurrentPosition);
  const watchPermission = useLocationStore((state) => state.watchPermission);
  const clearError = useLocationStore((state) => state.clearError);

  // Track the permission so the UI can react and auto-recover when it's re-allowed in settings.
  useEffect(() => {
    watchPermission();
  }, [watchPermission]);

  return {
    position,
    status,
    permission,
    permissionDenied: permission === 'denied',
    error,
    isFetching,
    getCurrentPosition,
    clearError,
  } as const;
}
