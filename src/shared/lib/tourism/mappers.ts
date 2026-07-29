import type { TourismPoiKind } from './types';

// Pure transforms from raw BDL tourism attributes to our domain shapes. No I/O - unit-testable.

const KIND_BY_DESCRIPTION: Record<string, TourismPoiKind> = {
  'Parkingi leśne': 'PARKING',
  'Miejsca postoju pojazdów': 'VEHICLE_STOP',
  'Miejsca biwakowania': 'CAMP_SITE',
  'Pola biwakowe': 'CAMP_FIELD',
};

/**
 * Maps BDL's `tur_obj_desc` free text onto our kind codes. Returns null for anything we do not
 * import - including a reworded label, which must be dropped rather than guessed at, so the sync
 * reports it as skipped instead of storing a point under the wrong layer.
 */
export function descriptionToKind(description: string | null): TourismPoiKind | null {
  if (!description) {
    return null;
  }

  return KIND_BY_DESCRIPTION[description.trim()] ?? null;
}

/**
 * Object name for the popup. BDL fills `nzw_ob` inconsistently - blanks and the layer-wide
 * placeholder "Zanocuj w lesie" carry no information, so they become null and the UI falls back
 * to the layer label.
 */
export function tourismObjectName(name: string | null): string | null {
  const trimmed = name?.trim();
  if (!trimmed || trimmed.toLowerCase() === 'zanocuj w lesie') {
    return null;
  }

  return trimmed;
}
