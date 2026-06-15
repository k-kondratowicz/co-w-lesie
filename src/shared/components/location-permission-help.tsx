import { MapPinOff } from 'lucide-react';

// Shown when geolocation is hard-blocked in the browser. We can't re-prompt programmatically,
// so we explain how to re-enable it - the store auto-recovers the moment they do.
export function LocationPermissionHelp({ message }: { message?: string }) {
  return (
    <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
      <MapPinOff className="mt-0.5 size-4 shrink-0 text-destructive" />

      <div className="space-y-1">
        <p className="font-medium text-destructive">{message ?? 'Dostęp do lokalizacji jest zablokowany.'}</p>
        <p className="text-muted-foreground text-xs">
          Kliknij ikonę kłódki (lub lokalizacji) po lewej stronie adresu strony → „Ustawienia witryny" → zezwól na lokalizację. Po
          zmianie odświeżymy ją automatycznie.
        </p>
      </div>
    </div>
  );
}
