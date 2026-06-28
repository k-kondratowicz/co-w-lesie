// lisy.info fox-vaccine schedule ingestion tunables. The page is a hand-maintained static HTML
// table (Aeroklub Ziemi Lubuskiej, in cooperation with GIW) - there is no API. Keep magic values
// here, validate every scraped row (schemas.ts), and treat a sync failure as UNKNOWN, never "safe".

export const LISY_SOURCE_URL = 'https://lisy.info/harmonogram.php';

// The schedule gives a date range; the user-facing advisory runs from two weeks before the drop
// starts to two weeks after it ends. Baits stay in the field and on the ground for roughly that
// long, and the pre-window warns walkers before crews arrive.
export const VACCINATION_WINDOW_DAYS = 14;

// Polish month names in the genitive case, as written on the page ("16-19 kwietnia").
export const PL_MONTHS: Record<string, number> = {
  stycznia: 1,
  lutego: 2,
  marca: 3,
  kwietnia: 4,
  maja: 5,
  czerwca: 6,
  lipca: 7,
  sierpnia: 8,
  września: 9,
  października: 10,
  listopada: 11,
  grudnia: 12,
};

// The 16 voivodeship names exactly as GUS PRG spells them (lowercase), which is also how the
// voivodeship table stores them - so a scraped name maps to a polygon by lowercased equality.
export const VOIVODESHIPS: ReadonlySet<string> = new Set([
  'dolnośląskie',
  'kujawsko-pomorskie',
  'lubelskie',
  'lubuskie',
  'łódzkie',
  'małopolskie',
  'mazowieckie',
  'opolskie',
  'podkarpackie',
  'podlaskie',
  'pomorskie',
  'śląskie',
  'świętokrzyskie',
  'warmińsko-mazurskie',
  'wielkopolskie',
  'zachodniopomorskie',
]);

export const LISY_FETCH_TIMEOUT_MS = 15_000;

// Shown when the user's point falls in a voivodeship with an active campaign. Informational only -
// rabies baiting is a handling caution, not a reason to keep people out of the forest, so it never
// touches the GREEN/YELLOW/RED score (mirrors the KMZB advisory decision).
export const VACCINATION_ADVISORY_PL =
  'Trwa akcja szczepienia lisów przeciw wściekliźnie (przynęty ze szczepionką). Nie dotykaj znalezionych przynęt i trzymaj psa na smyczy.';
