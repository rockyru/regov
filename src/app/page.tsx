import Link from "next/link";
import { listJobs, loadSite } from "@/lib/jobs";
import { ScaledFrame } from "@/components/ScaledFrame";
import { ReimagineBox } from "@/components/ReimagineBox";
import { JobCard, cardGrid } from "@/components/JobCard";
import { AppHeader, AppFooter, SectionHead, eyebrow } from "@/components/AppShell";
import { Reveal } from "@/components/Reveal";
import { QueueStrip } from "@/components/QueueStrip";
import { queueStrip } from "@/lib/queueStrip";
import { runQueue } from "@/lib/runQueue";

export const dynamic = "force-dynamic";

// The featured reimagining: eGovPH, art-directed in its own look (src/components/site/Aurora.tsx).
const FEATURED = "e-gov-ph-mvq8z9ew";

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; url?: string; wait?: string }> }) {
  const { error = "", url = "", wait = "" } = await searchParams;
  const all = await listJobs();
  const jobs = all.filter((j) => j.site);
  let n = 1;
  const { today } = runQueue.snapshot();
  const left = Math.max(0, today.max - today.used);
  const featuredJob = jobs.find((j) => j.id === FEATURED);
  const featured = featuredJob ? await loadSite(FEATURED) : null;
  const featuredShot = featuredJob?.crawl?.pages[0]?.viewportShotFile;
  return (
    <>
      <AppHeader />
      <main className="flex-1">
        <QueueStrip initial={await queueStrip(all)} />

        {/* Masthead */}
        <section className="relative flex min-h-[calc(100dvh-4rem)] flex-col overflow-hidden">
          {/* Muse Image: a Philippine civic panorama pinned to the bottom of the viewport (public/hero.jpg) */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[max(33.4vw,46%)] min-h-64">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/hero.jpg" srcSet="/hero-sm.jpg 1280w, /hero.jpg 2560w" sizes="100vw" alt="" className="block h-full w-full object-cover object-[50%_100%]" />
            <div className="absolute inset-x-0 top-0 h-1/2 bg-[linear-gradient(180deg,#fff_0%,rgba(255,255,255,0.75)_45%,rgba(255,255,255,0)_100%)]" />
          </div>
          <Reveal className="container-gov pt-14 pb-56 sm:pb-[22vw] lg:pt-20 text-center">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Autonomous civic technology</p>
          <h1 className="mt-5 text-5xl sm:text-6xl xl:text-[84px] font-display font-normal tracking-tight leading-[0.95] text-neutral-900">Reimagine <span className="text-kapwa-brand-900">Government</span>.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg sm:text-xl text-neutral-600 leading-snug">Public websites deserve a second life. Paste a Philippine government site and an agent crawls it, understands it, and rebuilds it on the BetterGov Kapwa standard.</p>
          <div className="mx-auto mt-10 max-w-2xl">
            <ReimagineBox done={jobs.map((j) => new URL(j.crawl!.origin).host.replace(/^www\./, ""))} initialError={error} initialUrl={url} initialWait={Number(wait) || 0} />
          </div>
          {/* Daily allowance notice: resets at 8:00 AM Manila (src/lib/runQueue.ts) */}
          <p role="status" className="mx-auto mt-6 inline-flex max-w-2xl flex-wrap items-center justify-center gap-x-3 gap-y-1 border border-kapwa-brand-900/20 bg-white/80 px-4 py-2 text-sm text-neutral-700">
            <span className="font-semibold text-neutral-900">Up to {today.max} new sites a day</span>
            <span aria-hidden className="hidden text-neutral-400 sm:inline">·</span>
            <span>Resets daily at <span className="font-semibold text-neutral-900">8:00 AM</span> Philippine time</span>
            <span aria-hidden className="hidden text-neutral-400 sm:inline">·</span>
            <span className={left ? "font-semibold text-kapwa-green-800" : "font-semibold text-kapwa-red-700"}>{left ? `${left} left today` : "Used up until 8:00 AM"}</span>
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-[13px] text-neutral-500">Government domains only: agencies, LGUs, state universities, hospitals. Sites behind bot protection are rebuilt from their Wayback Machine archive. Output is an unofficial concept.</p>
          </Reveal>
        </section>


        {/* Featured reimagining */}
        {featured && featuredShot && (
          <section className="container-gov pt-10">
            <Reveal><SectionHead n={n++} title="Featured reimagining" deck={`${featured.agency.name}: a site that was already modern, so the agent kept its identity and rebuilt every page around it, with art by Muse Image.`} aside={<span>{new URL(featured.origin).host}</span>} /></Reveal>
            <Reveal className="mt-8 grid gap-6 lg:grid-cols-2">
              <figure>
                <figcaption className={`${eyebrow} text-neutral-500 pb-2`}>Before · {new URL(featured.origin).host}</figcaption>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/jobs/${FEATURED}/${featuredShot}`} alt={`The original ${featured.agency.short_name} homepage`} className="w-full border border-neutral-300 object-cover object-top" style={{ aspectRatio: "1440/900" }} />
              </figure>
              <figure>
                <figcaption className={`${eyebrow} text-kapwa-brand-900 pb-2`}>After · unofficial RE:GOV concept</figcaption>
                <Link href={`/preview/${FEATURED}`} className="block" aria-label={`Open the reimagined ${featured.agency.short_name}`}>
                  <ScaledFrame src={`/preview/${FEATURED}?lang=en`} title={`The reimagined ${featured.agency.short_name} homepage`} className="border border-kapwa-brand-900" />
                </Link>
              </figure>
            </Reveal>
            <Reveal className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-[15px]">
              <Link href={`/preview/${FEATURED}`} className="inline-flex h-11 items-center gap-2 bg-kapwa-brand-900 px-5 font-semibold text-white hover:bg-kapwa-brand-950">Open the concept →</Link>
              <Link href={`/report/${FEATURED}`} className="font-semibold text-neutral-900 border-b-2 border-neutral-900 hover:text-kapwa-brand-900">Read the migration report</Link>
              <span className="text-neutral-500">{featured.pages.filter((p) => !p.document).length} pages migrated · Muse Spark, SAM 3.1 and Muse Image</span>
            </Reveal>
          </section>
        )}

        {jobs.length > 0 && (
          <section className="container-gov pt-14 pb-16">
            <Reveal><SectionHead n={n++} title="Recently reimagined" aside={<><span className="tabular-nums">{jobs.length} sites</span>{jobs.length > 3 && <> · <Link href="/showcase" className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">View the showcase →</Link></>}</>} /></Reveal>
            <Reveal as="ul" stagger className={`mt-6 ${cardGrid} sm:grid-cols-2 lg:grid-cols-3`}>
              {jobs.slice(0, 3).map((j, i) => <JobCard key={j.id} index={i} id={j.id} site={j.site!} crawl={j.crawl!} />)}
            </Reveal>
          </section>
        )}
      </main>
      <AppFooter />
    </>
  );
}
