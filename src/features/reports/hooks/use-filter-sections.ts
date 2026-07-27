'use client';

import type { ReportType } from '@prisma/client';
import { REPORT_TYPE_LABELS } from '@/features/reports/utils/report-type-labels';
import { useReportFilterStore } from '@/shared/store/use-report-filter-store';

const SINCE_OPTIONS = [
  { value: 'all', label: 'Wszystkie zgłoszenia' },
  { value: '1', label: 'Ostatnie 24h' },
  { value: '3', label: 'Ostatnie 3 dni' },
  { value: '7', label: 'Ostatni tydzień' },
];

const TYPE_OPTIONS = Object.entries(REPORT_TYPE_LABELS) as [ReportType, string][];

export type FilterOption = {
  key: string;
  label: string;
  active: boolean;
  onSelect: () => void;
};

export type FilterSection = {
  id: string;
  label: string;
  summary: string;
  options: FilterOption[];
};

export function useFilterSections(): { sections: FilterSection[]; hasActiveFilter: boolean; clearAll: () => void } {
  const sinceDays = useReportFilterStore((state) => state.sinceDays);
  const setSinceDays = useReportFilterStore((state) => state.setSinceDays);
  const types = useReportFilterStore((state) => state.types);
  const toggleType = useReportFilterStore((state) => state.toggleType);
  const clearTypes = useReportFilterStore((state) => state.clearTypes);

  const sinceValue = sinceDays === null ? 'all' : String(sinceDays);

  const since: FilterSection = {
    id: 'since',
    label: 'Okres',
    summary: SINCE_OPTIONS.find((option) => option.value === sinceValue)?.label ?? 'Wszystkie zgłoszenia',
    options: SINCE_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      active: sinceValue === option.value,
      onSelect: () => setSinceDays(option.value === 'all' ? null : Number(option.value)),
    })),
  };

  const type: FilterSection = {
    id: 'types',
    label: 'Typ zgłoszenia',
    summary: types.length === 0 ? 'Wszystkie typy' : `Wybrane (${types.length})`,
    options: [
      {
        key: 'all',
        label: 'Wszystkie typy',
        active: types.length === 0,
        onSelect: clearTypes,
      },
      ...TYPE_OPTIONS.map(([value, label]) => ({
        key: value,
        label,
        active: types.includes(value),
        onSelect: () => toggleType(value),
      })),
    ],
  };

  const clearAll = () => {
    setSinceDays(null);
    clearTypes();
  };

  return {
    sections: [since, type],
    hasActiveFilter: sinceDays !== null || types.length > 0,
    clearAll,
  };
}
