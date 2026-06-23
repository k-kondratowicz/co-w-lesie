import type { RiskLevel } from '@/features/risk/types';

// Single source for how a risk level looks and reads. Shared so a saved area's glanceable status
// is the same colour and wording as its full assessment - in a safety app one signal must never
// look like two different things.
export const RISK_LEVEL_PRESENTATION: Record<RiskLevel, { label: string; dot: string; box: string }> = {
  GREEN: {
    label: 'Niskie ryzyko',
    dot: 'bg-emerald-500',
    box: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  },
  YELLOW: {
    label: 'Zachowaj ostrożność',
    dot: 'bg-amber-500',
    box: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  },
  RED: {
    label: 'Odradzamy wyjście do lasu',
    dot: 'bg-red-500',
    box: 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200',
  },
} as const;
