import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { ReimagineBox } from "@/components/ReimagineBox";

export const dynamic = "force-dynamic";

export default async function Home() {
  const jobs = (await listJobs()).filter((j) => j.site);
  return (
    <main className="flex-1 flex flex-col">
      <section className="flex-1 flex items-center justify-center px-5 py-16">
        <div className="w-full max-w-2xl text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-kapwa-brand-700">Autonomous civic technology</p>
          <h1 className="mt-3 text-6xl sm:text-7xl font-black tracking-tight leading-none"><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</h1>
          <p className="mt-4 text-xl text-neutral-700">Reimagine Government. Public websites deserve a second life.</p>
          <div className="mt-10"><ReimagineBox /></div>
          <p className="mt-6 text-sm text-neutral-500">Agencies, LGUs, universities, hospitals. Sites behind bot protection are rebuilt from their Wayback Machine archive.</p>
        </div>
      </section>

      {jobs.length > 0 && (
        <section className="border-t border-neutral-100 bg-neutral-50/60">
          <div className="mx-auto max-w-5xl px-5 py-10">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Recently reimagined</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {jobs.map((j) => (
                <li key={j.id} className="relative flex items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-neutral-200 hover:ring-kapwa-brand-400 hover:shadow-md transition">
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-kapwa-brand-900">
                    {j.site!.assets.cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/jobs/${j.id}/${j.site!.assets.cover}?v=${encodeURIComponent(j.site!.generated_at)}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <Link href={`/preview/${j.id}`} className="block truncate font-semibold text-neutral-900 hover:text-kapwa-brand-900 after:absolute after:inset-0">{j.site!.agency.name}</Link>
                    <span className="block text-xs text-neutral-500">{new URL(j.crawl!.origin).host} · {j.site!.pages.length} pages · {(j.site!.site_kind ?? "").replace(/_/g, " ")}</span>
                    <Link href={`/report/${j.id}`} className="relative z-10 mt-1 inline-block text-xs text-kapwa-brand-700 hover:underline">Migration report</Link>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <footer className="px-5 py-6 text-center text-xs text-neutral-400">
        Built with Muse Spark 1.3, SAM 3.1 and Muse Image on the BetterGov.ph Kapwa standard · <a className="underline hover:text-neutral-600" href="https://github.com/rockyru/regov">github.com/rockyru/regov</a>
      </footer>
    </main>
  );
}
