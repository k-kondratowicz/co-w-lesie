import type { PopupInfo } from '@/features/core/report';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogScrollArea,
  ResponsiveDialogTitle,
} from '@/shared/components/ui/responsive-dialog';
import { ReportPopupContent } from './report-popup-content';

// Details for the report(s) under a map tap - roomy enough for long descriptions, multiple
// stacked reports and the confirm/flag actions (Dialog on desktop, bottom Drawer on mobile).
export function ReportDetailsOverlay({ info, onClose }: { info: PopupInfo | null; onClose: () => void }) {
  const count = info?.reports.length ?? 0;
  const title = count > 1 ? `Zgłoszenia w tym miejscu (${count})` : 'Szczegóły zgłoszenia';

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
    }
  };

  return (
    <ResponsiveDialog open={info !== null} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Potwierdź, jeśli sytuacja nadal aktualna, albo oznacz jako nieaktualną.
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <ResponsiveDialogScrollArea>{info ? <ReportPopupContent reports={info.reports} /> : null}</ResponsiveDialogScrollArea>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
