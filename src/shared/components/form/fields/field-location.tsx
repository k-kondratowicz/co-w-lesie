import { useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/shared/components/ui';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useFieldContext } from '../form-hooks';
import { FieldBase, type FieldControlProps } from './field-base';

export function FieldLocation(props: FieldControlProps) {
  const field = useFieldContext<number[] | undefined>();
  const [error, setError] = useState<string | null>(null);
  const { position: userPosition, isFetching, error: locationError, getCurrentPosition, clearError } = useGeolocation();

  const fetchLocation = useCallback(() => {
    setError(null);
    clearError();

    getCurrentPosition()
      .then((coords) => {
        // Stored as [lng, lat] (GeoJSON order), consistent across the app.
        field.handleChange([coords.longitude, coords.latitude]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err ?? locationError ?? 'Nie udało się pobrać lokalizacji.'));
      });
  }, [field, getCurrentPosition, locationError, clearError]);

  useEffect(() => {
    if (userPosition && (!field.state.value || field.state.value.length === 0)) {
      field.handleChange([userPosition.longitude, userPosition.latitude]);
    }
  }, [userPosition, field]);

  const [lng, lat] = field.state.value ?? [undefined, undefined];

  return (
    <FieldBase {...props}>
      <div className="grid gap-3">
        <div className="flex gap-2">
          <Input
            id={`${field.name}-lat`}
            value={lat ?? ''}
            readOnly
            placeholder="Szerokość"
            aria-label="Szerokość geograficzna"
            disabled
          />
          <Input
            id={`${field.name}-lng`}
            value={lng ?? ''}
            readOnly
            placeholder="Długość"
            aria-label="Długość geograficzna"
            disabled
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={fetchLocation} disabled={isFetching}>
          {isFetching && <Spinner />}

          {!lat || !lng ? 'Pobierz lokalizację' : 'Odśwież lokalizację'}
        </Button>
        {error ? <p className="text-destructive text-sm">{error}</p> : null}
      </div>
    </FieldBase>
  );
}
