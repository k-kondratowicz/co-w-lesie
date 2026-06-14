import type { PopupInfo } from '@/features/map/hooks/use-map-interaction';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/shared/components/ui/drawer';
import { useIsDesktop } from '@/shared/hooks/use-is-desktop';
import { ReportPopupContent } from './report-popup-content';

// Details for the report(s) under a map tap. Dialog on desktop, bottom Drawer on mobile —
// roomy enough for long descriptions, multiple stacked reports and the confirm/flag actions.
export function ReportDetailsOverlay({ info, onClose }: { info: PopupInfo | null; onClose: () => void }) {
  const isDesktop = useIsDesktop();
  const open = info !== null;
  const count = info?.reports.length ?? 0;

  const title = count > 1 ? `Zgłoszenia w tym miejscu (${count})` : 'Szczegóły zgłoszenia';
  const description = 'Potwierdź, jeśli sytuacja nadal aktualna, albo oznacz jako nieaktualną.';

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
    }
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto">{info ? <ReportPopupContent reports={info.reports} /> : null}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>

        <div className="max-h-[60vh] overflow-y-auto px-4 pb-6">
          {info ? <ReportPopupContent reports={info.reports} /> : null}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
