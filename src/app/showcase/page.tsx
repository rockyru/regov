import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { AppHeader, AppFooter, eyebrow, btn, nn } from "@/components/AppShell";
import { Reveal } from "@/components/Reveal";
import { ScaledFrame } from "@/components/ScaledFrame";

export const dynamic = "force-dynamic";
export const metadata = { title: "Showcase" };

export default async function Showcase() {
  const jobs = (await listJobs()).filter((j) => j.site && j.crawl);
  const totals = jobs.reduce((t, j) => ({ pages: t.pages + j.site!.pages.length, a11y: t.a11y + j.site!.pages.reduce((n, p) => n + p.a11y_issues.length, 0) }), { pages: 0, a11y: 0 });
  return (
    <>
      <AppHeader crumb="Showcase" />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-20">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Showcase</p>
          <div className="mt-2 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end border-b-2 border-kapwa-brand-900 pb-8">
            <div>
              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[0.95]">Before and after.</h1>
              <p className="mt-4 max-w-2xl text-lg text-neutral-600">Every site below was rebuilt by the agent from its public pages or Wayback Machine capture. The old homepage on the left is a real screenshot; the new one on the right is the live, clickable concept.</p>
            </div>
            <dl className="grid grid-cols-3 gap-6 text-right lg:text-left">
              {[[jobs.length, "sites"], [totals.pages, "pages rebuilt"], [totals.a11y, "a11y findings"]].map(([v, l]) => <div key={String(l)}><dd className="text-3xl font-black tabular-nums text-kapwa-brand-900">{v}</dd><dt className="text-[13px] text-neutral-500">{l}</dt></div>)}
            </dl>
          </div>

          {jobs.length === 0 && <p className="mt-10 text-neutral-500">Nothing reimagined yet. <Link href="/#reimagine" className="font-semibold text-kapwa-brand-900">Start one →</Link></p>}

          {jobs.map((j, i) => {
            const site = j.site!, crawl = j.crawl!;
            const home = crawl.pages[0];
            const v = encodeURIComponent(site.generated_at);
            const a11y = site.pages.reduce((n, p) => n + p.a11y_issues.length, 0);
            const notes = site.pages.reduce((n, p) => n + p.migration_notes.length, 0);
            const host = new URL(crawl.origin).host;
            const logo = site.assets.logo ? `/api/jobs/${j.id}/${site.assets.logo}?v=${v}` : null;
            return (
              <Reveal as="section" key={j.id} className={`pt-10 ${i > 0 ? "mt-14 border-t-2 border-kapwa-brand-900" : ""}`}>
                <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,30%)] lg:items-end">
                  <div className="flex items-start gap-5">
                    {logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logo} alt="" className="size-16 shrink-0 object-contain border border-neutral-200 bg-white p-1" />
                    ) : <span className="size-16 shrink-0 bg-kapwa-brand-900" />}
                    <div className="min-w-0">
                      <p className={`${eyebrow} text-neutral-500`}><span className="text-kapwa-brand-900 tabular-nums mr-3">{nn(i)}</span>{(site.site_kind ?? "").replace(/_/g, " ")}{site.locality?.province ? ` · ${site.locality.province}` : ""}</p>
                      <h2 className="mt-2 text-3xl sm:text-4xl font-black tracking-tight leading-tight"><Link href={`/preview/${j.id}`} className="hover:text-kapwa-brand-900">{site.agency.name}</Link></h2>
                      <p className="mt-2 text-neutral-600 max-w-2xl">{site.agency.description}</p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-4 lg:grid-cols-2 gap-x-6 gap-y-3 border-t border-neutral-900/15 pt-4">
                    {[[crawl.pages.length, "pages crawled"], [site.pages.length, "pages rebuilt"], [a11y, "a11y findings"], [notes, "for human review"]].map(([v, l]) => <div key={String(l)}><dd className="text-2xl font-bold tabular-nums">{v}</dd><dt className="text-[12px] text-neutral-500">{l}</dt></div>)}
                  </dl>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-2">
                  <figure>
                    <figcaption className={`${eyebrow} flex items-center justify-between text-neutral-500 pb-2`}><span><span className="text-kapwa-red-700">Before</span> · {host}</span><span className="normal-case tracking-normal font-medium">{crawl.archive ? `Wayback Machine, ${crawl.archive.date.slice(0, 10)}` : "Live site"}</span></figcaption>
                    <div className="relative overflow-hidden border border-neutral-300 bg-neutral-100" style={{ aspectRatio: "1440/900" }}>
                      {home?.viewportShotFile ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/jobs/${j.id}/${home.viewportShotFile}`} alt={`${site.agency.name} homepage before`} className="absolute inset-0 h-full w-full object-cover object-top" loading="lazy" />
                      ) : <span className="absolute inset-0 grid place-items-center text-sm text-neutral-400">No screenshot</span>}
                    </div>
                  </figure>
                  <figure>
                    <figcaption className={`${eyebrow} flex items-center justify-between text-neutral-500 pb-2`}><span><span className="text-kapwa-brand-900">After</span> · RE:GOV concept</span><span className="normal-case tracking-normal font-medium">Live preview</span></figcaption>
                    <Link href={`/preview/${j.id}`} className="block group">
                      <ScaledFrame src={`/preview/${j.id}`} title={`${site.agency.name} reimagined`} className="border border-kapwa-brand-900 bg-white group-hover:ring-4 group-hover:ring-kapwa-yellow-400" />
                    </Link>
                  </figure>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Link href={`/preview/${j.id}`} className={btn.primary}>Open the site →</Link>
                  <Link href={`/report/${j.id}`} className={btn.ghost}>Migration report</Link>
                  <a href={crawl.origin} target="_blank" rel="noreferrer" className="ml-auto text-sm font-medium text-neutral-500 hover:text-neutral-900">Original site ↗</a>
                </div>
              </Reveal>
            );
          })}
        </div>
      </main>
      <AppFooter />
    </>
  );
}
