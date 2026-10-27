import Link from "next/link";

export const eyebrow = "text-[11px] font-bold uppercase tracking-[0.18em]";
export const nn = (i: number) => String(i + 1).padStart(2, "0");

/** The RE:GOV lockup (RG monogram, wordmark, tagline) from public/brand. `tone` picks ink or white. */
export function Wordmark({ className = "", tone = "ink" }: { className?: string; tone?: "ink" | "white" }) {
  return (
    <Link href="/" className={`inline-flex shrink-0 items-center ${className}`} aria-label="RE:GOV home">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tone === "white" ? "/brand/logo-white.svg" : "/brand/logo.svg"} alt="RE:GOV. Reimagine Government." className="h-full w-auto" />
    </Link>
  );
}

export function AppHeader({ crumb }: { crumb?: string }) {
  return (
    <header>
      <div className="container-gov h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <Wordmark className="h-12 sm:h-[52px] translate-y-1" />
          {crumb && <span className="hidden sm:flex items-center gap-4 min-w-0 text-sm text-neutral-500"><span className="h-5 w-px bg-neutral-300" /><span className="truncate">{crumb}</span></span>}
        </div>
        <nav aria-label="RE:GOV" className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/showcase" className="hover:text-kapwa-brand-900">Showcase</Link>
          <a href="https://github.com/rockyru/regov" className="hover:text-kapwa-brand-900">GitHub ↗</a>
          <Link href="/#reimagine" className="hidden sm:inline-flex h-9 items-center bg-kapwa-brand-900 px-4 text-white hover:bg-kapwa-brand-950">Reimagine a site</Link>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_COLS: { heading: string; links: { label: string; href: string; ext?: boolean }[] }[] = [
  { heading: "RE:GOV", links: [
    { label: "Home", href: "/" },
    { label: "Reimagine a site", href: "/#reimagine" },
    { label: "Showcase", href: "/showcase" },
    { label: "Source code", href: "https://github.com/rockyru/regov", ext: true },
    { label: "Report an issue", href: "https://github.com/rockyru/regov/issues", ext: true },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms of use", href: "/terms" },
  ] },
  { heading: "Built with", links: [
    { label: "Meta Model API · Muse Spark 1.3", href: "https://ai.meta.com", ext: true },
    { label: "SAM 3.1 · Muse Image", href: "https://ai.meta.com", ext: true },
    { label: "Next.js", href: "https://nextjs.org", ext: true },
    { label: "Playwright", href: "https://playwright.dev", ext: true },
    { label: "Cloudflare Containers", href: "https://developers.cloudflare.com/containers/", ext: true },
  ] },
  { heading: "Standards and data", links: [
    { label: "BetterGov.ph", href: "https://bettergov.ph", ext: true },
    { label: "Kapwa design system", href: "https://github.com/bettergovph/kapwa", ext: true },
    { label: "Wayback Machine", href: "https://web.archive.org", ext: true },
    { label: "Open-Meteo weather", href: "https://open-meteo.com", ext: true },
    { label: "Open Data Portal", href: "https://data.gov.ph", ext: true },
  ] },
  { heading: "Government", links: [
    { label: "GOV.PH", href: "https://www.gov.ph", ext: true },
    { label: "Official Gazette", href: "https://www.officialgazette.gov.ph", ext: true },
    { label: "Freedom of Information", href: "https://www.foi.gov.ph", ext: true },
    { label: "Emergency: 911", href: "tel:911" },
    { label: "Citizen complaints: 8888", href: "tel:8888" },
  ] },
];

export function AppFooter() {
  return (
    <footer className="mt-auto bg-kapwa-brand-950 text-neutral-300">
      <div className="container-gov pt-14 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Wordmark className="h-16" tone="white" />
            <p className="mt-3 text-[15px] leading-snug text-neutral-300">Reimagine Government. An autonomous agent that gives Philippine public websites a second life on the BetterGov Kapwa standard.</p>
            <p className="mt-4 text-sm text-neutral-400">Built solo for the Meta Global AI Developer Hackathon 2026, Indie track, by <a href="https://rmbergonia.com" className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">Ruther Bergonia</a>, a software systems architect in Manila.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="https://rmbergonia.com" className="inline-flex h-9 items-center bg-white px-3.5 text-sm font-semibold text-kapwa-brand-950 hover:bg-kapwa-yellow-400">Portfolio ↗</a>
              <a href="https://github.com/rockyru/regov" className="inline-flex h-9 items-center border border-white/30 px-3.5 text-sm font-semibold text-white hover:border-white">GitHub ↗</a>
            </div>
          </div>
          {FOOTER_COLS.map((c) => (
            <div key={c.heading}>
              <div className={`${eyebrow} text-neutral-400 pb-3 border-b border-white/15`}>{c.heading}</div>
              <ul className="mt-3 space-y-2 text-[15px]">
                {c.links.map((l) => <li key={l.label}>{l.ext || l.href.startsWith("tel:") ? <a href={l.href} target={l.ext ? "_blank" : undefined} rel={l.ext ? "noreferrer" : undefined} className="text-neutral-200 hover:text-white">{l.label}</a> : <Link href={l.href} className="text-neutral-200 hover:text-white">{l.label}</Link>}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-white/15 pt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <div className={`${eyebrow} text-kapwa-yellow-400`}>Unofficial · Concept</div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Every site RE:GOV produces is an <strong className="font-semibold text-white">unofficial, AI-generated concept</strong>. It is not operated by, endorsed by, or affiliated with any government agency, local government unit, university, hospital or other public body, and it is not a substitute for their official websites. For services, transactions, forms and current information, always use the official website.
            </p>
          </div>
          <div>
            <div className={`${eyebrow} text-neutral-400`}>Accuracy and sources</div>
            <p className="mt-2 text-sm leading-relaxed text-neutral-300">
              Content is migrated automatically from publicly available pages, or from Wayback Machine captures when a site blocks crawlers, and may be incomplete, outdated or wrong. Illustrations are AI-generated, not photographs. Hotline numbers come from BetterGov.ph&rsquo;s public dataset and the source site; verify before relying on them. Weather is from Open-Meteo and is not a PAGASA advisory. Every rebuilt page links back to its original. Agencies may request changes or removal through <a href="https://github.com/rockyru/regov/issues" className="underline decoration-white/30 underline-offset-4 hover:decoration-white">GitHub issues</a>.
            </p>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[13px] text-neutral-400">
          <p>© {new Date().getFullYear()} <a href="https://rmbergonia.com" className="hover:text-white">Ruther Bergonia</a> · RE:GOV is an independent civic-tech project, not a government service. · <Link href="/privacy" className="hover:text-white">Privacy</Link> · <Link href="/terms" className="hover:text-white">Terms</Link></p>
          <p>Muse Spark 1.3 · SAM 3.1 · Muse Image · Kapwa by BetterGov.ph</p>
        </div>
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
