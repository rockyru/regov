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

export function Footer({ site }: { site: SiteModel }) {
  const { jobId, footer, agency } = site;
  return (
    <footer className="mt-20 bg-neutral-950 text-neutral-300">
      <div className="container-gov py-14 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="text-white font-bold text-lg">{agency.name}</div>
          <p className="mt-2 text-sm text-neutral-400">{agency.description}</p>
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Quick links</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {footer.quick_links.map((l) => <li key={l.label}><Link className="hover:text-white" href={navHref(jobId, l.slug)}>{l.label}</Link></li>)}
          </ul>
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Contact</h2>
          <address className="mt-3 not-italic text-sm space-y-1.5">
            {footer.address && <p>{footer.address}</p>}
            {footer.phone && <p><a className="hover:text-white" href={`tel:${footer.phone.replace(/[^+\d]/g, "")}`}>{footer.phone}</a></p>}
            {footer.email && <p><a className="hover:text-white" href={`mailto:${footer.email}`}>{footer.email}</a></p>}
            {footer.hours && <p className="text-neutral-500">{footer.hours}</p>}
          </address>
        </div>
        <div>
          <h2 className="text-white font-semibold text-sm uppercase tracking-wider">Republic of the Philippines</h2>
          <p className="mt-3 text-sm text-neutral-400">All content is in the public domain unless otherwise stated.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {GOV_LINKS.map((l) => <li key={l.label}><a className="hover:text-white" href={l.href}>{l.label}</a></li>)}
            <li><a className="hover:text-white" href="https://www.gov.ph">GOV.PH</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-800">
        <div className="container-gov py-4 text-xs text-neutral-500 flex flex-wrap gap-x-6 gap-y-1 justify-between">
          <span>© {new Date().getFullYear()} {agency.name}</span>
          <span>Built on the BetterGov.ph Kapwa standard · migrated from <a className="underline hover:text-neutral-300" href={site.origin}>{new URL(site.origin).host}</a></span>
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
