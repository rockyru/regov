import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import { MobileNav } from "./MobileNav";
import { Caret } from "./Caret";
import { BETTERGOV_TOOLS } from "@/lib/civic";

const GOV_LINKS = [
  { label: "Official Gazette", href: "https://www.officialgazette.gov.ph" },
  { label: "Open Data Portal", href: "https://data.gov.ph" },
  { label: "Freedom of Information", href: "https://www.foi.gov.ph" },
  { label: "Transparency Seal", href: "#transparency" },
];

export function navHref(jobId: string, slug: string) {
  return slug && slug !== "home" ? `/preview/${jobId}/${slug}` : `/preview/${jobId}`;
}

/** Shared editorial primitives */
export const eyebrow = "text-[11px] font-bold uppercase tracking-[0.18em]";


export function GovStrip({ jobId }: { jobId?: string }) {
  const links = jobId ? [{ label: "Hotlines", href: navHref(jobId, "hotlines") }, ...GOV_LINKS.map((l) => (l.href === "#transparency" ? { ...l, href: navHref(jobId, "home") + "#transparency" } : l))] : GOV_LINKS;
  return (
    <div className="bg-kapwa-brand-950 text-white/90 text-[13px]">
      <div className="container-gov h-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 font-semibold tracking-wide">
          <span className="inline-grid grid-cols-3 w-5 h-3.5 shrink-0" aria-hidden>
            <span className="bg-kapwa-brand-500" /><span className="bg-kapwa-red-600" /><span className="bg-kapwa-yellow-400" />
          </span>
          GOVPH <span className="font-normal text-white/60 hidden sm:inline">· Republic of the Philippines</span>
        </div>
        <nav aria-label="Government links" className="hidden lg:flex items-center gap-5 whitespace-nowrap">
          {links.map((l) => <a key={l.label} href={l.href} className="hover:text-white">{l.label}</a>)}
          <span className="text-white/40">|</span>
          <button className="hover:text-white" type="button">Filipino</button>
        </nav>
      </div>
    </div>
  );
}

type NavChild = SiteModel["nav"][number]["children"][number];

/** Children → named columns. Uses the planner's `group`, else chunks of five. */
function columns(children: NavChild[]): { heading: string; links: NavChild[] }[] {
  const grouped = children.some((c) => c.group);
  if (grouped) {
    const m = new Map<string, NavChild[]>();
    for (const c of children) (m.get(c.group || "More") ?? m.set(c.group || "More", []).get(c.group || "More")!).push(c);
    return [...m.entries()].map(([heading, links]) => ({ heading, links }));
  }
  const out: { heading: string; links: NavChild[] }[] = [];
  for (let i = 0; i < children.length; i += 5) out.push({ heading: "", links: children.slice(i, i + 5) });
  return out;
}

