// Pure formatting for risk-domain values, shared by the engine message and the UI.

const ROMAN_BY_DEGREE: Record<1 | 2 | 3, string> = { 1: 'I', 2: 'II', 3: 'III' };

/** Fire-hazard degree (1..3) as a Roman numeral. */
export function fireDegreeRoman(degree: 1 | 2 | 3): string {
  return ROMAN_BY_DEGREE[degree];
}
