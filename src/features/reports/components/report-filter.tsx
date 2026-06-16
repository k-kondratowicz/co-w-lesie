'use client';

import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/shared/components/ui/drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/components/ui/popover';
import { useIsDesktop } from '@/shared/hooks/use-is-desktop';
import { useReportFilterStore } from '@/shared/store/use-report-filter-store';

const OPTIONS = [
  { value: 'all', label: 'Wszystkie zgłoszenia' },
  { value: '1', label: 'Ostatnie 24h' },
  { value: '3', label: 'Ostatnie 3 dni' },
  { value: '7', label: 'Ostatni tydzień' },
];

function FilterOptions({ value, onSelect }: { value: string; onSelect: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      {OPTIONS.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? 'secondary' : 'ghost'}
          className="justify-start"
          onClick={() => onSelect(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}

export function ReportFilter() {
  const sinceDays = useReportFilterStore((state) => state.sinceDays);
  const setSinceDays = useReportFilterStore((state) => state.setSinceDays);
  const isDesktop = useIsDesktop();
  const [open, setOpen] = useState(false);

  const value = sinceDays === null ? 'all' : String(sinceDays);

  const handleSelect = (next: string) => {
    setSinceDays(next === 'all' ? null : Number(next));
    setOpen(false);
  };

  const trigger = (
    <Button variant="secondary" size="icon-xxl" rounded="full" aria-label="Filtruj zgłoszenia" className="relative shadow-lg">
      <SlidersHorizontal />
      {/* A dot so an active (non-default) filter is visible while the panel is closed. */}
      {sinceDays !== null && (
        <span className="absolute top-0.5 right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-background" />
      )}
    </Button>
  );

  if (isDesktop) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{trigger}</PopoverTrigger>
        <PopoverContent align="start" side="right" className="w-56 p-1">
          <FilterOptions value={value} onSelect={handleSelect} />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{trigger}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Filtruj zgłoszenia</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <FilterOptions value={value} onSelect={handleSelect} />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
