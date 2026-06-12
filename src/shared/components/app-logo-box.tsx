export function AppLogoBox() {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200/80 bg-slate-950/5 p-4 shadow-sm backdrop-blur dark:border-slate-800/80 dark:bg-slate-950/70">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-slate-400/30 border-dashed bg-white/90 font-semibold text-slate-950 text-sm shadow-sm dark:bg-slate-900 dark:text-slate-50">
        <span className="text-slate-500 text-xs uppercase tracking-[0.35em] dark:text-slate-400">Logo</span>
      </div>
      <div className="space-y-1">
        <p className="font-semibold text-base text-slate-950 dark:text-slate-50">Co W Lesie</p>
        <p className="text-slate-500 text-sm dark:text-slate-400">Forest events, reports and safety alerts.</p>
      </div>
    </div>
  );
}
