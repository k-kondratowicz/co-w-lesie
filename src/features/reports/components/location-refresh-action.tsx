'use client';

import { LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/shared/components/ui/button';
import { useGeolocation } from '@/shared/hooks/use-geolocation';

export function LocationRefreshAction() {
  const { getCurrentPosition, isFetching, permissionDenied } = useGeolocation();

  const refreshLocation = async () => {
    // Blocked permission can't be re-prompted - point the user to browser settings instead.
    if (permissionDenied) {
      toast.error('Dostęp do lokalizacji jest zablokowany. Włącz go w ustawieniach przeglądarki (ikona kłódki obok adresu).');
      return;
    }

    try {
      // Explicit user action: bypass the jitter deadband so the map always re-centers/zooms.
      await getCurrentPosition({ force: true });
    } catch {
      // error is handled in the global location store
    }
  };

  return (
    <Button onClick={refreshLocation} variant="outline" size="icon-xxl" className="rounded-full" disabled={isFetching}>
      <LocateFixed className="size-5" />
      <span className="sr-only">Odśwież lokalizację</span>
    </Button>
  );
}
