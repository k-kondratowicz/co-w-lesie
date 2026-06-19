'use client';

import { useState } from 'react';
import { Skeleton } from '@/shared/components/ui/skeleton';

export function ReportImage({ url }: { url: string }) {
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
