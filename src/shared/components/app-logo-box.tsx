import { SITE_DESCRIPTION_SHORT, SITE_TITLE } from '@/shared/lib/site';

function PineMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="currentColor" aria-hidden="true">
      <title>{SITE_TITLE}</title>
      <path d="M12 3 L7.5 11 L16.5 11 Z" />
      <path d="M12 8 L5 17.5 L19 17.5 Z" />
      <rect x="10.75" y="17" width="2.5" height="4" rx="0.4" />
    </svg>
  );
}

export function AppLogoBox() {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-background/80 p-2 shadow-sm backdrop-blur">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-white">
        <PineMark />
      </span>

      <div className="pr-1 leading-tight max-sm:sr-only">
        <p className="font-semibold">{SITE_TITLE}</p>
        <p className="text-muted-foreground text-xs">{SITE_DESCRIPTION_SHORT.replace('.', '')}</p>
      </div>
    </div>
  );
}
