import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite } from "@/lib/jobs";

export const dynamic = "force-dynamic";
type Ev = { t: number; type: string; [k: string]: unknown };
type Status = { url: string; phase: string; events: Ev[]; done: boolean; error: string; startedAt: string };

const STEPS: { key: string; label: string; tool: string }[] = [
  { key: "crawl", label: "Crawl", tool: "Playwright" },
  { key: "archive", label: "Archive", tool: "Wayback Machine" },
  { key: "understand", label: "Understand", tool: "Muse Spark" },
  { key: "plan", label: "Plan", tool: "Muse Spark" },
  { key: "segment", label: "Segment", tool: "SAM 3.1" },
  { key: "band", label: "Illustrate", tool: "Muse Image" },
  { key: "write", label: "Assemble", tool: "RE:GOV" },
];

function describe(e: Ev): { text: string; tag?: string } {
  switch (e.type) {
    case "start": return { text: e.archive ? `Crawling the Wayback Machine copy of ${e.origin}` : `Crawling ${e.origin}`, tag: "crawl" };
    case "page": return e.url ? { text: `Fetched ${String(e.url).replace(/^https?:\/\//, "")}`, tag: "crawl" } : { text: `Understood “${e.title}” · ${e.page_type} · ${e.blocks} blocks`, tag: "spark" };
    case "skip": return { text: `Skipped ${e.url} (${e.reason})`, tag: "crawl" };
    case "wp-rest": return { text: `WordPress REST API found: ${e.pages} pages, ${e.posts} posts`, tag: "crawl" };
    case "done": return { text: `Crawl finished with ${e.count} pages`, tag: "crawl" };
    case "blocked": return { text: `Blocked by bot protection (${e.reason}). Looking for an archived copy…`, tag: "warn" };
    case "archive": return { text: `Using the Wayback Machine snapshot of ${String(e.timestamp).slice(0, 4)}-${String(e.timestamp).slice(4, 6)}-${String(e.timestamp).slice(6, 8)} · ${e.captures} archived pages`, tag: "archive" };
    case "phase": return { text: `${STEPS.find((s) => s.key === e.phase)?.label ?? e.phase}${e.detail ? ` · ${e.detail}` : ""}`, tag: "phase" };
    case "plan": return { text: `Site plan for ${e.agency}: ${(e.nav as string[]).join(" · ")}`, tag: "spark" };
    case "segment": return { text: `SAM 3.1 found ${e.regions} regions${e.logo ? " and cut out the seal" : ""}`, tag: "sam" };
    case "band": return { text: `Muse Image brief: ${String(e.brief).slice(0, 160)}…`, tag: "image" };
    case "built": return { text: `Assembled ${e.pages} pages in ${((e.ms as number) / 1000).toFixed(0)}s · ${e.tokens} tokens`, tag: "phase" };
    default: return { text: e.type };
  }
}
const TAG: Record<string, string> = { crawl: "bg-neutral-100 text-neutral-600", spark: "bg-kapwa-brand-50 text-kapwa-brand-800", sam: "bg-kapwa-yellow-50 text-kapwa-orange-700", image: "bg-kapwa-green-50 text-kapwa-green-800", archive: "bg-kapwa-orange-50 text-kapwa-orange-800", warn: "bg-kapwa-red-50 text-kapwa-red-700", phase: "bg-neutral-900 text-white" };
const CARD = "rounded-3xl bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_32px_-16px_rgba(0,56,168,0.25)] ring-1 ring-neutral-200/80";

