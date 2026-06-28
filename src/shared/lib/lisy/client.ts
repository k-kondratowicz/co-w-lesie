import { LISY_FETCH_TIMEOUT_MS, LISY_SOURCE_URL } from './config';

// Network boundary: fetch the raw schedule HTML. Kept apart from parse.ts so the parser stays
// pure and unit-testable, and apart from sync.ts so a test can stub the HTML.
export async function fetchScheduleHtml(): Promise<string> {
  const response = await fetch(LISY_SOURCE_URL, {
    headers: { 'user-agent': 'co-w-lesie/1.0 (+https://co-w-lesie.pl)' },
    signal: AbortSignal.timeout(LISY_FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`lisy.info responded ${response.status}`);
  }

  return response.text();
}
