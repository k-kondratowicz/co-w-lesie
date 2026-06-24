'use client';

import { SavedAreasList } from '@/features/saved-areas/components/saved-areas-list';
import { useSafetyTargetStore } from '@/shared/store/use-safety-target-store';

// The saved-areas list shown inside the safety assistant. Selecting an area hands it to the
// assistant via the safety-target channel, so the assistant doesn't import the saved-areas
// feature directly (composed at the route instead - ADR 0006).
export function SavedAreasPicker() {
  const requestTarget = useSafetyTargetStore((state) => state.request);

  return <SavedAreasList onSelect={(area) => requestTarget({ lat: area.lat, lng: area.lng, radiusMeters: area.radiusMeters })} />;
}
