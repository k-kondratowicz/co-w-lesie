import { type PropsWithChildren, useCallback, useEffect } from 'react';
import { LocationPermissionHelp } from '@/shared/components/location-permission-help';
import { Spinner } from '@/shared/components/ui';
import { useGeolocation } from '@/shared/hooks/use-geolocation';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { useFieldContext } from '../form-hooks';
import { FieldBase, type FieldControlProps } from './field-base';

export function FieldLocation(props: FieldControlProps & PropsWithChildren) {
  const field = useFieldContext<number[] | undefined>();
  const {
    position: userPosition,
    isFetching,
    error: locationError,
    permissionDenied,
    getCurrentPosition,
    clearError,
  } = useGeolocation();

  const fetchLocation = useCallback(() => {
    clearError();

    getCurrentPosition()
      .then((coords) => {
        // Stored as [lng, lat] (GeoJSON order), consistent across the app.
        field.handleChange([coords.longitude, coords.latitude]);
      })
      .catch(() => {
        // The Polish, code-aware message is set on the location store (shown below).
      });
  }, [field, getCurrentPosition, clearError]);

  useEffect(() => {
    if (userPosition && (!field.state.value || field.state.value.length === 0)) {
      field.handleChange([userPosition.longitude, userPosition.latitude]);
    }
  }, [userPosition, field]);

  const [lng, lat] = field.state.value ?? [undefined, undefined];

  return (
    <FieldBase {...props}>
      <div className="grid gap-2">
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
        {!permissionDenied ? (
          <Button type="button" variant="outline" size="sm" onClick={fetchLocation} disabled={isFetching}>
            {isFetching && <Spinner />}

            {!lat || !lng ? 'Pobierz lokalizację' : 'Odśwież lokalizację'}
          </Button>
        ) : null}

        {props.children}

        {permissionDenied ? (
          <LocationPermissionHelp message={locationError ?? undefined} />
        ) : locationError ? (
          <p className="text-destructive text-sm">{locationError}</p>
        ) : null}
      </div>
    </FieldBase>
  );
}
