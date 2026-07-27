'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { ReportFilterContainer } from '@/features/reports/components/report-filter-container';
import { ReportFilterPanel } from '@/features/reports/components/report-filter-panel';
import { useFilterSections } from '@/features/reports/hooks/use-filter-sections';
import { Button } from '@/shared/components/ui/button';

export function ReportFilter() {
  const { sections, hasActiveFilter, clearAll } = useFilterSections();
  const [open, setOpen] = useState(false);

  const trigger = (
    <Button variant="secondary" size="icon-xxl" rounded="full" aria-label="Filtruj zgłoszenia" className="relative shadow-lg">
      <SlidersHorizontal />
      {/* A dot so an active (non-default) filter is visible while the panel is closed. */}
      {hasActiveFilter && <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />}
    </Button>
  );

  const clearButton = (
    <Button variant="ghost" size="sm" onClick={clearAll} disabled={!hasActiveFilter} className="text-muted-foreground">
      Wyczyść filtry
    </Button>
  );

  return (
    <ReportFilterContainer open={open} onOpenChange={setOpen} trigger={trigger} actions={clearButton}>
      <ReportFilterPanel sections={sections} />
    </ReportFilterContainer>
  );
}