export function Header({ site }: { site: SiteModel }) {
  const { jobId } = site;
  const logo = site.assets.logo ? `/api/jobs/${jobId}/${site.assets.logo}?v=${encodeURIComponent(site.generated_at)}` : null;
  const items = site.nav.filter((n) => n.slug !== "home" && (n.slug || n.children.length > 0));
  const band = site.assets.band ? `/api/jobs/${jobId}/${site.assets.band}?v=${encodeURIComponent(site.generated_at)}` : null;
  const tab = "flex h-14 items-center gap-1.5 px-5 font-semibold border-b-4 border-transparent group-hover:bg-white/10 group-hover:border-kapwa-yellow-400 whitespace-nowrap";
  return (
    <header>
      {/* Row 1: identity, with the Muse Image band fading in behind it */}
      <div className="relative overflow-hidden bg-white border-b-2 border-neutral-900">
        {band && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={band} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover object-center" />
            {/* phones: artwork clear at the top, white only where the seal and name sit; md+: fades in from the left */}
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,35,101,0)_0%,rgba(6,35,101,0.15)_30%,rgba(6,35,101,0.82)_58%,rgba(6,35,101,0.96)_100%)] md:bg-[linear-gradient(90deg,rgba(255,255,255,0.9)_0%,rgba(255,255,255,0.86)_26%,rgba(255,255,255,0.45)_44%,rgba(255,255,255,0.08)_58%,rgba(255,255,255,0)_68%)]" aria-hidden />
          </>
        )}
        <div className="container-gov relative h-44 md:h-36 flex items-end pb-4 md:items-center md:pb-0">
          <Link href={navHref(jobId, "home")} className="flex items-center gap-5 min-w-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`${site.agency.short_name} seal`} className="size-16 md:size-[72px] object-contain shrink-0 drop-shadow-sm" />
            ) : (
              <span className="size-16 bg-kapwa-brand-900 text-white grid place-items-center font-bold shrink-0 text-xl">{site.agency.short_name.slice(0, 3)}</span>
            )}
            <span className="leading-tight min-w-0">
              <span className={`block ${eyebrow} text-kapwa-yellow-400 md:text-neutral-600`}>{site.agency.parent}</span>
              <span className="block font-bold text-white md:text-neutral-900 text-xl sm:text-[28px] leading-[1.1] tracking-tight line-clamp-2 mt-1">{site.agency.name}</span>
              {site.agency.tagline && <span className="hidden sm:block text-[15px] text-neutral-600 mt-1.5 italic">{site.agency.tagline}</span>}
            </span>
          </Link>
        </div>
      </div>

      {/* Row 2: full-bleed primary navigation with mega menus */}
      <nav aria-label="Primary" className="sticky top-0 z-40 bg-kapwa-brand-900 text-white relative border-b border-black/20">
        <div className="container-gov flex items-stretch">
          <Link href={navHref(jobId, "home")} className="hidden lg:flex items-center px-5 h-14 font-semibold border-b-4 border-transparent hover:bg-white/10 hover:border-kapwa-yellow-400">Home</Link>
          <div className="hidden lg:flex items-stretch flex-1">
            {items.map((item) => {
              const cols = columns(item.children);
              return (
                <div key={item.label} className="group static">
                  {item.slug ? (
                    <Link href={navHref(jobId, item.slug)} className={tab}>{item.label}{item.children.length > 0 && <Caret className="text-white/60 transition group-hover:rotate-180 group-hover:text-white" />}</Link>
                  ) : (
                    <button type="button" className={tab}>{item.label}<Caret className="text-white/60 transition group-hover:rotate-180 group-hover:text-white" /></button>
                  )}
                  {item.children.length > 0 && (
                    <div className="absolute inset-x-0 top-full hidden group-hover:block group-focus-within:block">
                      <div className="bg-white text-neutral-900 shadow-2xl border-t-4 border-kapwa-yellow-400 border-b-2 border-b-neutral-900">
                        <div className="container-gov py-8 grid gap-10 lg:grid-cols-[280px_1fr]">
                          <div className="lg:border-r lg:border-neutral-200 lg:pr-8">
                            <div className={`${eyebrow} text-kapwa-brand-700`}>Section</div>
                            <div className="mt-2 text-2xl font-bold tracking-tight leading-tight">{item.label}</div>
                            {item.description && <p className="mt-3 text-[15px] leading-relaxed text-neutral-600">{item.description}</p>}
                            {item.slug && <Link href={navHref(jobId, item.slug)} className="mt-5 inline-block font-semibold text-kapwa-brand-800 border-b-2 border-kapwa-brand-800 hover:text-kapwa-brand-950">Overview →</Link>}
                          </div>
                          <div className="flex flex-wrap gap-x-12 gap-y-8">
                            {cols.map((col, i) => (
                              <div key={i} className="w-64 shrink-0">
                                <div className={`${eyebrow} text-neutral-500 pb-2 mb-2 border-b border-neutral-900`}>{col.heading || "Pages"}</div>
                                <ul className="divide-y divide-neutral-100">
                                  {col.links.map((c) => <li key={c.slug + c.label}><Link href={navHref(jobId, c.slug)} className="block py-2 text-[15px] font-medium text-neutral-800 hover:text-kapwa-brand-900 hover:pl-1 transition-[padding]">{c.label}</Link></li>)}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <form role="search" className="flex flex-1 lg:flex-none items-center lg:ml-auto py-2">
            <label className="sr-only" htmlFor="site-search">Search this site</label>
            <input id="site-search" placeholder="Search services, forms, offices…" className="h-10 w-full lg:w-60 xl:w-80 border-0 bg-white px-4 text-sm text-neutral-900 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-kapwa-yellow-400" />
            <button type="submit" className="h-10 bg-kapwa-yellow-400 px-4 text-sm font-bold text-kapwa-brand-950 hover:bg-kapwa-yellow-300">Search</button>
          </form>
        </div>
      </nav>
      {/* Mobile: floating bottom bar with three sections + a "More" drawer */}
      <MobileNav nav={site.nav} jobId={jobId} />
    </header>
  );
}

const Icon = {
  facebook: <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4V14h2.8v8h3.3z"/></svg>,
  youtube: <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.2zM9.7 15.1V8.9l6 3.1-6 3.1z"/></svg>,
  mail: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="14"/><path d="m3 7 9 6 9-6"/></svg>,
  github: <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden><path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.6v-2.2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.2 1.2a11 11 0 0 1 5.8 0c2.2-1.5 3.2-1.2 3.2-1.2.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.2c0 .3.2.7.8.6A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5z"/></svg>,
  flag: <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M4 22V4m0 0h12l-2 4 2 4H4"/></svg>,
};

const RESOURCES = [
  { label: "Open Data Philippines", href: "https://data.gov.ph" },
  { label: "Freedom of Information", href: "https://www.foi.gov.ph" },
  { label: "Official Gazette", href: "https://www.officialgazette.gov.ph" },
  { label: "GOV.PH", href: "https://www.gov.ph" },
  { label: "Office of the President", href: "https://op-proper.gov.ph" },
  { label: "Senate of the Philippines", href: "https://legacy.senate.gov.ph" },
  { label: "House of Representatives", href: "https://www.congress.gov.ph" },
];

export function Footer({ site }: { site: SiteModel }) {
  const { jobId, footer, agency } = site;
  const logo = site.assets.logo ? `/api/jobs/${jobId}/${site.assets.logo}?v=${encodeURIComponent(site.generated_at)}` : null;
  const host = new URL(site.origin).host;
  const findSlug = (re: RegExp) => site.pages.find((p) => re.test(p.slug) || re.test(p.title))?.slug;
  const quick = footer.quick_links.length ? footer.quick_links : site.nav.filter((n) => n.slug && n.slug !== "home").map((n) => ({ label: n.label, slug: n.slug }));
  const extras = [
    { label: "Citizen's Charter", slug: findSlug(/citizen/i) },
    { label: "Transparency Seal", slug: findSlug(/transparency/i) },
    { label: "Privacy Policy", slug: findSlug(/privacy/i) },
    { label: "FAQ", slug: findSlug(/faq|frequently/i) },
    { label: "Contact Us", slug: findSlug(/contact/i) },
  ].filter((x): x is { label: string; slug: string } => !!x.slug && !quick.some((q) => q.slug === x.slug));
  const quickLinks = [...quick, ...extras].slice(0, 7).concat([{ label: "Emergency hotlines", slug: "hotlines" }]);
  const pill = "inline-flex items-center gap-2 border border-white/20 px-4 py-2.5 text-sm font-medium text-neutral-100 hover:bg-white/10 hover:border-white/40";
  const colHead = `${eyebrow} text-neutral-500 pb-3 border-b border-white/15`;

  return (
    <footer className="mt-20 bg-neutral-950 text-neutral-300 pb-24 lg:pb-0">
      <div className="container-gov py-16">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1fr_1.1fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-4">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="size-14 object-contain" />
              ) : null}
              <div className="text-white font-extrabold text-2xl leading-[1.05] tracking-tight">{agency.name.split(" ").length > 3 ? <>{agency.short_name}<span className="block text-base font-semibold text-neutral-400">{agency.name}</span></> : agency.name}</div>
            </div>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-neutral-400">{agency.tagline || agency.description}</p>
            <ul className="mt-6 flex gap-px bg-white/10 w-max border border-white/10">
              <li><a href={site.origin} target="_blank" rel="noreferrer" aria-label="Facebook page" className="grid size-11 place-items-center bg-neutral-950 text-neutral-200 hover:bg-white/10">{Icon.facebook}</a></li>
              <li><a href={site.origin} target="_blank" rel="noreferrer" aria-label="YouTube channel" className="grid size-11 place-items-center bg-neutral-950 text-neutral-200 hover:bg-white/10">{Icon.youtube}</a></li>
              {footer.email && <li><a href={`mailto:${footer.email}`} aria-label="Email" className="grid size-11 place-items-center bg-neutral-950 text-neutral-200 hover:bg-white/10">{Icon.mail}</a></li>}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h2 className={colHead}>Quick links</h2>
            <ul className="mt-4 space-y-3 text-[15px]">
              {quickLinks.map((l) => <li key={l.label}><Link className="text-neutral-200 hover:text-white" href={navHref(jobId, l.slug)}>{l.label}</Link></li>)}
            </ul>
          </div>

          {/* Government */}
          <div>
            <h2 className={colHead}>Government</h2>
            <ul className="mt-4 space-y-3 text-[15px]">
              {RESOURCES.map((l) => <li key={l.label}><a className="text-neutral-200 hover:text-white" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
            </ul>
          </div>

          {/* BetterGov.ph tools */}
          <div>
            <h2 className={colHead}>Citizen tools <span className="normal-case tracking-normal text-neutral-600">· BetterGov.ph</span></h2>
            <ul className="mt-4 space-y-3 text-[15px]">
              {BETTERGOV_TOOLS.map((l) => <li key={l.label}><a className="text-neutral-200 hover:text-white" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
            </ul>
          </div>

          {/* Pills */}
          <div className="flex flex-col items-start gap-3">
            <div className="inline-flex items-center gap-2 border-l-4 border-kapwa-green-500 bg-white/5 px-4 py-2 text-sm text-neutral-100">Pages migrated by the agent = <span className="font-bold tabular-nums text-kapwa-green-400">{site.pages.length}</span></div>
            <a href={`mailto:${footer.email || "helpdesk@" + host}`} className={pill}>{Icon.flag} Report an issue</a>
            <a href="https://github.com/rockyru/regov" target="_blank" rel="noreferrer" className={pill}>{Icon.github} Contribute code on RE:GOV</a>
            <div className={`mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 ${eyebrow} text-neutral-500`}>
              <span>RE:GOV</span><span>Kapwa · BetterGov.ph</span><span>Muse Spark 1.3</span><span>SAM 3.1</span><span>Muse Image</span>
            </div>
            {(footer.address || footer.phone) && (
              <address className="mt-4 not-italic text-sm text-neutral-400 space-y-1">
                {footer.address && <p>{footer.address}</p>}
                {footer.phone && <p><a className="hover:text-white" href={`tel:${footer.phone.replace(/[^+\d]/g, "")}`}>{footer.phone}</a></p>}
              </address>
            )}
          </div>
        </div>

        {/* Unofficial notice */}
        <div className="mt-14 border-t-2 border-white/20 pt-6 grid gap-4 lg:grid-cols-[200px_1fr] text-sm">
          <div className={`${eyebrow} text-kapwa-yellow-400`}>Unofficial · Concept</div>
          <p className="max-w-4xl leading-relaxed text-neutral-400">
            This website is an <strong className="text-neutral-200">unofficial, AI-generated reimagining</strong> of <a className="underline hover:text-neutral-200" href={site.origin} target="_blank" rel="noreferrer">{host}</a> produced by RE:GOV for demonstration purposes.
            It is not operated by, endorsed by, or affiliated with {agency.name} or any government body. Content was migrated automatically and may be incomplete or out of date.
            For official information and services, always use the agency&rsquo;s official website.
          </p>
        </div>

        <div className="mt-6 border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} {agency.name} <span className="mx-2 text-neutral-700">|</span> Public domain <span className="mx-2 text-neutral-700">|</span> Content sourced from <a className="underline hover:text-neutral-300" href={site.origin}>{host}</a></p>
          <p className="flex items-center gap-2"><span className="inline-block size-2 bg-kapwa-green-500" /> Reimagined by RE:GOV · {new Date(site.generated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>
    </footer>
  );
}

export function PreviewBar({ site, currentSource }: { site: SiteModel; currentSource?: string }) {
  const host = new URL(site.origin).host;
  return (
    <div className="bg-amber-400 text-amber-950 text-[13px]">
      <div className="container-gov h-8 flex items-center gap-3 whitespace-nowrap overflow-hidden">
        <span className="font-black shrink-0 tracking-tight">RE<span className="text-kapwa-red-700">:</span>GOV</span>
        <span className="shrink-0 border border-amber-950/40 px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.14em]">Unofficial concept</span>
        <span className="truncate"><span className="hidden md:inline">{site.pages.length} pages reimagined from {host} by an AI agent · </span>not affiliated with {site.agency.short_name || "the agency"}</span>
        <span className="ml-auto flex items-center gap-4 shrink-0">
          {currentSource && <a className="underline" href={currentSource} target="_blank" rel="noreferrer">Official site ↗</a>}
          <Link className="underline" href={`/report/${site.jobId}`}>Report</Link>
          <Link className="underline hidden sm:inline" href="/">All jobs</Link>
        </span>
      </div>
    </div>
  );
}
