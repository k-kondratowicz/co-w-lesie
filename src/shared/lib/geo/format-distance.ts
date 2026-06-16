// Human-readable distance: metres under 1 km, otherwise km (integer-aware, so 5000 → "5 km").
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  const km = meters / 1000;

  return `${Number.isInteger(km) ? km : km.toFixed(1)} km`;
}
