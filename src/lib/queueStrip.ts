import { listJobs } from "@/lib/jobs";
import { progressOf } from "@/lib/progress";

export type QueueStripData = { running: { id: string; host: string; label: string; pct: number }[]; waiting: number; failed: { id: string; host: string }[] };

/** What the home page's queue strip shows: runs from the last hour that are in progress, queued, or stopped part-way. */
export async function queueStrip(jobs?: Awaited<ReturnType<typeof listJobs>>): Promise<QueueStripData> {
  const all = jobs ?? (await listJobs());
  const now = Date.now();
  const recent = (j: (typeof all)[number]) => j.status && now - new Date(j.status.startedAt).getTime() < 60 * 60 * 1000;
  const active = all.filter((j) => !j.site && j.status && !j.status.error && recent(j));
  const running = active.filter((j) => j.status!.phase !== "queued");
  const failed = all.filter((j) => !j.site && j.status?.error && (j.crawl?.pages.length ?? 0) > 0 && recent(j));
  return {
    running: running.map((j) => { const p = progressOf(j.status!); return { id: j.id, host: new URL(j.status!.url).host, label: p.label.toLowerCase(), pct: p.pct }; }),
    waiting: active.length - running.length,
    failed: failed.slice(0, 3).map((j) => ({ id: j.id, host: new URL(j.status!.url).host })),
  };
}