export default async function JobStatus({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  let status: Status | null = null;
  try { status = JSON.parse(await readFile(join(JOBS_ROOT, jobId, "status.json"), "utf8")); } catch { /* not yet */ }
  const site = status?.done ? await loadSite(jobId) : null;
  const archived = status?.events.some((e) => e.type === "archive");
  const steps = STEPS.filter((s) => s.key !== "archive" || archived || status?.phase === "archive");
  const idx = Math.max(0, steps.findIndex((s) => s.key === (status?.done ? "write" : status?.phase ?? "crawl")));
  const host = status?.url ? new URL(status.url).host : jobId;
  const v = site ? encodeURIComponent(site.generated_at) : "";
  const live = !status?.done && !status?.error;
  const elapsed = status ? Math.round((Date.now() - new Date(status.startedAt).getTime()) / 1000) : 0;

  return (
    <main className="container-gov pb-16 flex-1">
      {live && <meta httpEquiv="refresh" content="2" />}
      <header className="flex items-center justify-between pt-6 pb-10">
        <Link href="/" className="text-2xl font-black tracking-tight leading-none"><span className="text-kapwa-brand-900">RE</span><span className="text-kapwa-red-600">:</span>GOV</Link>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">← Back to home</Link>
      </header>

      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-kapwa-brand-700">{live ? "Reimagining" : status?.error ? "Stopped" : "Reimagined"}</p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-tight text-neutral-900">{site?.agency.name ?? host}</h1>
        <p className="mt-2 text-neutral-500">{status?.url}{live && ` · ${elapsed}s`}</p>

        {/* Stepper */}
        <ol className={`mt-8 ${CARD} p-5 grid gap-3`} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
          {steps.map((s, i) => {
            const state = status?.error && i === idx ? "error" : i < idx || status?.done ? "done" : i === idx ? "active" : "todo";
            return (
              <li key={s.key} className="flex flex-col items-center text-center gap-2">
                <span className={`grid size-9 place-items-center rounded-full text-sm font-bold ${state === "done" ? "bg-kapwa-green-600 text-white" : state === "active" ? "bg-kapwa-brand-800 text-white ring-4 ring-kapwa-brand-100 animate-pulse" : state === "error" ? "bg-kapwa-red-600 text-white" : "bg-neutral-100 text-neutral-400"}`}>{state === "done" ? "✓" : i + 1}</span>
                <span className={`text-sm font-semibold ${state === "todo" ? "text-neutral-400" : "text-neutral-900"}`}>{s.label}</span>
                <span className="text-[11px] text-neutral-400">{s.tool}</span>
              </li>
            );
          })}
        </ol>

        {site && (
          <div className={`relative mt-8 overflow-hidden ${CARD} text-white`}>
            {site.assets.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/jobs/${jobId}/${site.assets.cover}?v=${v}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,35,101,0.96)_0%,rgba(6,35,101,0.85)_45%,rgba(6,35,101,0.25)_100%)]" aria-hidden />
            <div className="relative p-8 sm:p-10 max-w-xl">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider">{(site.site_kind ?? "").replace(/_/g, " ")}</span>
              <h2 className="mt-4 text-3xl font-black tracking-tight">{site.agency.name}</h2>
              <p className="mt-2 text-white/80">{site.agency.tagline}</p>
              <p className="mt-4 text-sm text-white/70">{site.pages.length} pages · {site.entities?.length ?? 0} people, offices and services identified · {((site.tokens ?? 0) / 1000).toFixed(0)}k tokens</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href={`/preview/${jobId}`} className="rounded-full bg-kapwa-yellow-400 px-5 py-2.5 font-bold text-kapwa-brand-950 hover:bg-kapwa-yellow-300">View site →</Link>
                <Link href={`/report/${jobId}`} className="rounded-full bg-white/15 px-5 py-2.5 font-semibold text-white ring-1 ring-white/30 hover:bg-white/25">Migration report</Link>
              </div>
            </div>
          </div>
        )}

        {status?.error && (
          <div className={`mt-8 ${CARD} p-6 border-l-0`}>
            <div className="flex items-start gap-3"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-kapwa-red-50 text-kapwa-red-700 font-bold">!</span><div><h2 className="font-bold text-neutral-900">RE:GOV could not finish this site</h2><p className="mt-1 text-neutral-700">{status.error}</p><p className="mt-2 text-sm text-neutral-500">If the site is behind bot protection and has no archived copy, there is nothing public to rebuild from. Try another address.</p></div></div>
          </div>
        )}

        <section className="mt-8">
          <div className="flex items-center justify-between"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Agent log</h2>{live && <span className="flex items-center gap-2 text-xs text-neutral-500"><span className="size-2 rounded-full bg-kapwa-green-500 animate-pulse" /> live</span>}</div>
          <ol className={`mt-3 ${CARD} divide-y divide-neutral-100 max-h-[32rem] overflow-y-auto`}>
            {(status?.events ?? []).slice().reverse().map((e, i) => {
              const d = describe(e);
              return (
                <li key={i} className="flex items-start gap-3 px-5 py-2.5 text-[14px]">
                  <time className="w-16 shrink-0 pt-0.5 font-mono text-xs text-neutral-400">{new Date(e.t).toLocaleTimeString("en-PH", { hour12: false })}</time>
                  {d.tag && <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TAG[d.tag]}`}>{d.tag}</span>}
                  <span className="text-neutral-800">{d.text}</span>
                </li>
              );
            })}
            {!status && <li className="px-5 py-6 text-sm text-neutral-400">Starting…</li>}
          </ol>
        </section>
      </div>
    </main>
  );
}
