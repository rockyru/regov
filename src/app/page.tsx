import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { ReimagineBox } from "@/components/ReimagineBox";
import { JobCard, cardGrid } from "@/components/JobCard";
import { AppHeader, AppFooter, SectionHead, eyebrow } from "@/components/AppShell";

export const dynamic = "force-dynamic";

const STEPS = [
  ["Crawl", "Playwright walks the site, or its Wayback Machine copy when bots are blocked."],
  ["Understand", "Muse Spark reads every page: structure, services, people, accessibility gaps."],
  ["Segment", "SAM 3.1 finds the seal and layout regions on the old homepage."],
  ["Rebuild", "Pages are re-planned and assembled on the BetterGov Kapwa design system."],
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; url?: string }> }) {
  const { error = "", url = "" } = await searchParams;
  const all = await listJobs();
  const jobs = all.filter((j) => j.site);
  const now = new Date().getTime();
  const recent = (j: (typeof all)[number]) => j.status && now - new Date(j.status.startedAt).getTime() < 60 * 60 * 1000;
  const active = all.filter((j) => !j.site && j.status && !j.status.error && recent(j));
  const failed = all.filter((j) => !j.site && j.status?.error && (j.crawl?.pages.length ?? 0) > 0 && recent(j));
  let n = 1;
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        {/* Masthead */}
        <section className="container-gov pt-14 pb-16 lg:pt-24 lg:pb-20 text-center">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Autonomous civic technology</p>
          <h1 className="mt-5 text-5xl sm:text-6xl xl:text-[84px] font-black tracking-tight leading-[0.95] text-neutral-900">Reimagine <span className="text-kapwa-brand-900">Government</span>.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-neutral-600 leading-snug">Public websites deserve a second life. Paste a Philippine government site and an agent crawls it, understands it, and rebuilds it on the BetterGov Kapwa standard.</p>
          <div className="mx-auto mt-10 max-w-2xl">
            <ReimagineBox done={jobs.map((j) => new URL(j.crawl!.origin).host.replace(/^www\./, ""))} initialError={error} initialUrl={url} />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-[13px] text-neutral-500">Government domains only: agencies, LGUs, state universities, hospitals. Sites behind bot protection are rebuilt from their Wayback Machine archive. Output is an unofficial concept.</p>
        </section>

        {(active.length > 0 || failed.length > 0) && (
          <section className="border-b border-neutral-200 bg-kapwa-yellow-50">
            <ul className="container-gov py-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {active.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-2 font-semibold text-kapwa-brand-900 hover:underline"><span className="size-2 bg-kapwa-brand-600 animate-pulse" />Reimagining {new URL(j.status!.url).host} · {j.status!.phase} →</Link></li>)}
              {failed.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-2 font-semibold text-kapwa-red-800 hover:underline"><span className="size-2 bg-kapwa-red-600" />{new URL(j.status!.url).host} stopped →</Link></li>)}
            </ul>
          </section>
        )}

        {/* How it works */}
        <section className="container-gov pt-10">
          <SectionHead n={n++} title="How the agent works" />
          <ol className={`mt-6 grid sm:grid-cols-2 lg:grid-cols-4 border-t border-l border-neutral-200`}>
            {STEPS.map(([t, d], i) => (
              <li key={t} className="border-r border-b border-neutral-200 p-5">
                <div className="text-sm font-semibold tabular-nums text-kapwa-brand-900">{String(i + 1).padStart(2, "0")}</div>
                <div className="mt-2 font-bold text-neutral-900">{t}</div>
                <p className="mt-1 text-sm text-neutral-600 leading-snug">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        {jobs.length > 0 && (
          <section className="container-gov pt-14 pb-16">
            <SectionHead n={n++} title="Recently reimagined" aside={<><span className="tabular-nums">{jobs.length} sites</span>{jobs.length > 3 && <> · <Link href="/jobs" className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">View all →</Link></>}</>} />
            <ul className={`mt-6 ${cardGrid} sm:grid-cols-2 lg:grid-cols-3`}>
              {jobs.slice(0, 3).map((j, i) => <JobCard key={j.id} index={i} id={j.id} site={j.site!} crawl={j.crawl!} />)}
            </ul>
          </section>
        )}
      </main>
      <AppFooter />
    </>
  );
}
