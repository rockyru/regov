import Link from "next/link";

export const eyebrow = "text-[11px] font-bold uppercase tracking-[0.18em]";
export const nn = (i: number) => String(i + 1).padStart(2, "0");

export function Wordmark({ className = "" }: { className?: string }) {
  return <Link href="/" className={`font-black tracking-tight leading-none ${className}`}><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</Link>;
}

export function AppHeader({ crumb }: { crumb?: string }) {
  return (
    <header>
      <div className="container-gov h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <Wordmark className="text-xl" />
          {crumb && <span className="hidden sm:flex items-center gap-4 min-w-0 text-sm text-neutral-500"><span className="h-5 w-px bg-neutral-300" /><span className="truncate">{crumb}</span></span>}
        </div>
        <nav aria-label="RE:GOV" className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/jobs" className="hover:text-kapwa-brand-900">Sites</Link>
          <a href="https://github.com/rockyru/regov" className="hover:text-kapwa-brand-900">GitHub ↗</a>
          <Link href="/#reimagine" className="hidden sm:inline-flex h-9 items-center bg-kapwa-brand-900 px-4 text-white hover:bg-kapwa-brand-950">Reimagine a site</Link>
        </nav>
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer className="mt-auto border-t-2 border-kapwa-brand-900">
      <div className="container-gov py-6 grid gap-4 md:grid-cols-[1fr_auto] text-[13px] text-neutral-600">
        <p>Reimagined sites are <strong className="font-semibold text-neutral-900">unofficial AI-generated concepts</strong>, not affiliated with or endorsed by any agency. Always use the official website for services.</p>
        <p className="text-neutral-500 md:text-right">Muse Spark 1.3 · SAM 3.1 · Muse Image · Kapwa by BetterGov.ph</p>
      </div>
    </footer>
  );
}

/** Numbered section heading with a heavy top rule. */
export function SectionHead({ n, title, deck, aside }: { n: number; title: string; deck?: string; aside?: React.ReactNode }) {
  return (
    <div className="border-t-2 border-kapwa-brand-900 pt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
      <div>
        <div className={`${eyebrow} text-neutral-500 flex items-center gap-3`}><span className="text-kapwa-brand-900 tabular-nums">{nn(n - 1)}</span>{title}</div>
        {deck && <p className="mt-2 max-w-2xl text-neutral-600">{deck}</p>}
      </div>
      {aside && <div className="text-sm text-neutral-500">{aside}</div>}
    </div>
  );
}

/** Square buttons */
export const btn = {
  primary: "inline-flex h-11 items-center gap-2 bg-kapwa-brand-900 px-5 font-semibold text-white hover:bg-kapwa-brand-950",
  yellow: "inline-flex h-11 items-center gap-2 bg-kapwa-yellow-400 px-5 font-bold text-kapwa-brand-950 hover:bg-kapwa-yellow-300",
  ghost: "inline-flex h-11 items-center gap-2 border-2 border-kapwa-brand-900 px-5 font-semibold text-neutral-900 hover:bg-kapwa-brand-900 hover:text-white",
  sm: "inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-semibold",
};
