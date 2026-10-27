import { notFound } from "next/navigation";
import Link from "next/link";
import { listJobs } from "@/lib/jobs";
import { isAdmin } from "@/lib/admin";
import { runQueue } from "@/lib/runQueue";
import { assessing } from "@/lib/designCheck";
import { AppHeader, AppFooter, eyebrow, btn } from "@/components/AppShell";
import { join } from "node:path";
import { JOBS_ROOT } from "@/lib/jobs";
import { loadUsage } from "@/lib/usage";
import { usd, totalOf } from "@/lib/usageLabels";

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
  // Model usage across every site, from each site's usage.json (sites built before Oct 28 report build tokens only).
  const usages = await Promise.all(jobs.map(async (j) => ({ j, u: await loadUsage(join(JOBS_ROOT, j.id)) })));
  const days = new Map<string, { calls: number; tokens: number }>();
  for (const { u } of usages) for (const [d, v] of Object.entries(u?.days ?? {})) { const x = days.get(d) ?? { calls: 0, tokens: 0 }; x.calls += v.calls; x.tokens += v.tokens; days.set(d, x); }
  const lastDays = [...days].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);
  const topSites = usages.filter((x) => x.u).map((x) => ({ id: x.j.id, name: x.j.site?.agency.short_name || x.j.id, ...totalOf(x.u!) })).sort((a, b) => b.tokens - a.tokens).slice(0, 5);
  // Full builds only: a site that only had a later step backfilled would pull the average down.
  const recorded = usages.filter((x) => x.u?.run.understand).map((x) => totalOf(x.u!).run.tokens);
  // Cost of a full run from what recorded runs actually used; the early measured figure until one exists.
  const perRun = recorded.length ? `about ${usd(recorded.reduce((a, b) => a + b, 0) / recorded.length)} a site on average` : "about $0.80 a site";
  const tab = (key: string, label: string, n: number) => <Link href={`/admin?token=${encodeURIComponent(token)}&show=${key}`} className={`border-b-2 px-1 pb-2 ${show === key ? "border-kapwa-brand-900 text-kapwa-brand-900" : "border-transparent text-neutral-500 hover:text-neutral-900"}`}>{label} <span className="tabular-nums">{n}</span></Link>;

  return (
    <>
      <AppHeader crumb="Operator" />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-16">
          <p className={`${eyebrow} text-kapwa-brand-900`}>Operator</p>
          <h1 className="mt-2 text-4xl font-display font-normal tracking-tight">Runs and reruns</h1>
          <p className="mt-2 max-w-3xl text-neutral-600">Reruns from here skip the daily quota, the per-visitor limit, the queue cap and the 24-hour dedupe. Each one spends Meta credits ({perRun}). Queue now: {q.running} running, {q.waiting} waiting; {q.today.used} runs today.</p>
          <div className="mt-6 grid gap-6 border-t border-neutral-300 pt-4 md:grid-cols-2">
            <div>
              <h2 className={`${eyebrow} text-neutral-600`}>Model usage by day (Manila)</h2>
              {lastDays.length ? (
                <div className="overflow-x-auto"><table className="mt-2 w-full whitespace-nowrap text-sm"><tbody>{lastDays.map(([d, v]) => <tr key={d} className="border-b border-neutral-200"><td className="py-1 pr-2 tabular-nums">{d}</td><td className="py-1 px-2 text-right tabular-nums">{v.calls} calls</td><td className="py-1 px-2 text-right tabular-nums">{v.tokens.toLocaleString("en-PH")} tokens</td><td className="py-1 pl-2 text-right tabular-nums">≈ {usd(v.tokens)}</td></tr>)}</tbody></table></div>
              ) : <p className="mt-2 text-sm text-neutral-600">Nothing recorded yet. New runs, backfills, Filipino and Ask are counted from now on.</p>}
              {recorded.length > 0 && <p className="mt-2 text-[13px] text-neutral-600">Average recorded run: {Math.round(recorded.reduce((a, b) => a + b, 0) / recorded.length).toLocaleString("en-PH")} tokens (≈ {usd(recorded.reduce((a, b) => a + b, 0) / recorded.length)}) over {recorded.length} {recorded.length === 1 ? "site" : "sites"}. Estimates use USD_PER_MTOK when set.</p>}
            </div>
            <div>
              <h2 className={`${eyebrow} text-neutral-600`}>Sites that used the most</h2>
              {topSites.length ? <ol className="mt-2 text-sm">{topSites.map((s) => <li key={s.id} className="flex justify-between gap-3 border-b border-neutral-200 py-1"><Link href={`/report/${s.id}`} className="truncate hover:text-kapwa-brand-900">{s.name}</Link><span className="shrink-0 tabular-nums text-neutral-600">{s.tokens.toLocaleString("en-PH")} · ≈ {usd(s.tokens)}</span></li>)}</ol> : <p className="mt-2 text-sm text-neutral-600">–</p>}
            </div>
          </div>
          {rerun && <p className="mt-4 border-l-4 border-kapwa-brand-900 bg-kapwa-brand-50 px-5 py-3 text-sm">Queued {rerun} {rerun === "1" ? "rerun" : "reruns"}. They start as slots free up.</p>}
          {(assess || assessing.size > 0) && <p className="mt-4 border-l-4 border-kapwa-brand-900 bg-kapwa-brand-50 px-5 py-3 text-sm">Design check {assessing.size > 0 ? `running for ${assessing.size} ${assessing.size === 1 ? "site" : "sites"}, one at a time (about 10 seconds each). Reload to see results.` : "finished."}</p>}

          <nav className="mt-8 flex flex-wrap gap-6 border-b border-neutral-200 text-sm font-semibold">
            {tab("all", "All sites", all.length)}{tab("failed", "Failed", count("failed"))}{tab("unchecked", "Built before design check", unchecked)}{tab("done", "Done", count("done"))}{tab("running", "Running", count("running") + count("queued"))}
          </nav>

          <form method="post" action="/api/rerun" className="mt-6">
            <input type="hidden" name="token" value={token} />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-2xl text-sm text-neutral-600">{list.length} {list.length === 1 ? "site" : "sites"}. Failed sites are ticked. <strong>Apply design check</strong> runs only the new design step on a finished build (cents a site, no rebuild). <strong>Rerun</strong> rebuilds from scratch ({perRun}).</p>
              <div className="flex flex-wrap gap-3">
                <button type="submit" name="action" value="assess" className={btn.ghost}>Apply design check</button>
                <button type="submit" name="action" value="rerun" className={btn.primary}>Rerun ticked sites →</button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-sm">
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
            </table></div>
          </form>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
