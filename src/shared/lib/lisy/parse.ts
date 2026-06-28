import { PL_MONTHS, VOIVODESHIPS } from './config';

// Pure parsing of the lisy.info schedule HTML - no I/O, so it is unit-testable against a fixture.
// One ScheduleRow per (date range x voivodeship); the season headings on the page are ignored
// because the stored signal is purely date + voivodeship. Rows that fail to parse (unknown month,
// unexpected voivodeship name, placeholder "--") are reported, not silently dropped, so a page
// restyle surfaces loudly instead of quietly shrinking the dataset (safety: missing != safe).

export type ScheduleRow = {
  year: number;
  voivodeship: string;
  startDate: string; // ISO yyyy-mm-dd
  endDate: string;
};

export type ParseResult = {
  year: number;
  rows: ScheduleRow[];
  problems: string[];
};

const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

type DateRange = { start: string; end: string };

// Accepts "16-19 kwietnia" (same month), "29 maja - 2 czerwca" (cross month) and "5 maja"
// (single day). Returns null for the "--" placeholder rows and undefined when unparseable.
export function parseDateRange(text: string, year: number): DateRange | null | undefined {
  const t = text.toLowerCase().replace(/\s+/g, ' ').trim();
  if (t === '' || t === '--') {
    return null;
  }

  const cross = t.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)\s*-\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)$/);
  if (cross) {
    const [, d1, m1, d2, m2] = cross;
    if (!PL_MONTHS[m1] || !PL_MONTHS[m2]) {
      return undefined;
    }
    return {
      start: iso(year, PL_MONTHS[m1], Number(d1)),
      end: iso(year, PL_MONTHS[m2], Number(d2)),
    };
  }

  const sameMonth = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([a-ząćęłńóśźż]+)$/);
  if (sameMonth) {
    const [, d1, d2, m] = sameMonth;
    if (!PL_MONTHS[m]) {
      return undefined;
    }
    return {
      start: iso(year, PL_MONTHS[m], Number(d1)),
      end: iso(year, PL_MONTHS[m], Number(d2)),
    };
  }

  const single = t.match(/^(\d{1,2})\s+([a-ząćęłńóśźż]+)$/);
  if (single) {
    const [, d, m] = single;
    if (!PL_MONTHS[m]) {
      return undefined;
    }
    return {
      start: iso(year, PL_MONTHS[m], Number(d)),
      end: iso(year, PL_MONTHS[m], Number(d)),
    };
  }

  return undefined;
}

function parseYear(html: string): number | null {
  const match = html.match(/Harmonogram szczepień lisów\D+(\d{4})/);

  return match ? Number(match[1]) : null;
}

export function parseSchedule(html: string): ParseResult {
  const year = parseYear(html);
  if (year === null) {
    return {
      year: 0,
      rows: [],
      problems: ['could not find the schedule year in the page heading'],
    };
  }

  const rows: ScheduleRow[] = [];
  const problems: string[] = [];

  const dataRows = html.matchAll(/<tr>\s*<td>([\s\S]*?)<\/td>\s*<td>([\s\S]*?)<\/td>\s*<\/tr>/g);
  for (const [, dateCell, voivCell] of dataRows) {
    const dateText = stripTags(dateCell);
    const range = parseDateRange(dateText, year);
    if (range === null) {
      continue; // "--" placeholder season
    }
    if (range === undefined) {
      problems.push(`unparseable date "${dateText}"`);
      continue;
    }

    const names = stripTags(voivCell)
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name !== '' && name !== '--');

    for (const name of names) {
      if (!VOIVODESHIPS.has(name)) {
        problems.push(`unknown voivodeship "${name}" in "${dateText}"`);
        continue;
      }
      rows.push({
        year,
        voivodeship: name,
        startDate: range.start,
        endDate: range.end,
      });
    }
  }

  return {
    year,
    rows,
    problems,
  };
}
