import Link from "next/link";
import { listJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const jobs = await listJobs();
  return (
    <main className="container-gov py-14 flex-1">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-kapwa-brand-700">Autonomous civic technology</p>
      <h1 className="mt-2 text-5xl sm:text-6xl font-black tracking-tight"><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</h1>
      <p className="mt-3 text-2xl font-semibold text-neutral-900">Reimagine Government. Public websites deserve a second life.</p>
      <p className="mt-3 max-w-2xl text-lg text-neutral-600">An autonomous AI agent that transforms legacy government websites into modern, accessible, citizen-first digital experiences. Powered by Muse Spark, SAM 3.1 and Muse Image on the BetterGov.ph Kapwa standard.</p>

      <form action="/api/run" method="post" className="mt-8 flex max-w-xl gap-2">
        <input name="url" required placeholder="https://agency.gov.ph" className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-kapwa-brand-500" />
        <button className="rounded-lg bg-kapwa-brand-800 px-5 py-3 font-semibold text-white hover:bg-kapwa-brand-900">Reimagine</button>
      </form>

      <h2 className="mt-14 text-xl font-semibold">Jobs</h2>
      <ul className="mt-4 grid gap-6 md:grid-cols-2">
        {jobs.map((j) => (
          <li key={j.id} className="rounded-2xl ring-1 ring-neutral-200 overflow-hidden">
            <div className="grid grid-cols-2 bg-neutral-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/jobs/${j.id}/shots/000.viewport.png`} alt="Original homepage" className="aspect-[4/3] w-full object-cover object-top opacity-80" />
              <div className="relative aspect-[4/3] grid place-items-center bg-[radial-gradient(ellipse_at_top_left,var(--color-kapwa-brand-700),var(--color-kapwa-brand-950))] text-white text-center p-4 overflow-hidden">
                {j.site?.assets.cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/api/jobs/${j.id}/${j.site.assets.cover}?v=${encodeURIComponent(j.site.generated_at)}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                )}
                {j.site?.assets.cover && <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-kapwa-brand-950/90 to-transparent" aria-hidden />}
                <span className="relative self-end justify-self-start text-left">
                  {j.site ? <><span className="block text-[11px] uppercase tracking-wider text-kapwa-yellow-300">Reimagined</span><span className="block font-bold text-lg leading-tight drop-shadow">{j.site.agency.short_name}</span></> : <span className="text-sm text-white/70">crawled, not yet built</span>}
                </span>
              </div>
            </div>
            <div className="p-5">
              <div className="font-semibold">{j.site?.agency.name ?? j.crawl?.origin}</div>
              <div className="text-sm text-neutral-500">{j.crawl?.origin} · {j.crawl?.pages.length} pages crawled{j.crawl?.wp ? ` · WP REST: ${j.crawl.wp.pages.length} pages` : ""}</div>
              <div className="mt-4 flex gap-3 text-sm font-semibold">
                {j.site && <Link href={`/preview/${j.id}`} className="rounded-md bg-kapwa-brand-800 px-3 py-1.5 text-white hover:bg-kapwa-brand-900">Open new site</Link>}
                {j.site && <Link href={`/report/${j.id}`} className="rounded-md ring-1 ring-neutral-300 px-3 py-1.5 hover:bg-neutral-50">Migration report</Link>}
                <a href={j.crawl?.origin} target="_blank" rel="noreferrer" className="rounded-md px-3 py-1.5 text-neutral-600 hover:bg-neutral-50">Original ↗</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
