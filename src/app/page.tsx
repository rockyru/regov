import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { ReimagineBox } from "@/components/ReimagineBox";
import { JobCard, cardGrid } from "@/components/JobCard";
import { AppHeader, AppFooter, SectionHead, eyebrow } from "@/components/AppShell";
import { Reveal } from "@/components/Reveal";
import { QueueStrip } from "@/components/QueueStrip";
import { queueStrip } from "@/lib/queueStrip";

export const dynamic = "force-dynamic";

const STEPS: { title: string; body: string; tools: { name: string; meta?: boolean }[] }[] = [
  { title: "Crawl", body: "Playwright walks the site politely, page by page. If bot protection blocks it, the agent reads the Wayback Machine capture instead.", tools: [{ name: "Playwright" }, { name: "Wayback Machine" }] },
  { title: "Understand", body: "Muse Spark reads every page as a citizen would: what it offers, who it names, what is broken, and what a screen reader cannot see.", tools: [{ name: "Muse Spark 1.3", meta: true }] },
  { title: "Segment", body: "SAM 3.1 finds the seal, navigation and banners on the old homepage, and cuts the seal out as the new brand mark.", tools: [{ name: "SAM 3.1", meta: true }] },
  { title: "Illustrate", body: "Muse Spark writes an art brief for the real place and mandate; Muse Image paints the identity band and cover.", tools: [{ name: "Muse Image", meta: true }] },
  { title: "Rebuild", body: "A site plan, mega menus, hotlines, transparency and a migration report, assembled on the BetterGov Kapwa design system.", tools: [{ name: "Kapwa" }, { name: "Next.js" }] },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string; url?: string; wait?: string }> }) {
  const { error = "", url = "", wait = "" } = await searchParams;
  const all = await listJobs();
  const jobs = all.filter((j) => j.site);
  let n = 1;
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
          <p className="mx-auto mt-6 max-w-2xl text-[13px] text-neutral-500">Government domains only: agencies, LGUs, state universities, hospitals. Sites behind bot protection are rebuilt from their Wayback Machine archive. Output is an unofficial concept.</p>
          </Reveal>
        </section>


        {/* How it works */}
        <section className="container-gov pt-10">
          <Reveal><SectionHead n={n++} title="How the agent works" deck="Paste one address. Within minutes the agent has read the whole site, found what is broken, and rebuilt it as a modern, accessible concept you can click through." aside={<span>Three Meta models, one pipeline</span>} /></Reveal>
          <Reveal as="ol" stagger className="mt-8 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((st, i) => (
              <li key={st.title} className="relative flex flex-col border-t-2 border-kapwa-brand-900 pt-6">
                <span aria-hidden className="absolute -top-0.5 left-0 h-1.5 w-12 bg-kapwa-yellow-400" />
                <div className="text-5xl font-display font-normal tracking-tight tabular-nums text-kapwa-brand-900">{String(i + 1).padStart(2, "0")}</div>
                <h3 className="mt-5 text-xl font-bold text-neutral-900">{st.title}</h3>
                <p className="mt-2 text-[15px] leading-snug text-neutral-600">{st.body}</p>
                <ul className="mt-auto pt-5 flex flex-wrap gap-2">
                  {st.tools.map((t) => <li key={t.name} className={`inline-flex h-7 items-center gap-1.5 px-2.5 text-xs font-semibold ${t.meta ? "bg-kapwa-brand-900 text-white" : "border border-neutral-300 text-neutral-700"}`}>{t.meta && <span className="size-1.5 bg-kapwa-yellow-400" />}{t.name}</li>)}
                </ul>
              </li>
            ))}
          </Reveal>
        </section>

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
