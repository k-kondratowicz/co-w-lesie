// Per-visitor cap, so an anonymous bearer cannot fill the table indefinitely.
export const MAX_SAVED_AREAS_PER_VISITOR = 10;

export const MIN_AREA_RADIUS_METERS = 500;
export const MAX_AREA_RADIUS_METERS = 15000;

export const MAX_AREA_NAME_LENGTH = 80;

// Two saves of the same spot differ only by GPS jitter, far below the area size (min radius 500m).
// A new center within this buffer of an existing same-radius area is treated as the same area, so
// re-opening the app and saving "my location" again does not spawn a near-identical duplicate.
export const DUPLICATE_BUFFER_RADIUS_FRACTION = 0.1;
export const DUPLICATE_BUFFER_MIN_METERS = 100;
