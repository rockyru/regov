import { notFound } from "next/navigation";
import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { isAdmin } from "@/lib/admin";
import { runQueue } from "@/lib/runQueue";
import { assessing } from "@/lib/designCheck";
import { AppHeader, AppFooter, eyebrow, btn } from "@/components/AppShell";

export const dynamic = "force-dynamic";
export const metadata = { title: "Operator | RE:GOV", robots: { index: false, follow: false } };

type Row = { host: string; url: string; jobId: string; doneId?: string; state: "done" | "failed" | "running" | "queued"; when: number; done: number; design?: string; error?: string };

/** Operator view: every site's latest run, with reruns that skip the public limits (see /api/rerun). */
export default async function Admin({ searchParams }: { searchParams: Promise<{ token?: string; rerun?: string; assess?: string; show?: string }> }) {
  const { token = "", rerun, assess, show = "all" } = await searchParams;
  if (!isAdmin(token)) notFound();
  const jobs = await listJobs();
  const rows = new Map<string, Row>();
  for (const j of jobs) {
    const url = j.status?.url ?? j.crawl?.origin;
    if (!url) continue;
    const host = new URL(url).hostname.replace(/^www\./, "");
    const s = j.status;
    const state: Row["state"] = s?.done || (!s && j.site) ? "done" : s?.error ? "failed" : s?.phase === "queued" ? "queued" : "running";
    const when = s ? new Date(s.startedAt).getTime() : j.mtime;
    const prev = rows.get(host);
    const done = (prev?.done ?? 0) + (state === "done" ? 1 : 0);
    const design = j.site ? (j.site.design ? `${j.site.design.mode} ${j.site.design.score}/10` : "not checked") : undefined;
    // listJobs is newest first, so the first finished build seen for a host is its latest.
    const doneId = prev?.doneId ?? (state === "done" && j.site ? j.id : undefined);
    if (!prev || when > prev.when) rows.set(host, { host, url, jobId: j.id, doneId, state, when, done, design: prev?.design ?? design, error: s?.error });
    else { prev.done = done; prev.doneId = doneId; prev.design ??= design; }
  }
  const all = [...rows.values()].sort((a, b) => b.when - a.when);
  const list = all.filter((r) => show === "all" || r.state === show || (show === "unchecked" && r.state === "done" && r.design === "not checked"));
  const count = (st: string) => all.filter((r) => r.state === st).length;
  const unchecked = all.filter((r) => r.state === "done" && r.design === "not checked").length;
  const q = runQueue.snapshot();
  const tab = (key: string, label: string, n: number) => <Link href={`/admin?token=${encodeURIComponent(token)}&show=${key}`} className={`border-b-2 px-1 pb-2 ${show === key ? "border-kapwa-brand-900 text-kapwa-brand-900" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>{label} <span className="tabular-nums">{n}</span></Link>;

  return (
    <>
      <AppHeader crumb="Operator" />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-16">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Operator</p>
          <h1 className="mt-2 text-4xl font-display font-normal tracking-tight">Runs and reruns</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">Reruns from here skip the daily quota, the per-visitor limit, the queue cap and the 24-hour dedupe. Each one spends Meta credits (about $0.38 a site). Queue now: {q.running} running, {q.waiting} waiting; {q.today.used} runs today.</p>
          {rerun && <p className="mt-4 border-l-4 border-kapwa-brand-900 bg-kapwa-brand-50 px-5 py-3 text-sm">Queued {rerun} {rerun === "1" ? "rerun" : "reruns"}. They start as slots free up.</p>}
          {(assess || assessing.size > 0) && <p className="mt-4 border-l-4 border-kapwa-brand-900 bg-kapwa-brand-50 px-5 py-3 text-sm">Design check {assessing.size > 0 ? `running for ${assessing.size} ${assessing.size === 1 ? "site" : "sites"}, one at a time (about 10 seconds each). Reload to see results.` : "finished."}</p>}

          <nav className="mt-8 flex flex-wrap gap-6 border-b border-neutral-200 text-sm font-semibold">
            {tab("all", "All sites", all.length)}{tab("failed", "Failed", count("failed"))}{tab("unchecked", "Built before design check", unchecked)}{tab("done", "Done", count("done"))}{tab("running", "Running", count("running") + count("queued"))}
          </nav>

          <form method="post" action="/api/rerun" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-sm text-neutral-600">{list.length} {list.length === 1 ? "site" : "sites"}. Failed sites are ticked. <strong>Apply design check</strong> runs only the new design step on a finished build (cents a site, no rebuild). <strong>Rerun</strong> rebuilds from scratch (about $0.38 a site).</p>
              <div className="flex flex-wrap gap-3">
                <button type="submit" name="action" value="assess" className={btn.ghost}>Apply design check</button>
                <button type="submit" name="action" value="rerun" className={btn.primary}>Rerun ticked sites →</button>
              </div>
            </div>
            <table className="mt-4 w-full text-sm">
              <thead><tr className="border-b-2 border-kapwa-brand-900 text-left"><th className="w-10 py-2" /><th className="py-2 pr-4 font-semibold">Site</th><th className="py-2 pr-4 font-semibold">Latest run</th><th className="py-2 pr-4 font-semibold">Design</th><th className="py-2 pr-4 font-semibold tabular-nums">Builds</th><th className="py-2 font-semibold">When</th></tr></thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.host} className="border-b border-neutral-200 align-top">
                    <td className="py-2"><input type="checkbox" name="job" value={r.doneId ?? r.jobId} defaultChecked={r.state === "failed"} disabled={r.state === "running" || r.state === "queued"} aria-label={`Rerun ${r.host}`} className="size-4 accent-kapwa-brand-900" /></td>
                    <td className="py-2 pr-4"><Link href={`/jobs/${r.jobId}`} className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">{r.host}</Link></td>
                    <td className="py-2 pr-4"><span className={r.state === "failed" ? "font-semibold text-kapwa-red-700" : r.state === "done" ? "text-neutral-700" : "font-semibold text-kapwa-brand-900"}>{r.state}</span>{r.error && <span className="block max-w-md truncate text-xs text-neutral-500" title={r.error}>{r.error}</span>}</td>
                    <td className="py-2 pr-4 text-neutral-600">{r.design ?? ""}</td>
                    <td className="py-2 pr-4 tabular-nums">{r.done}</td>
                    <td className="py-2 whitespace-nowrap tabular-nums text-neutral-500">{new Date(r.when).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </form>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
