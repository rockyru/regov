import { listJobs } from "@/lib/jobs";
import { JobCard, cardGrid } from "@/components/JobCard";
import { AppHeader, AppFooter, eyebrow } from "@/components/AppShell";

export const dynamic = "force-dynamic";

export default async function AllJobs() {
  const jobs = (await listJobs()).filter((j) => j.site);
  return (
    <>
      <AppHeader crumb="All reimagined sites" />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-16">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Index</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4 border-b-2 border-kapwa-brand-900 pb-5">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight">All reimagined sites</h1>
            <p className="text-neutral-500 tabular-nums">{jobs.length} sites · unofficial concepts</p>
          </div>
          <ul className={`mt-8 ${cardGrid} sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4`}>
            {jobs.map((j, i) => <JobCard key={j.id} index={i} id={j.id} site={j.site!} crawl={j.crawl!} />)}
          </ul>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
