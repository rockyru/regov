import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { ReimagineBox } from "@/components/ReimagineBox";
import { JobCard } from "@/components/JobCard";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; url?: string }> }) {
  const { error = "", url = "" } = await searchParams;
  const all = await listJobs();
  const jobs = all.filter((j) => j.site);
  const active = all.filter((j) => !j.site && j.status && !j.status.error && Date.now() - new Date(j.status.startedAt).getTime() < 60 * 60 * 1000);
  const failed = all.filter((j) => !j.site && j.status?.error && Date.now() - new Date(j.status.startedAt).getTime() < 6 * 60 * 60 * 1000);
  return (
    <main className="relative min-h-dvh flex flex-col overflow-hidden">
      {/* Soft civic glow rising from the bottom: Kapwa blue with a touch of sun yellow and red */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[70vh]">
        <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_100%,rgba(0,56,168,0.16),transparent_70%),radial-gradient(40%_45%_at_12%_100%,rgba(252,209,22,0.20),transparent_70%),radial-gradient(40%_45%_at_88%_100%,rgba(206,18,38,0.10),transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,56,168,0.10)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:linear-gradient(to_top,black_0%,transparent_70%)]" />
        <svg className="absolute bottom-0 left-0 w-[160%] -translate-x-[18%] text-kapwa-brand-900/[0.06]" viewBox="0 0 1440 220" fill="currentColor" preserveAspectRatio="none" aria-hidden>
          <path d="M0 140c160-60 320-80 480-60s320 80 480 60 320-100 480-80v160H0z" />
          <path d="M0 190c200-40 400-60 600-30s400 70 600 40 240-60 240-60v100H0z" opacity=".7" />
        </svg>
      </div>

      <header className="container-gov pt-6 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tight leading-none"><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</Link>
        <p className="hidden sm:block text-[11px] font-semibold uppercase tracking-[0.3em] text-kapwa-brand-700">Autonomous civic technology</p>
      </header>

      <section className="flex-1 flex items-center justify-center px-5 py-6">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.02] text-neutral-900">Reimagine <span className="text-kapwa-brand-900">Government</span>.</h1>
          <p className="mt-4 text-lg sm:text-xl text-neutral-600">Public websites deserve a second life.</p>
          <div className="mt-7"><ReimagineBox done={jobs.map((j) => new URL(j.crawl!.origin).host.replace(/^www\./, ""))} initialError={error} initialUrl={url} /></div>
          <p className="mt-4 text-sm text-neutral-500">Government domains only: agencies, LGUs, state universities, hospitals. Sites behind bot protection are rebuilt from their Wayback Machine archive.</p>
        </div>
      </section>

      {(active.length > 0 || failed.length > 0) && (
        <section className="border-t border-neutral-100/80">
          <div className="container-gov py-5">
            <ul className="flex flex-wrap justify-center gap-3">
              {active.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-2 rounded-full bg-kapwa-brand-50 px-4 py-2 text-sm font-medium text-kapwa-brand-900 ring-1 ring-kapwa-brand-100 hover:bg-kapwa-brand-100"><span className="size-2 rounded-full bg-kapwa-brand-600 animate-pulse" />Reimagining {new URL(j.status!.url).host} · {j.status!.phase} →</Link></li>)}
              {failed.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-2 rounded-full bg-kapwa-red-50 px-4 py-2 text-sm font-medium text-kapwa-red-800 ring-1 ring-kapwa-red-100 hover:bg-kapwa-red-100"><span className="size-2 rounded-full bg-kapwa-red-500" />{new URL(j.status!.url).host} stopped →</Link></li>)}
            </ul>
          </div>
        </section>
      )}

      {jobs.length > 0 && (
        <section className="border-t border-neutral-100/80">
          <div className="container-gov py-6">
            <div className="flex items-center justify-center gap-4">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Recently reimagined</h2>
              {jobs.length > 4 && <Link href="/jobs" className="text-sm font-semibold text-kapwa-brand-800 hover:underline">View all {jobs.length} →</Link>}
            </div>
            <ul className="mt-4 flex flex-wrap justify-center gap-5">
              {jobs.slice(0, 4).map((j) => <JobCard key={j.id} id={j.id} site={j.site!} crawl={j.crawl!} compact className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[400px]" />)}
            </ul>
          </div>
        </section>
      )}

      <footer className="px-5 py-3 text-center text-xs text-neutral-400 space-y-1">
        <p>Reimagined sites are <strong className="font-semibold text-neutral-500">unofficial AI-generated concepts</strong>, not affiliated with or endorsed by any agency. Always use the official website for services.</p>
        <p>Built with Muse Spark 1.3, SAM 3.1 and Muse Image on the BetterGov.ph Kapwa standard · <a className="underline hover:text-neutral-600" href="https://github.com/rockyru/regov">github.com/rockyru/regov</a></p>
      </footer>
    </main>
  );
}
