// Pure transforms from raw BDL attribute strings to our domain shapes. No I/O — unit-testable.

/**
 * Fire-hazard degree lives in the layer's `kod` field as a string:
 * "-1" = area not covered by the forecast, "0".."3" = hazard level.
 * Returns null for "-1" and anything outside 0..3, so uncovered areas become UNKNOWN
 * (no row stored) rather than being treated as "no hazard".
 */
export function fireKodToDegree(kod: string): number | null {
  const degree = Number.parseInt(kod, 10);
  if (!Number.isInteger(degree) || degree < 0 || degree > 3) {
    return null;
  }
  return degree;
}

/**
 * BDL serializes timestamps as strings in two inconsistent formats:
 *   - "YYYY-MM-DD HH:MM:SS" (e.g. the fire/ban `data` field)
 *   - "DD-MM-YYYY HH:MM:SS" (e.g. the ban `data_koncowa` field)
 * Returns null on anything unparseable.
 */
export function parseBdlDateTime(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();

  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day, hours, minutes, seconds] = isoMatch;
    return makeUtcDate(+year, +month, +day, +hours, +minutes, +seconds);
  }

  const polishMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (polishMatch) {
    const [, day, month, year, hours, minutes, seconds] = polishMatch;
    return makeUtcDate(+year, +month, +day, +hours, +minutes, +seconds);
  }

  return null;
}

function makeUtcDate(year: number, month: number, day: number, hours: number, minutes: number, seconds: number): Date | null {
  const date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
  // Date.UTC normalizes overflow (e.g. month 13 -> next year), so reject inputs whose
  // components don't round-trip — "2025-13-40 99:99:99" must be null, not a valid date.
  const roundTrips =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hours &&
    date.getUTCMinutes() === minutes &&
    date.getUTCSeconds() === seconds;
  return roundTrips ? date : null;
}

/** Combines the fire layer's `data` (date) + `godz` (hour) into the forecast timestamp. */
export function fireUpdatedAt(data: string, godz: string): Date | null {
  const hour = Number.parseInt(godz, 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return parseBdlDateTime(`${data} 00:00:00`);
  }
  return parseBdlDateTime(`${data} ${String(hour).padStart(2, '0')}:00:00`);
}

/** Human-readable ban reason: prefer the free-text `opis`, fall back to the coded `kod`. */
export function banReason(kod: string | null, opis: string | null): string | null {
  const trimmedOpis = opis?.trim();
  if (trimmedOpis) {
    return trimmedOpis;
  }
  const trimmedKod = kod?.trim();
  return trimmedKod || null;
}
