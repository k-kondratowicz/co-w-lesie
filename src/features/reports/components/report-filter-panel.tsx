'use client';

import type { FilterSection } from '@/features/reports/hooks/use-filter-sections';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/components/ui/accordion';
import { Button } from '@/shared/components/ui/button';

export function ReportFilterPanel({ sections }: { sections: FilterSection[] }) {
  return (
    <Accordion type="multiple" defaultValue={sections.map((section) => section.id)}>
      {sections.map((section) => (
        <AccordionItem key={section.id} value={section.id}>
          <AccordionTrigger>
            <span className="flex flex-col">
              {section.label}
              <span className="font-normal text-muted-foreground text-xs">{section.summary}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="flex flex-col gap-0.5 pt-1">
            {section.options.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant={option.active ? 'secondary' : 'ghost'}
                className="justify-start"
                onClick={option.onSelect}
              >
                {option.label}
              </Button>
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
