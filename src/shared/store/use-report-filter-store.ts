import type { ReportType } from '@prisma/client';
import { create } from 'zustand';
import { DAY_MS } from '@/shared/lib/date/time';

type ReportFilterState = {
  // How far back to show reports, in days. null = all (still bounded by per-type expiry).
  sinceDays: number | null;
  setSinceDays: (days: number | null) => void;
  // Report types to show. Empty = all types.
  types: ReportType[];
  toggleType: (type: ReportType) => void;
  clearTypes: () => void;
};

export const useReportFilterStore = create<ReportFilterState>((set) => ({
  sinceDays: null,
  setSinceDays: (sinceDays) => set({ sinceDays }),
  types: [],
  toggleType: (type) =>
    set((state) => ({
      types: state.types.includes(type) ? state.types.filter((value) => value !== type) : [...state.types, type],
    })),
  clearTypes: () => set({ types: [] }),
}));

// Stable CSV of selected types for query keys and the reports request (empty selection = null = all).
export function reportTypesParam(types: ReportType[]): string | null {
  return types.length ? [...types].sort().join(',') : null;
}

// The filter window as an ISO timestamp for the reports query (null = all). Pure and parametrized
// so the value reactively tracks sinceDays - a store method reading state internally is invisible
// to React Compiler's dependency tracking and would freeze the memoized value.
export function reportsSinceIso(sinceDays: number | null): string | null {
  return sinceDays ? new Date(Date.now() - sinceDays * DAY_MS).toISOString() : null;
}
