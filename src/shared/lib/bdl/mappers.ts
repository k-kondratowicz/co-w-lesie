// Pure transforms from raw BDL attribute strings to our domain shapes. No I/O - unit-testable.

/**
 * Fire-hazard degree lives in the layer's `kod` field as a string (per the layer's legend):
 * "-2" = no data (e.g. outside the fire season), "-1" = area not covered by the forecast,
 * "0".."3" = hazard level. Returns null for anything but an exact 0..3 - a lenient parse would read
 * "2.5" or "0unknown" as a valid lower degree and could overwrite a degree-III zone.
 */
export function fireCodeToDegree(code: string): number | null {
  const normalizedCode = code.trim();
  if (!/^[0-3]$/.test(normalizedCode)) {
    return null;
  }

  return Number(normalizedCode);
}

const NO_FORECAST_CODES = new Set(['-1', '-2']);

/** BDL's explicit "nothing forecast here" codes - unlike an unrecognised code, a legitimate gap. */
export function isNoForecastCode(code: string): boolean {
  return NO_FORECAST_CODES.has(code.trim());
}

/**
 * BDL serializes timestamps inconsistently:
 *   - "YYYY-MM-DD HH:MM:SS" (e.g. the fire `data` field)
 *   - "DD-MM-YYYY HH:MM:SS" (the ban `data_koncowa` field before Oct 2026)
 *   - epoch milliseconds (ban `data` / `data_koncowa` since BDL made them date fields)
 * The clock is Polish local time (no zone marker), so we interpret it as Europe/Warsaw.
 * Returns null on anything unparseable.
 */
export function parseBdlDateTime(value: string | number | null | undefined): Date | null {
  if (typeof value === 'number') {
    return parseBdlEpoch(value);
  }

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

// The layer sets no dateFieldsTimeReference, so ArcGIS emits the stored Polish wall clock as UTC (bans arrive
// as 00:00Z). Reading the UTC fields as Warsaw time keeps a ban ending when the old "DD-MM-YYYY" string did.
function parseBdlEpoch(epochMs: number): Date | null {
  const wallClock = new Date(epochMs);
  if (Number.isNaN(wallClock.getTime())) {
    return null;
  }

  return makeWarsawDate(
    wallClock.getUTCFullYear(),
    wallClock.getUTCMonth() + 1,
    wallClock.getUTCDate(),
    wallClock.getUTCHours(),
    wallClock.getUTCMinutes(),
    wallClock.getUTCSeconds(),
  );
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
export function fireUpdatedAt(date: string, rawHour: string): Date | null {
  const hour = Number.parseInt(rawHour, 10);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    return parseBdlDateTime(`${date} 00:00:00`);
  }
  return parseBdlDateTime(`${date} ${String(hour).padStart(2, '0')}:00:00`);
}

/** Human-readable ban reason: prefer the free-text `opis`, fall back to the coded `kod`. */
export function banReason(code: string | null, description: string | null): string | null {
  const trimmedDescription = description?.trim();
  if (trimmedDescription) {
    return trimmedDescription;
  }
  const trimmedCode = code?.trim();
  return trimmedCode || null;
}
