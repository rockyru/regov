import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { JobCard } from "@/components/JobCard";

export const dynamic = "force-dynamic";

export default async function AllJobs() {
  const jobs = (await listJobs()).filter((j) => j.site);
  return (
    <main className="flex-1">
      <header className="container-gov pt-6 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tight leading-none"><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</Link>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← Back to home</Link>
      </header>
      <div className="container-gov py-10">
        <h1 className="text-3xl font-black tracking-tight">All reimagined sites</h1>
        <p className="mt-1 text-neutral-500">{jobs.length} sites</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {jobs.map((j) => <JobCard key={j.id} id={j.id} site={j.site!} crawl={j.crawl!} />)}
        </ul>
      </div>
    </main>
  );
}
