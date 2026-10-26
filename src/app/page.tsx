import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { ReimagineBox } from "@/components/ReimagineBox";
import { JobCard } from "@/components/JobCard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jobs = (await listJobs()).filter((j) => j.site);
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

      <header className="mx-auto w-full max-w-6xl px-5 pt-6 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tight leading-none"><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</Link>
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-kapwa-brand-700">Autonomous civic technology</p>
      </header>

      <section className="flex-1 flex items-center justify-center px-5 py-6">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight leading-[1.02] text-neutral-900">Reimagine <span className="text-kapwa-brand-900">Government</span>.</h1>
          <p className="mt-4 text-xl text-neutral-600">Public websites deserve a second life.</p>
          <div className="mt-7"><ReimagineBox done={jobs.map((j) => new URL(j.crawl!.origin).host.replace(/^www\./, ""))} /></div>
          <p className="mt-4 text-sm text-neutral-500">Agencies, LGUs, universities, hospitals. Sites behind bot protection are rebuilt from their Wayback Machine archive.</p>
        </div>
      </section>

      {jobs.length > 0 && (
        <section className="border-t border-neutral-100/80">
          <div className="mx-auto max-w-6xl px-5 py-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Recently reimagined</h2>
              {jobs.length > 3 && <Link href="/jobs" className="text-sm font-semibold text-kapwa-brand-800 hover:underline">View all {jobs.length} →</Link>}
            </div>
            <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.slice(0, 3).map((j) => <JobCard key={j.id} id={j.id} site={j.site!} crawl={j.crawl!} compact />)}
            </ul>
          </div>
        </section>
      )}

      <footer className="px-5 py-3 text-center text-xs text-neutral-400">
        Built with Muse Spark 1.3, SAM 3.1 and Muse Image on the BetterGov.ph Kapwa standard · <a className="underline hover:text-neutral-600" href="https://github.com/rockyru/regov">github.com/rockyru/regov</a>
      </footer>
    </main>
  );
}
