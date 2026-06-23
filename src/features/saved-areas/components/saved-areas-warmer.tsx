'use client';

import { useSavedAreaStatuses } from '@/features/saved-areas/hooks/use-saved-area-statuses';

// Headless: mounting the statuses hook on page load warms the risk cache for every saved area
// (online), so the last-known status is already there if the user later goes offline. Renders
// nothing - the SavedAreasSheet and the assistant read the same cache. Mirrors OfflineReportSync.
export function SavedAreasWarmer() {
  useSavedAreaStatuses();

  return null;
}
