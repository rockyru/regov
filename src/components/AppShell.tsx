import Link from "next/link";
import { FeedbackBox } from "./FeedbackBox";
import { turnstileSitekey } from "@/lib/turnstile";
import { sponsorUrl } from "@/lib/sponsor";

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

const BOTTOM_TABS: { label: string; href: string; ext?: boolean; icon: React.ReactNode }[] = [
  { label: "How it works", href: "/how-it-works", icon: <><path d="M4 5h16v14H4z" /><path d="M8 9h8M8 13h8M8 17h5" /></> },
  { label: "Case study", href: "/case-study", icon: <><path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" /><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z" /></> },
  { label: "Showcase", href: "/showcase", icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> },
  { label: "GitHub", href: "https://github.com/rockyru/regov", ext: true, icon: <><path d="m8 8-5 4 5 4" /><path d="m16 8 5 4-5 4" /><path d="m14 5-4 14" /></> },
];

/** Floating bottom bar below lg, the same pattern as the rebuilt sites' MobileNav. */
function AppBottomNav() {
  const tab = "flex flex-1 flex-col items-center justify-center gap-1 h-16 min-w-0 px-1 text-[11px] font-semibold tracking-wide text-white/80 hover:text-white hover:bg-white/10";
  return (
    <nav aria-label="RE:GOV (mobile)" className="lg:hidden fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 sm:mx-auto sm:max-w-md bg-kapwa-brand-900 text-white border border-black/30 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.25)]">
      <ul className="flex items-stretch divide-x divide-white/15">
        {BOTTOM_TABS.map((t) => {
          const inner = <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden className="size-6 shrink-0">{t.icon}</svg><span className="truncate max-w-full">{t.label}</span></>;
          return <li key={t.label} className="flex flex-1 min-w-0">{t.ext ? <a href={t.href} className={tab}>{inner}</a> : <Link href={t.href} className={tab}>{inner}</Link>}</li>;
        })}
      </ul>
    </nav>
  );
}

/** Below lg the links move to a bottom bar. */
export function AppHeader({ crumb }: { crumb?: string }) {
  return (
    <header className="pt-4 lg:pt-0">
      <div className="container-gov h-16 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4 min-w-0">
          <Wordmark className="h-12 sm:h-[52px] translate-y-1" />
          {/* RE:GOV Explore, the newest part: beside the logo on every page and screen size */}
          <Link href="/explore" className="group inline-flex h-9 shrink-0 items-center gap-2 bg-[#F5B62A] pl-1.5 pr-3 text-sm font-semibold text-neutral-900 transition-colors hover:bg-[#FFC94A]">
            <span className="bg-neutral-900 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>
            Explore
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </Link>
          {crumb && <span className="hidden lg:flex items-center gap-4 min-w-0 text-sm text-neutral-500"><span className="h-5 w-px bg-neutral-300" /><span className="truncate">{crumb}</span></span>}
        </div>
        <nav aria-label="RE:GOV" className="hidden lg:flex items-center gap-5 text-sm font-semibold">
          <Link href="/how-it-works" className="hover:text-kapwa-brand-900">How it works</Link>
          <Link href="/case-study" className="hover:text-kapwa-brand-900">Case study</Link>
          <Link href="/showcase" className="hover:text-kapwa-brand-900">Showcase</Link>
          <a href="https://github.com/rockyru/regov" className="hover:text-kapwa-brand-900">GitHub ↗</a>
          <Link href="/#reimagine" className="inline-flex h-9 items-center bg-kapwa-brand-900 px-4 text-white hover:bg-kapwa-brand-950">Reimagine a site</Link>
        </nav>
      </div>
      <AppBottomNav />
      <FeedbackBox sitekey={turnstileSitekey()} />
    </header>
  );
}

const FOOTER_COLS: { heading: string; links: { label: string; href: string; ext?: boolean }[] }[] = [
  { heading: "RE:GOV", links: [
    { label: "Home", href: "/" },
    { label: "Reimagine a site", href: "/#reimagine" },
    { label: "Explore", href: "/explore" },
    { label: "Showcase", href: "/showcase" },
    { label: "How it works", href: "/how-it-works" },
    { label: "Case study", href: "/case-study" },
    { label: "Source code", href: "https://github.com/rockyru/regov", ext: true },
    { label: "Report an issue", href: "https://github.com/rockyru/regov/issues", ext: true },
    { label: "Privacy", href: "/privacy" },
    { label: "Terms of use", href: "/terms" },
    { label: "About the crawler", href: "/bot" },
  ] },
  { heading: "Built with", links: [
    { label: "Meta Model API · Muse Spark 1.3", href: "https://ai.meta.com", ext: true },
    { label: "SAM 3.1 · Muse Image", href: "https://ai.meta.com", ext: true },
    { label: "Next.js", href: "https://nextjs.org", ext: true },
    { label: "Playwright", href: "https://playwright.dev", ext: true },
    { label: "axe-core WCAG 2.2", href: "https://github.com/dequelabs/axe-core", ext: true },
    { label: "Hostinger VPS · Caddy", href: "https://caddyserver.com", ext: true },
    { label: "Cloudflare CDN · R2", href: "https://www.cloudflare.com", ext: true },
  ] },
  { heading: "Standards and data", links: [
    { label: "BetterGov.ph", href: "https://bettergov.ph", ext: true },
    { label: "Kapwa design system", href: "https://github.com/bettergovph/kapwa", ext: true },
    { label: "WikiBayan projects", href: "https://wikibayan.vercel.app", ext: true },
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
  const sponsor = sponsorUrl();
  return (
    <footer className="mt-auto bg-kapwa-brand-950 text-neutral-300 pb-24 lg:pb-0">
      <div className="container-gov pt-14 pb-8">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Wordmark className="h-16" tone="white" />
            <p className="mt-3 text-[15px] leading-snug text-neutral-300">Reimagine Government. An autonomous agent that gives Philippine public websites a second life on the BetterGov Kapwa standard.</p>
            <p className="mt-4 text-sm text-neutral-400">Built solo for the Meta Global AI Developer Hackathon 2026, Indie track, by <a href="https://rmbergonia.com" className="font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">Ruther Bergonia</a>, a software systems architect in Manila.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href="https://rmbergonia.com" className="inline-flex h-9 items-center bg-white px-3.5 text-sm font-semibold text-kapwa-brand-950 hover:bg-kapwa-yellow-400">Portfolio ↗</a>
              <a href="https://github.com/rockyru/regov" className="inline-flex h-9 items-center border border-white/30 px-3.5 text-sm font-semibold text-white hover:border-white">GitHub ↗</a>
              {sponsor && <Link href="/support" className="inline-flex h-9 items-center border border-kapwa-yellow-400/60 px-3.5 text-sm font-semibold text-kapwa-yellow-400 hover:border-kapwa-yellow-400">Support RE:GOV</Link>}
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
          <p>© {new Date().getFullYear()} <a href="https://rmbergonia.com" className="hover:text-white">Ruther Bergonia</a> · RE:GOV is an independent civic-tech project, not a government service. · <Link href="/privacy" className="hover:text-white">Privacy</Link> · <Link href="/terms" className="hover:text-white">Terms</Link>{sponsor && <> · <Link href="/support" className="hover:text-white">Support</Link></>}</p>
          <p>Muse Spark 1.3 · SAM 3.1 · Muse Image · Kapwa by BetterGov.ph · WikiBayan</p>
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
