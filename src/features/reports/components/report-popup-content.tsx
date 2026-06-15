'use client';

import type { ReportType } from '@prisma/client';
import { CheckCircle2, ThumbsDown } from 'lucide-react';
import type { PopupReport } from '@/features/map/hooks/use-map-interaction';
import { useReportVote } from '@/features/reports/hooks/use-report-vote';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { Button } from '@/shared/components/ui/button';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';

const personPluralRules = new Intl.PluralRules('pl');

// "1 osobę" / "2 osoby" / "5 osób" - Polish plural via Intl.PluralRules (one/few/many).
function confirmationsLabel(count: number): string {
  const form = personPluralRules.select(count);
  const noun = form === 'one' ? 'osobę' : form === 'few' ? 'osoby' : 'osób';

  return `Potwierdzone przez ${count} ${noun}`;
}

function formatExpiry(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Report list for the details overlay: type, age, end date, confirmations, and the confirm/flag
// actions that let the crowd keep the data accurate.
export function ReportPopupContent({ reports }: { reports: PopupReport[] }) {
  const { vote, isVoting, votedKind } = useReportVote();

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const voted = votedKind(report.id);

        return (
          <div key={report.id} className="space-y-1.5 border-border/60 border-b pb-3 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">{reportTypeLabel(report.type as ReportType)}</p>
              {report.createdAt ? (
                <span className="shrink-0 text-muted-foreground text-xs">{formatRelativeTime(report.createdAt)}</span>
              ) : null}
            </div>

            {report.description ? <p className="text-sm">{report.description}</p> : null}

            {report.confirmations > 0 ? (
              <p className="text-muted-foreground text-xs">{confirmationsLabel(report.confirmations)}</p>
            ) : null}

            {report.expiresAt ? (
              <p className="text-muted-foreground text-xs">Aktualne do: {formatExpiry(report.expiresAt)}</p>
            ) : null}

            <div className="flex gap-2 pt-0.5">
              <Button
                type="button"
                size="sm"
                variant={voted === 'CONFIRM' ? 'default' : 'outline'}
                className="h-7 flex-1 text-xs"
                disabled={isVoting || Boolean(voted)}
                onClick={() => vote({ id: report.id, kind: 'CONFIRM' })}
              >
                <CheckCircle2 className="size-3.5" />
                Potwierdzam
              </Button>
              <Button
                type="button"
                size="sm"
                variant={voted === 'FLAG' ? 'default' : 'outline'}
                className="h-7 flex-1 text-xs"
                disabled={isVoting || Boolean(voted)}
                onClick={() => vote({ id: report.id, kind: 'FLAG' })}
              >
                <ThumbsDown className="size-3.5" />
                Nieaktualne
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
