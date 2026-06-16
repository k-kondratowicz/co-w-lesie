import { create } from 'zustand';
import { DAY_MS } from '@/shared/lib/time';

type ReportFilterState = {
  // How far back to show reports, in days. null = all (still bounded by per-type expiry).
  sinceDays: number | null;
  setSinceDays: (days: number | null) => void;
};

export const useReportFilterStore = create<ReportFilterState>((set) => ({
  sinceDays: null,
  setSinceDays: (sinceDays) => set({ sinceDays }),
}));

// The filter window as an ISO timestamp for the reports query (null = all). Pure and parametrized
// so the value reactively tracks sinceDays — a store method reading state internally is invisible
// to React Compiler's dependency tracking and would freeze the memoized value.
export function reportsSinceIso(sinceDays: number | null): string | null {
  return sinceDays ? new Date(Date.now() - sinceDays * DAY_MS).toISOString() : null;
}
