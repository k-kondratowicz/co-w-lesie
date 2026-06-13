import { ForestMap } from '@/features/map/components/forest-map';
import { CreateReportAction } from '@/features/reports/components/create-report-action';
import { LocationRefreshAction } from '@/features/reports/components/location-refresh-action';
import { SafetyAssistant } from '@/features/safety/components/safety-assistant';
import { AppLogoBox } from '@/shared/components/app-logo-box';
import { DataInfoButton } from '@/shared/components/data-info-button';

export default function Home() {
  return (
    <div className="absolute inset-0 h-full w-full bg-zinc-50 font-sans dark:bg-black">
      <header className="absolute top-0 z-20 w-full px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex flex-row items-center justify-between gap-4">
          <AppLogoBox />
          <div className="flex items-center gap-2">
            <LocationRefreshAction />
            <CreateReportAction />
          </div>
        </div>
      </header>

      <ForestMap
        pmtilesUrl={
          process.env.NEXT_PUBLIC_FOREST_PMTILES_URL ?? 'https://pub-a4d0d7d33aad4567b65c357ab9677ce3.r2.dev/forests.pmtiles'
        }
      />

      <div className="absolute bottom-4 left-4 z-30 sm:bottom-6 sm:left-6 lg:left-8">
        <DataInfoButton />
      </div>

      <div className="absolute right-4 bottom-4 z-30 sm:right-6 sm:bottom-6 lg:right-8">
        <SafetyAssistant />
      </div>
    </div>
  );
}
