import { Suspense } from 'react';
import { ForestMap } from '@/features/map/components/forest-map';
import { CreateReportAction } from '@/features/reports/components/create-report-action';
import { LocationRefreshAction } from '@/features/reports/components/location-refresh-action';
import { OfflineReportSync } from '@/features/reports/components/offline-report-sync';
import { ReportFilter } from '@/features/reports/components/report-filter';
import { SafetyAssistant } from '@/features/safety/components/safety-assistant';
import { SavedAreasSheet } from '@/features/saved-areas/components/saved-areas-sheet';
import { SavedAreasWarmer } from '@/features/saved-areas/components/saved-areas-warmer';
import { AppLogoBox } from '@/shared/components/app-logo-box';
import { DataInfoButton } from '@/shared/components/data-info-button';
import { OfflineIndicator } from '@/shared/components/offline-indicator';
import { StaleDataBanner } from '@/shared/components/stale-data-banner';

export default function Home() {
  return (
    <div className="absolute inset-0 h-full w-full bg-zinc-50 font-sans dark:bg-black">
      <header className="pointer-events-none absolute top-0 z-20 w-full px-4 py-4 sm:px-6">
        <div className="mx-auto flex flex-row items-start justify-between gap-4">
          <AppLogoBox />
          <div className="pointer-events-auto">
            <LocationRefreshAction />
          </div>
        </div>
      </header>

      <OfflineIndicator />
      <StaleDataBanner />
      <OfflineReportSync />
      <SavedAreasWarmer />

      <Suspense>
        <ForestMap
          pmtilesUrl={
            process.env.NEXT_PUBLIC_FOREST_PMTILES_URL ?? 'https://pub-a4d0d7d33aad4567b65c357ab9677ce3.r2.dev/forests.pmtiles'
          }
        />
      </Suspense>

      <div className="absolute bottom-4 left-4 z-30 sm:bottom-6 sm:left-6">
        <DataInfoButton />
      </div>

      {/* Primary actions in the thumb zone (bottom-right), hero "safety" closest to the corner. */}
      <div className="pointer-events-auto absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6">
        <ReportFilter />
        <SavedAreasSheet />
        <CreateReportAction />
        <SafetyAssistant />
      </div>
    </div>
  );
}
