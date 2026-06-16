import { ForestMap } from '@/features/map/components/forest-map';
import { CreateReportAction } from '@/features/reports/components/create-report-action';
import { LocationRefreshAction } from '@/features/reports/components/location-refresh-action';
import { OfflineReportSync } from '@/features/reports/components/offline-report-sync';
import { ReportFilter } from '@/features/reports/components/report-filter';
import { SafetyAssistant } from '@/features/safety/components/safety-assistant';
import { AppLogoBox } from '@/shared/components/app-logo-box';
import { DataInfoButton } from '@/shared/components/data-info-button';
import { OfflineIndicator } from '@/shared/components/offline-indicator';

export default function Home() {
  return (
    <div className="absolute inset-0 h-full w-full bg-zinc-50 font-sans dark:bg-black">
      <header className="pointer-events-none absolute top-0 z-20 w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex flex-row items-start justify-between gap-4">
          <AppLogoBox />
          <div className="pointer-events-auto">
            <LocationRefreshAction />
          </div>
        </div>
      </header>

      <OfflineIndicator />
      <OfflineReportSync />

      <ForestMap
        pmtilesUrl={
          process.env.NEXT_PUBLIC_FOREST_PMTILES_URL ?? 'https://pub-a4d0d7d33aad4567b65c357ab9677ce3.r2.dev/forests.pmtiles'
        }
      />

      <div className="absolute bottom-4 left-4 z-30 sm:bottom-6 sm:left-6 lg:left-8">
        <DataInfoButton />
      </div>

      {/* Primary actions in the thumb zone (bottom-right), hero "safety" closest to the corner. */}
      <div className="pointer-events-auto absolute right-4 bottom-4 z-30 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6 lg:right-8">
        <ReportFilter />
        <CreateReportAction />
        <SafetyAssistant />
      </div>
    </div>
  );
}
