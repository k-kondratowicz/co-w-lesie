'use client';

import { useQuery } from '@tanstack/react-query';
import type { MapRef } from '@vis.gl/react-maplibre';
import { useSearchParams } from 'next/navigation';
import { type RefObject, useEffect, useRef, useState } from 'react';
import type { PopupInfo } from '@/features/map/hooks/use-map-interaction';
import { reportsApi } from '@/features/reports/api';

export function useSharedReport(
  mapRef: RefObject<MapRef | null>,
  loaded: boolean,
  popup: PopupInfo | null,
  setPopup: (info: PopupInfo) => void,
) {
  const searchParams = useSearchParams();
  const [initialReportId] = useState(() => searchParams.get('report'));
  const handled = useRef(false);

  const { data: sharedReport } = useQuery({
    queryKey: ['report', initialReportId],
    queryFn: () => reportsApi.get(initialReportId as string),
    enabled: !!initialReportId && !handled.current,
    retry: false,
  });

  useEffect(() => {
    if (!loaded || !sharedReport || handled.current) {
      return;
    }

    handled.current = true;
    const { lng, lat, ...rest } = sharedReport;
    mapRef.current?.flyTo({ center: [lng, lat], zoom: 14 });
    setPopup({ lng, lat, reports: [rest] });
  }, [loaded, sharedReport, setPopup, mapRef]);

  useEffect(() => {
    if (initialReportId && !handled.current) {
      return;
    }

    const reportId = popup?.reports.length === 1 ? popup.reports[0].id : null;
    const url = new URL(window.location.href);

    if (reportId) {
      url.searchParams.set('report', reportId);
    } else {
      url.searchParams.delete('report');
    }

    window.history.replaceState(null, '', url);
  }, [popup, initialReportId]);

  return { sharedReportId: initialReportId };
}
