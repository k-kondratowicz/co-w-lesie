'use client';

import type { ReportType } from '@prisma/client';
import { CheckCircle2, ThumbsDown } from 'lucide-react';
import { useRef, useState } from 'react';
import type { PopupReport } from '@/features/map/hooks/use-map-interaction';
import { useReportVote } from '@/features/reports/hooks/use-report-vote';
import { reportTypeLabel } from '@/features/reports/utils/report-type-labels';
import { Turnstile } from '@/shared/components/turnstile';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { formatDateTime } from '@/shared/lib/format-date';
import { formatRelativeTime } from '@/shared/lib/format-relative-time';
import { plPlural } from '@/shared/lib/pl-plural';

function ReportImage({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (failed) {
    return null;
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      <div className="relative h-48 w-full overflow-hidden rounded-md border">
        {!loaded ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
        {/* biome-ignore lint/performance/noImgElement: user-uploaded R2 photo, not a bundled/optimizable asset */}
        <img
          src={url}
          alt="Zdjęcie zgłoszenia"
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={`h-48 w-full object-cover transition-opacity ${loaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    </a>
  );
}

function confirmationsLabel(count: number): string {
  return `Potwierdzone przez ${count} ${plPlural(count, { one: 'osobę', few: 'osoby', many: 'osób' })}`;
}

// Report list for the details overlay: type, age, end date, confirmations, and the confirm/flag
// actions that let the crowd keep the data accurate.
export function ReportPopupContent({ reports }: { reports: PopupReport[] }) {
  const { vote, isVoting, votedKind } = useReportVote();

  // One Turnstile token serves the popup; tokens are single-use, so remount (bump the key) after
  // each vote to get a fresh one for the next report in a multi-report popup.
  const turnstileTokenRef = useRef<string | null>(null);
  const [turnstileKey, setTurnstileKey] = useState(0);

  const handleVote = (id: string, kind: 'CONFIRM' | 'FLAG') => {
    vote({ id, kind, turnstileToken: turnstileTokenRef.current });
    turnstileTokenRef.current = null;
    setTurnstileKey((key) => key + 1);
  };

  return (
    <div className="space-y-3">
      <Turnstile
        key={turnstileKey}
        onToken={(token) => {
          turnstileTokenRef.current = token;
        }}
        className="empty:hidden"
      />
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
                className="h-7 flex-1 text-xs"
                disabled={isVoting || Boolean(voted)}
                onClick={() => handleVote(report.id, 'CONFIRM')}
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
                onClick={() => handleVote(report.id, 'FLAG')}
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
