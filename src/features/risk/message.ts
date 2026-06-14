import { fireDegreeRoman } from './format';
import type { RiskResult } from './types';

// Deterministic Polish assistant message. Pure and template-based — no model, no randomness —
// so it is fully testable and never says something the score doesn't support.

const DISCLAIMER = 'To ocena pomocnicza i nie zastępuje komunikatów Lasów Państwowych.';

/** Whether each nationwide signal was actually known (vs UNKNOWN: outside coverage / sync down). */
export type RiskMessageContext = { fireKnown: boolean; banKnown: boolean };

function reportsWord(n: number): string {
  if (n === 1) {
    return 'zgłoszenie';
  }
  const tens = n % 100;
  const ones = n % 10;
  if (ones >= 2 && ones <= 4 && !(tens >= 12 && tens <= 14)) {
    return 'zgłoszenia';
  }
  return 'zgłoszeń';
}

function formatKm(meters: number): string {
  const km = meters / 1000;
  return Number.isInteger(km) ? String(km) : km.toFixed(1);
}

function fireClause(degree: 0 | 1 | 2 | 3 | null): string {
  return degree && degree > 0 ? `, stopień zagrożenia pożarowego ${fireDegreeRoman(degree)}` : '';
}

export function buildRiskMessage(result: RiskResult, context: RiskMessageContext): string {
  const { level, signals, radiusMeters } = result;
  const n = signals.reports.count;
  const km = formatKm(radiusMeters);
  const degree = signals.fire.degree;

  if (signals.entryBan.active) {
    return 'Obowiązuje zakaz wstępu do lasu w tym rejonie - odradzamy wyjście.';
  }
  if (degree === 3) {
    return 'Ekstremalne zagrożenie pożarowe (III stopień) - odradzamy wyjście do lasu.';
  }

  // Safety rule: never imply "safe" when we could not confirm the nationwide signals.
  if (level !== 'RED' && (!context.fireKnown || !context.banKnown)) {
    return `Nie udało się potwierdzić wszystkich warunków w tym miejscu - zachowaj ostrożność. ${DISCLAIMER}`;
  }

  if (level === 'RED') {
    return `Wysokie ryzyko w pobliżu: ${n} ${reportsWord(n)} w promieniu ${km} km${fireClause(degree)}. Zachowaj szczególną ostrożność.`;
  }
  if (level === 'YELLOW') {
    return `Zachowaj ostrożność: ${n} ${reportsWord(n)} w promieniu ${km} km${fireClause(degree)}.`;
  }
  // GREEN. Never imply "nothing here" when there are nearby reports — acknowledge them.
  if (n > 0) {
    return `W pobliżu odnotowano ${n} ${reportsWord(n)} w promieniu ${km} km, ale poziom ryzyka jest niski. Zachowaj zwykłą ostrożność. ${DISCLAIMER}`;
  }
  return `Brak znanych zagrożeń w pobliżu. ${DISCLAIMER}`;
}
