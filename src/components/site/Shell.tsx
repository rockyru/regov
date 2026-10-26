import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import { MobileNav } from "./MobileNav";

const GOV_LINKS = [
  { label: "Official Gazette", href: "https://www.officialgazette.gov.ph" },
  { label: "Open Data Portal", href: "https://data.gov.ph" },
  { label: "Freedom of Information", href: "https://www.foi.gov.ph" },
  { label: "Transparency Seal", href: "#transparency" },
];

export function navHref(jobId: string, slug: string) {
  return slug && slug !== "home" ? `/preview/${jobId}/${slug}` : `/preview/${jobId}`;
}

export function GovStrip() {
  return (
    <div className="bg-kapwa-brand-950 text-white/90 text-[13px]">
      <div className="container-gov h-9 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 font-semibold tracking-wide">
          <span className="inline-block size-4 rounded-full bg-[conic-gradient(var(--color-kapwa-brand-500),var(--color-kapwa-red-600),var(--color-kapwa-yellow-400),var(--color-kapwa-brand-500))]" aria-hidden />
          GOVPH <span className="font-normal text-white/60 hidden sm:inline">· Republic of the Philippines</span>
        </div>
        <nav aria-label="Government links" className="hidden md:flex items-center gap-5">
          {GOV_LINKS.map((l) => <a key={l.label} href={l.href} className="hover:text-white">{l.label}</a>)}
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
  const logo = site.assets.logo ? `/api/jobs/${jobId}/${site.assets.logo}` : null;
  const items = site.nav.filter((n) => n.slug !== "home");
  return (
    <header>
      {/* Row 1: identity + search */}
      <div className="bg-white border-b border-neutral-200">
        <div className="container-gov h-20 flex items-center gap-6">
          <Link href={navHref(jobId, "home")} className="flex items-center gap-4 min-w-0">
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt={`${site.agency.short_name} seal`} className="size-14 object-contain shrink-0" />
            ) : (
              <span className="size-14 rounded-full bg-kapwa-brand-900 text-white grid place-items-center font-bold shrink-0">{site.agency.short_name.slice(0, 3)}</span>
            )}
            <span className="leading-tight min-w-0">
              <span className="block text-[11px] uppercase tracking-[0.14em] text-neutral-500">{site.agency.parent}</span>
              <span className="block font-bold text-neutral-900 text-base sm:text-xl leading-tight line-clamp-2">{site.agency.name}</span>
            </span>
          </Link>
          <form role="search" className="ml-auto hidden md:flex items-center">
            <label className="sr-only" htmlFor="site-search">Search this site</label>
            <input id="site-search" placeholder="Search services, forms, offices…" className="h-11 w-72 xl:w-96 rounded-l-md border border-neutral-300 bg-neutral-50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-kapwa-brand-500" />
            <button type="submit" className="h-11 rounded-r-md bg-kapwa-brand-800 px-4 text-sm font-semibold text-white hover:bg-kapwa-brand-900">Search</button>
          </form>
        </div>
      </div>

      {/* Row 2: full-bleed primary navigation with mega menus */}
      <nav aria-label="Primary" className="sticky top-0 z-40 bg-kapwa-brand-900 text-white shadow-md relative">
        <div className="container-gov flex items-stretch">
          <Link href={navHref(jobId, "home")} className="hidden lg:flex items-center px-5 h-14 font-semibold border-b-4 border-transparent hover:bg-white/10 hover:border-kapwa-yellow-400">Home</Link>
          <div className="hidden lg:flex items-stretch flex-1">
            {items.map((item) => {
              const cols = columns(item.children);
              return (
                <div key={item.label} className="group static">
                  {item.slug ? (
                    <Link href={navHref(jobId, item.slug)} className="flex h-14 items-center gap-1.5 px-5 font-semibold border-b-4 border-transparent group-hover:bg-white/10 group-hover:border-kapwa-yellow-400 whitespace-nowrap">{item.label}{item.children.length > 0 && <span className="text-white/60 text-xs">▼</span>}</Link>
                  ) : (
                    <button type="button" className="flex h-14 items-center gap-1.5 px-5 font-semibold border-b-4 border-transparent group-hover:bg-white/10 group-hover:border-kapwa-yellow-400 whitespace-nowrap">{item.label}<span className="text-white/60 text-xs">▼</span></button>
                  )}
                  {item.children.length > 0 && (
                    <div className="absolute inset-x-0 top-full hidden group-hover:block group-focus-within:block">
                      <div className="bg-white text-neutral-900 shadow-2xl border-t-4 border-kapwa-yellow-400">
                        <div className="container-gov py-8 grid gap-10 lg:grid-cols-[280px_1fr] lg:border-l-0">
                          <div>
                            <div className="text-xl font-bold">{item.label}</div>
                            {item.description && <p className="mt-2 text-[15px] text-neutral-600">{item.description}</p>}
                            {item.slug && <Link href={navHref(jobId, item.slug)} className="mt-4 inline-block font-semibold text-kapwa-brand-800 hover:underline">Overview →</Link>}
                          </div>
                          <div className="flex flex-wrap gap-x-12 gap-y-8">
                            {cols.map((col, i) => (
                              <div key={i} className="w-64 shrink-0 lg:border-l lg:border-neutral-200 lg:pl-8 first:border-0 first:pl-0">
                                {col.heading && <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">{col.heading}</div>}
                                <ul className="space-y-1">
                                  {col.links.map((c) => <li key={c.slug + c.label}><Link href={navHref(jobId, c.slug)} className="block rounded-md px-3 py-2 -mx-3 text-[15px] font-medium text-neutral-800 hover:bg-kapwa-brand-50 hover:text-kapwa-brand-900">{c.label}</Link></li>)}
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
          <div className="flex items-center ml-auto lg:ml-0 py-1.5"><MobileNav nav={site.nav} jobId={jobId} /></div>
        </div>
      </nav>
    </header>
  );
}

const Icon = {
  facebook: <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d="M13.5 22v-8h2.7l.4-3.2h-3.1V8.8c0-.9.3-1.6 1.6-1.6h1.7V4.3c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H7.4V14h2.8v8h3.3z"/></svg>,
  youtube: <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.8a3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 23.5 12 31 31 0 0 0 23 7.2zM9.7 15.1V8.9l6 3.1-6 3.1z"/></svg>,
  mail: <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>,
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
  const logo = site.assets.logo ? `/api/jobs/${jobId}/${site.assets.logo}` : null;
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
  const quickLinks = [...quick, ...extras].slice(0, 8);
  const pill = "inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2.5 text-sm font-medium text-neutral-100 ring-1 ring-white/10 hover:bg-white/15";

  return (
    <footer className="mt-20 bg-neutral-950 text-neutral-300">
      <div className="container-gov py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
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
            <ul className="mt-6 flex gap-3">
              <li><a href={site.origin} target="_blank" rel="noreferrer" aria-label="Facebook page" className="grid size-11 place-items-center rounded-lg bg-white/10 text-neutral-200 hover:bg-white/20">{Icon.facebook}</a></li>
              <li><a href={site.origin} target="_blank" rel="noreferrer" aria-label="YouTube channel" className="grid size-11 place-items-center rounded-lg bg-white/10 text-neutral-200 hover:bg-white/20">{Icon.youtube}</a></li>
              {footer.email && <li><a href={`mailto:${footer.email}`} aria-label="Email" className="grid size-11 place-items-center rounded-lg bg-white/10 text-neutral-200 hover:bg-white/20">{Icon.mail}</a></li>}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Quick links</h2>
            <ul className="mt-5 space-y-3 text-[15px]">
              {quickLinks.map((l) => <li key={l.label}><Link className="text-neutral-200 hover:text-white" href={navHref(jobId, l.slug)}>{l.label}</Link></li>)}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-neutral-500">Resources</h2>
            <ul className="mt-5 space-y-3 text-[15px]">
              {RESOURCES.map((l) => <li key={l.label}><a className="text-neutral-200 hover:text-white" href={l.href} target="_blank" rel="noreferrer">{l.label}</a></li>)}
            </ul>
          </div>

          {/* Pills */}
          <div className="flex flex-col items-start gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg bg-kapwa-green-950/60 px-4 py-2 text-sm text-neutral-100 ring-1 ring-kapwa-green-700/50">Pages migrated by the agent = <span className="font-mono font-bold text-kapwa-green-400">{site.pages.length}</span></div>
            <a href={`mailto:${footer.email || "helpdesk@" + host}`} className={pill}>{Icon.flag} Report an issue</a>
            <a href="https://github.com/rockyru/meta-hackaton" target="_blank" rel="noreferrer" className={pill}>{Icon.github} Contribute code with us</a>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>Kapwa · BetterGov.ph</span><span>Muse Spark 1.3</span><span>SAM 3.1</span>
            </div>
            {(footer.address || footer.phone) && (
              <address className="mt-4 not-italic text-sm text-neutral-400 space-y-1">
                {footer.address && <p>{footer.address}</p>}
                {footer.phone && <p><a className="hover:text-white" href={`tel:${footer.phone.replace(/[^+\d]/g, "")}`}>{footer.phone}</a></p>}
              </address>
            )}
          </div>
        </div>

        <div className="mt-14 border-t border-white/10 pt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm text-neutral-500">
          <p>© {new Date().getFullYear()} {agency.name} <span className="mx-2 text-neutral-700">|</span> Public domain <span className="mx-2 text-neutral-700">|</span> Content sourced from <a className="underline hover:text-neutral-300" href={site.origin}>{host}</a></p>
          <p className="flex items-center gap-2"><span className="inline-block size-2 rounded-full bg-kapwa-green-500" /> Resurrected {new Date(site.generated_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p>
        </div>
      </div>
    </footer>
  );
}

export function PreviewBar({ site, currentSource }: { site: SiteModel; currentSource?: string }) {
  return (
    <div className="bg-amber-400 text-amber-950 text-[13px]">
      <div className="container-gov h-8 flex items-center gap-3 whitespace-nowrap overflow-hidden">
        <span className="font-semibold shrink-0">Preview</span>
        <span className="hidden md:inline truncate">{site.pages.length} pages rebuilt from {new URL(site.origin).host} with Muse Spark + SAM 3.1</span>
        <span className="ml-auto flex items-center gap-4">
          {currentSource && <a className="underline" href={currentSource} target="_blank" rel="noreferrer">Original ↗</a>}
          <Link className="underline" href={`/report/${site.jobId}`}>Report</Link>
          <Link className="underline hidden sm:inline" href="/">All jobs</Link>
        </span>
      </div>
    </div>
  );
}
