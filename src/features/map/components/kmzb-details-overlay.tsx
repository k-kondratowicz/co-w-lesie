import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogScrollArea,
  ResponsiveDialogTitle,
} from '@/shared/components/ui/responsive-dialog';
import { formatDate, formatDateTime } from '@/shared/lib/date/format-date';

// A tapped KMZB incident. Police-sourced, so it has no confirm/flag actions - it's read-only,
// distinct from the user-report overlay.
export type KmzbPopupInfo = {
  lng: number;
  lat: number;
  type: string;
  status: string;
  eventAt: string | null;
  createdAt: string;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-border/60 border-b py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export function KmzbDetailsOverlay({ info, onClose }: { info: KmzbPopupInfo | null; onClose: () => void }) {
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      onClose();
    }
  };

  return (
    <ResponsiveDialog open={info !== null} onOpenChange={handleOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{info?.type ?? 'Zgłoszenie policyjne'}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>Zgłoszenie z Krajowej Mapy Zagrożeń Bezpieczeństwa (Policja).</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {info ? (
          <ResponsiveDialogScrollArea>
            <div className="space-y-3 pb-4">
              <div className="rounded-lg border border-border/60 px-3">
                <Row label="Status" value={info.status} />
                {info.eventAt ? (
                  <Row label="Data zdarzenia" value={formatDate(info.eventAt)} />
                ) : (
                  <Row label="Zgłoszono" value={formatDateTime(info.createdAt)} />
                )}
              </div>

              <div className="rounded-lg bg-amber-50 p-3 text-amber-800 text-sm dark:bg-amber-950 dark:text-amber-200">
                W przypadku pilnej interwencji należy zgłosić dane zdarzenie korzystając z numeru alarmowego (tel. 112).
              </div>

              <p className="text-muted-foreground text-xs">Źródło: KMZB (Policja).</p>
            </div>
          </ResponsiveDialogScrollArea>
        ) : null}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
