import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { AppHeader, AppFooter, eyebrow, btn, nn } from "@/components/AppShell";
import { ScaledFrame } from "@/components/ScaledFrame";
import { ShowcaseList, type ShowcaseItem } from "@/components/ShowcaseList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Showcase" };

const KIND_LABEL: Record<string, string> = { province: "Provinces", city_municipality: "Cities and towns", barangay: "Barangays", university: "Universities", school: "Schools", hospital: "Hospitals", national_agency: "Agencies", regional_office: "Regional offices", goc_corporation: "GOCCs", embassy: "Embassies" };
const kindKey = (k?: string) => (k && KIND_LABEL[k] ? k : "other");

export default async function Showcase() {
  const jobs = (await listJobs()).filter((j) => j.site && j.crawl);
  const totals = jobs.reduce((t, j) => ({ pages: t.pages + j.site!.pages.length, a11y: t.a11y + j.site!.pages.reduce((n, p) => n + p.a11y_issues.length, 0) }), { pages: 0, a11y: 0 });
  const counts = new Map<string, number>();
  for (const j of jobs) counts.set(kindKey(j.site!.site_kind), (counts.get(kindKey(j.site!.site_kind)) ?? 0) + 1);
  const kinds = [...counts].sort((a, b) => b[1] - a[1]).map(([key, count]) => ({ key, label: KIND_LABEL[key] ?? "Other", count }));

  const items: ShowcaseItem[] = jobs.map((j, i) => {
    const site = j.site!, crawl = j.crawl!;
    const home = crawl.pages[0];
    const v = encodeURIComponent(site.generated_at);
    const a11y = site.pages.reduce((n, p) => n + p.a11y_issues.length, 0);
    const notes = site.pages.reduce((n, p) => n + p.migration_notes.length, 0);
    const host = new URL(crawl.origin).host;
    const logo = site.assets.logo ? `/api/jobs/${j.id}/${site.assets.logo}?v=${v}` : null;
    const kind = (site.site_kind ?? "").replace(/_/g, " ");
    const place = [site.locality?.city, site.locality?.province, site.locality?.region].filter(Boolean).join(", ");
    const text = [site.agency.name, site.agency.short_name, host, kind, KIND_LABEL[kindKey(site.site_kind)], place, site.agency.parent].join(" ").toLowerCase();
    return {
      id: j.id, text, kind: kindKey(site.site_kind),
      node: (
        <article className="mt-10 grid gap-x-12 gap-y-6 border-t border-neutral-300 pt-6 lg:grid-cols-[17rem_1fr]">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-semibold tabular-nums text-neutral-500">{nn(i)}</span>
              {logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="size-10 object-contain" loading="lazy" />
              )}
            </div>
            <h2 className="mt-1 text-2xl font-display font-normal leading-tight tracking-tight text-neutral-900"><Link href={`/preview/${j.id}`} className="hover:text-kapwa-brand-900">{site.agency.name}</Link></h2>
            <p className="mt-2 text-[13px] text-neutral-500"><span className="capitalize">{kind}</span>{place ? ` · ${place}` : ""}</p>
            <p className="mt-1 text-[13px] text-neutral-500 break-all">{host}{crawl.archive ? ` · ${crawl.archive.date.slice(0, 4)} archive` : ""}</p>
            <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-neutral-200 pt-3">
              {[[site.pages.length, "pages"], [a11y, "a11y"], [notes, "to review"]].map(([n, l]) => <div key={String(l)}><dd className="text-lg font-semibold tabular-nums text-neutral-900">{n}</dd><dt className="text-[12px] text-neutral-500">{l}</dt></div>)}
            </dl>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-semibold">
              <Link href={`/preview/${j.id}`} className="border-b-2 border-kapwa-brand-900 hover:text-kapwa-brand-900">Open the site →</Link>
              <Link href={`/report/${j.id}`} className="text-neutral-600 hover:text-kapwa-brand-900">Report</Link>
              <a href={crawl.origin} target="_blank" rel="noreferrer" className="text-xs font-medium text-neutral-400 hover:text-neutral-700">Original ↗</a>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:gap-6">
            <figure>
              <figcaption className={`${eyebrow} pb-2 text-neutral-500`}><span className="text-kapwa-red-700">Before</span> · {crawl.archive ? "archive" : "live site"}</figcaption>
              <div className="relative overflow-hidden border border-neutral-300 bg-neutral-100" style={{ aspectRatio: "1440/900" }}>
                {home?.viewportShotFile ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/jobs/${j.id}/${home.viewportShotFile}`} alt={`${site.agency.name} homepage before`} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" />
                ) : <span className="absolute inset-0 grid place-items-center text-sm text-neutral-400">No screenshot</span>}
              </div>
            </figure>
            <figure>
              <figcaption className={`${eyebrow} pb-2 text-neutral-500`}><span className="text-kapwa-brand-900">After</span> · RE:GOV concept</figcaption>
              <Link href={`/preview/${j.id}`} className="group block">
                <ScaledFrame src={`/preview/${j.id}`} title={`${site.agency.name} reimagined`} className="border border-kapwa-brand-900 bg-white group-hover:ring-4 group-hover:ring-kapwa-yellow-400" />
              </Link>
            </figure>
          </div>
        </article>
      ),
    };
  });

  return (
    <>
      <AppHeader crumb="Showcase" />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-20">
          <div className="grid gap-x-12 gap-y-6 border-b border-neutral-300 pb-8 lg:grid-cols-[17rem_1fr]">
            <p className={`${eyebrow} pt-3 text-kapwa-brand-900`}>Showcase</p>
            <div>
              <h1 className="text-4xl font-display font-normal leading-[0.95] tracking-tight sm:text-6xl">Before and after.</h1>
              <p className="mt-4 max-w-2xl text-lg text-neutral-600">Every site below was rebuilt by the agent from its public pages or Wayback Machine capture. The old homepage is a real screenshot; the new one is the live, clickable concept.</p>
              <dl className="mt-6 flex flex-wrap gap-x-10 gap-y-3">
                {[[jobs.length, "sites"], [totals.pages, "pages rebuilt"], [totals.a11y, "a11y findings"]].map(([v, l]) => <div key={String(l)}><dd className="text-3xl font-display tabular-nums text-kapwa-brand-900">{v}</dd><dt className="text-[13px] text-neutral-500">{l}</dt></div>)}
              </dl>
            </div>
          </div>

          {jobs.length === 0 ? <p className="mt-10 text-neutral-500">Nothing reimagined yet. <Link href="/#reimagine" className="font-semibold text-kapwa-brand-900">Start one →</Link></p> : <ShowcaseList items={items} kinds={kinds} />}
          <div className="mt-14"><Link href="/#reimagine" className={btn.primary}>Reimagine another site →</Link></div>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
