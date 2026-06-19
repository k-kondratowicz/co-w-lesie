'use client';

import { CheckCircle2, Share2, ThumbsDown } from 'lucide-react';
import type { PopupReport } from '@/features/map/hooks/use-map-interaction';
import { ReportImage } from '@/features/reports/components/report-image';
import { useReportVote } from '@/features/reports/hooks/use-report-vote';
import { useShareReport } from '@/features/reports/hooks/use-share-report';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { Button } from '@/shared/components/ui/button';
import { formatDateTime } from '@/shared/lib/format-date';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { plPlural } from '@/shared/lib/pl-plural';

function confirmationsLabel(count: number): string {
  return `Potwierdzone przez ${count} ${plPlural(count, { one: 'osobę', few: 'osoby', many: 'osób' })}`;
}

export function ReportPopupContent({ reports }: { reports: PopupReport[] }) {
  const { vote, isVoting, votedKind } = useReportVote();
  const shareReport = useShareReport();

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const voted = votedKind(report.id);

        return (
          <div key={report.id} className="space-y-1.5 border-border/60 border-b pb-3 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-medium">{reportTypeLabel(report.type)}</p>
              {report.createdAt ? (
                <span className="shrink-0 text-muted-foreground text-xs">{formatRelativeTime(report.createdAt)}</span>
              ) : null}
            </div>

            {report.description ? <p className="text-sm">{report.description}</p> : null}

            {report.imageUrl ? <ReportImage url={report.imageUrl} /> : null}

            {report.confirmations > 0 ? (
              <p className="text-muted-foreground text-xs">{confirmationsLabel(report.confirmations)}</p>
            ) : null}

            {report.expiresAt ? (
              <p className="text-muted-foreground text-xs">Aktualne do: {formatDateTime(report.expiresAt)}</p>
            ) : null}

            <div className="flex gap-2 pt-0.5">
              <Button
                type="button"
                size="sm"
                variant={voted === 'CONFIRM' ? 'default' : 'outline'}
                className="flex-1"
                disabled={isVoting || Boolean(voted)}
                onClick={() => vote({ id: report.id, kind: 'CONFIRM' })}
              >
                <CheckCircle2 />
                Potwierdzam
              </Button>

              <Button
                type="button"
                size="sm"
                variant={voted === 'FLAG' ? 'default' : 'outline'}
                className="flex-1"
                disabled={isVoting || Boolean(voted)}
                onClick={() => vote({ id: report.id, kind: 'FLAG' })}
              >
                <ThumbsDown />
                Nieaktualne
              </Button>

              <Button type="button" size="icon-sm" variant="ghost" onClick={() => shareReport(report.id)}>
                <Share2 />
                <span className="sr-only">Udostępnij zgłoszenie</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
