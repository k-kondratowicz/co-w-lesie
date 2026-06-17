// Pure transforms from raw BDL attribute strings to our domain shapes. No I/O - unit-testable.

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
 * The clock is Polish local time (no zone marker), so we interpret it as Europe/Warsaw.
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
    return makeWarsawDate(+year, +month, +day, +hours, +minutes, +seconds);
  }

  const polishMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})[ T](\d{2}):(\d{2}):(\d{2})$/);
  if (polishMatch) {
    const [, day, month, year, hours, minutes, seconds] = polishMatch;
    return makeWarsawDate(+year, +month, +day, +hours, +minutes, +seconds);
  }

  return null;
}

const warsawWallClockParts = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Europe/Warsaw',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

type WallClock = { year: number; month: number; day: number; hours: number; minutes: number; seconds: number };

function warsawWallClock(instant: number): WallClock {
  const parts = warsawWallClockParts.formatToParts(new Date(instant));
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const hours = value('hour');

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hours: hours === 24 ? 0 : hours, // some engines emit "24" for midnight
    minutes: value('minute'),
    seconds: value('second'),
  };
}

// Treats the components as a Europe/Warsaw wall-clock time and returns the matching UTC instant.
// DST-aware: we measure the zone's offset at the candidate instant (refined twice to settle across
// spring/autumn transitions). Rejects inputs that don't round-trip - "2025-13-40 99:99:99" -> null.
function makeWarsawDate(year: number, month: number, day: number, hours: number, minutes: number, seconds: number): Date | null {
  const target = Date.UTC(year, month - 1, day, hours, minutes, seconds);

  let instant = target;
  for (let pass = 0; pass < 2; pass += 1) {
    const local = warsawWallClock(instant);
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hours, local.minutes, local.seconds);
    instant = target - (localAsUtc - instant);
  }

  const check = warsawWallClock(instant);
  const roundTrips =
    check.year === year &&
    check.month === month &&
    check.day === day &&
    check.hours === hours &&
    check.minutes === minutes &&
    check.seconds === seconds;

  return roundTrips ? new Date(instant) : null;
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
