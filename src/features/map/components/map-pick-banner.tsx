'use client';

import { useMapPickStore } from '@/shared/store/use-map-pick-store';

export function MapPickBanner() {
  const isPicking = useMapPickStore((state) => state.isPicking);
  const pickPurpose = useMapPickStore((state) => state.purpose);

  if (!isPicking) {
    return null;
  }

  return (
    <div className="absolute top-20 left-1/2 z-40 w-[calc(100%-32px)] -translate-x-1/2 rounded-lg bg-background px-4 py-2 text-center shadow-lg ring-1 ring-border sm:top-4 sm:w-auto sm:rounded-full">
      <span className="text-sm">
        {pickPurpose === 'report'
          ? 'Wskaż miejsce zgłoszenia w niebieskim okręgu lub'
          : 'Kliknij punkt na mapie, aby sprawdzić to miejsce lub'}
      </span>
      <button
        type="button"
        onClick={() => useMapPickStore.getState().cancelPicking()}
        className="ml-1 font-medium text-muted-foreground text-sm underline hover:text-foreground"
      >
        Anuluj
      </button>
    </div>
  );
}
