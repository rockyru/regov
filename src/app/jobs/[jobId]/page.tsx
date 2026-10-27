import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite, settle } from "@/lib/jobs";
import { runQueue, type QueueInfo } from "@/lib/runQueue";
import { AppHeader, AppFooter, SectionHead, eyebrow, btn, nn } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";

export const dynamic = "force-dynamic";
type Ev = { t: number; type: string; [k: string]: unknown };
type Status = { url: string; phase: string; events: Ev[]; done: boolean; error: string; startedAt: string; queue?: QueueInfo };

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
    case "unreachable": return { text: `The site did not answer (${String(e.reason).replace(/^page\.goto: /, "")}). Looking for an archived copy…`, tag: "warn" };
    case "redirect": return { text: String(e.note ?? `Using ${e.to}`), tag: "crawl" };
    case "archive": return { text: `Using the Wayback Machine snapshot of ${String(e.timestamp).slice(0, 4)}-${String(e.timestamp).slice(4, 6)}-${String(e.timestamp).slice(6, 8)} · ${e.captures} archived pages`, tag: "archive" };
    case "phase": return { text: `${STEPS.find((s) => s.key === e.phase)?.label ?? e.phase}${e.detail ? ` · ${e.detail}` : ""}`, tag: "phase" };
    case "plan": return { text: `Site plan for ${e.agency}: ${(e.nav as string[]).join(" · ")}`, tag: "spark" };
    case "segment": return { text: `SAM 3.1 found ${e.regions} regions${e.logo ? " and cut out the seal" : ""}`, tag: "sam" };
    case "band": return { text: `Muse Image brief: ${String(e.brief).slice(0, 160)}…`, tag: "image" };
    case "built": return { text: `Assembled ${e.pages} pages in ${((e.ms as number) / 1000).toFixed(0)}s · ${e.tokens} tokens`, tag: "phase" };
    default: return { text: e.type };
  }
}
const TAG: Record<string, string> = { crawl: "text-neutral-500", spark: "text-kapwa-brand-800", sam: "text-kapwa-orange-700", image: "text-kapwa-green-800", archive: "text-kapwa-orange-800", warn: "text-kapwa-red-700", phase: "text-neutral-900" };

export default async function JobStatus({ params, searchParams }: { params: Promise<{ jobId: string }>; searchParams: Promise<{ existing?: string }> }) {
  const { jobId } = await params;
  const { existing = "" } = await searchParams;
  let status: Status | null = null;
  let fromMirror = false;
  try { status = JSON.parse(await readFile(join(JOBS_ROOT, jobId, "status.json"), "utf8")); } catch { /* not local */ }
  if (!status && /^[\w.-]+$/.test(jobId)) {
    try {
      const { getFile } = await import("../../../../scripts/sync-jobs");
      const mirrored = await getFile(`${jobId}/status.json`);
      if (mirrored) { status = JSON.parse(mirrored); fromMirror = true; }
    } catch { /* no mirror */ }
    if (status && fromMirror && !status.done && !status.error) {
      status.error = "The agent's container restarted while this run was in progress, so the run was lost. Please start it again.";
      status.phase = "error";
    }
  }
  // Queued on disk but unknown to the live queue: the process that owned it is gone.
  if (status && status.phase === "queued" && !status.done && !status.error && !runQueue.isTracked(jobId)) {
    status.error = "The agent restarted before this run started. Please start it again.";
    status.phase = "error";
  }
  if (status) status = settle(status);
  // No record anywhere: a mistyped reference, or a queued run that never got far enough to be saved.
  if (!status) status = { url: "", phase: "error", events: [], done: false, error: "There is no run with this reference. If you just started it, the agent may have restarted before it began. Please start it again.", startedAt: new Date().toISOString() };
  const queued = status?.phase === "queued" && !status.error ? status.queue : undefined;
  const site = status?.done ? await loadSite(jobId) : null;
  let procLog = "";
  if (!status?.done && (status?.error || (status?.events.length ?? 0) === 0)) {
    try { procLog = (await readFile(join(JOBS_ROOT, jobId, "pipeline.log"), "utf8")).split("\n").filter(Boolean).slice(-15).join("\n"); } catch { /* none */ }
  }
  const archived = status?.events.some((e) => e.type === "archive");
  const steps = STEPS.filter((s) => s.key !== "archive" || archived || status?.phase === "archive");
  const idx = Math.max(0, steps.findIndex((s) => s.key === (status?.done ? "write" : status?.phase === "queued" ? "crawl" : status?.phase ?? "crawl")));
  const host = status?.url ? new URL(status.url).host : jobId;
  const v = site ? encodeURIComponent(site.generated_at) : "";
  const live = !status?.done && !status?.error;
  const elapsed = status ? Math.round((Date.now() - new Date(status.startedAt).getTime()) / 1000) : 0;
  const state = queued ? "Waiting in line" : live ? "Reimagining" : status?.error ? "Stopped" : "Reimagined";
  const existingNote = existing === "done" ? "This site was reimagined recently, so the agent is showing that run instead of starting another."
    : existing === "running" ? "The agent is already working on this site. You are watching that run."
    : existing === "queued" ? "This site is already in the queue. You are watching that run." : "";
  let n = 1;

  return (
    <>
      {live && <LiveRefresh ms={queued ? 4000 : 2000} />}
      <AppHeader crumb={host} />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-16">
          {/* Title block */}
          <p className={`${eyebrow} flex items-center gap-3 ${status?.error ? "text-kapwa-red-700" : "text-kapwa-brand-900"}`}>
            {live && <span className="size-2 bg-kapwa-brand-600 animate-pulse" />}{state}{live && <span className="font-medium normal-case tracking-normal text-neutral-500 tabular-nums">· {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}{!queued && " · usually 4 to 8 minutes"}</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-2">
            <div className="min-w-0">
              <h1 className="text-4xl sm:text-5xl font-display font-medium tracking-tight text-neutral-900 break-words">{site?.agency.name ?? host}</h1>
              <p className="mt-2 text-neutral-500 break-all">{status?.url}</p>
            </div>
            {site && <div className="flex flex-wrap gap-3"><Link href={`/preview/${jobId}`} className={btn.yellow}>View site →</Link><Link href={`/report/${jobId}`} className={btn.ghost}>Migration report</Link></div>}
          </div>

          {existingNote && (
            <p className="mt-6 border-l-4 border-kapwa-brand-900 bg-kapwa-brand-50 px-5 py-3 text-sm text-neutral-800">{existingNote} <Link href="/#reimagine" className="font-semibold text-kapwa-brand-900 hover:underline">Try another address →</Link></p>
          )}

          {queued && (
            <section className="mt-10 border-t-2 border-kapwa-brand-900 bg-kapwa-yellow-50 p-6 sm:p-8">
              <div className="flex flex-wrap items-end justify-between gap-6">
                <div>
                  <p className={`${eyebrow} text-neutral-500`}>Queue</p>
                  <p className="mt-2 text-3xl sm:text-4xl font-display font-medium tracking-tight text-neutral-900">{queued.position === 1 ? "Next up" : `${queued.position - 1} ahead of you`}</p>
                  <p className="mt-2 max-w-xl text-neutral-700">The agent rebuilds a few sites at a time so each run gets the whole machine. You can leave and come back: it starts on its own, this page keeps refreshing, and the home page lists it until it is done. A run usually takes four to eight minutes once it begins.</p>
                </div>
                <dl className="grid grid-cols-3 gap-6">
                  {[[queued.position, "your place"], [queued.of, "in line"], [queued.running, "running now"]].map(([v, l]) => <div key={String(l)}><dd className="text-2xl font-bold tabular-nums">{v}</dd><dt className="text-[12px] text-neutral-500">{l}</dt></div>)}
                </dl>
              </div>
            </section>
          )}

          {/* Pipeline */}
          <section className="mt-10">
            <SectionHead n={n++} title="Pipeline" aside={<span className="tabular-nums">{steps.length} steps</span>} />
            <ol className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 border-l border-neutral-200">
              {steps.map((s, i) => {
                const st = status?.error && i === idx ? "error" : i < idx || status?.done ? "done" : i === idx && !queued ? "active" : "todo";
                const top = st === "done" ? "border-t-kapwa-brand-900" : st === "active" ? "border-t-kapwa-yellow-400" : st === "error" ? "border-t-kapwa-red-600" : "border-t-neutral-200";
                return (
                  <li key={s.key} className={`border-t-4 border-r border-b border-neutral-200 p-4 ${top} ${st === "todo" ? "text-neutral-400" : "text-neutral-900"} ${st === "active" ? "bg-kapwa-yellow-50" : ""}`}>
                    <div className="flex items-center justify-between text-sm font-semibold tabular-nums"><span>{nn(i)}</span><span className={st === "done" ? "text-kapwa-brand-900" : st === "error" ? "text-kapwa-red-700" : ""}>{st === "done" ? "✓" : st === "active" ? "…" : st === "error" ? "!" : ""}</span></div>
                    <div className="mt-3 font-bold">{s.label}</div>
                    <div className="text-[12px] text-neutral-500">{s.tool}</div>
                  </li>
                );
              })}
            </ol>
            {live && !queued && (
              <div className="relative h-1 overflow-hidden bg-neutral-200" role="progressbar" aria-label="Agent working" aria-valuetext={`${STEPS.find((s) => s.key === status?.phase)?.label ?? "Working"}`}>
                <div className="absolute inset-y-0 left-0 w-2/5 bg-kapwa-brand-900 motion-safe:animate-sweep motion-reduce:w-full" />
              </div>
            )}
          </section>

          {site && (
            <section className="relative mt-10 overflow-hidden bg-kapwa-brand-950 text-white">
              {site.assets.cover && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/jobs/${jobId}/${site.assets.cover}?v=${v}`} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,35,101,0.97)_0%,rgba(6,35,101,0.9)_45%,rgba(6,35,101,0.3)_100%)]" aria-hidden />
              <div className="relative p-8 sm:p-10 max-w-2xl">
                <p className={`${eyebrow} text-kapwa-yellow-400`}>{(site.site_kind ?? "").replace(/_/g, " ")} · Unofficial concept</p>
                <h2 className="mt-3 text-3xl sm:text-4xl font-display font-medium tracking-tight">{site.agency.name}</h2>
                <p className="mt-2 text-white/80 text-lg">{site.agency.tagline}</p>
                <dl className="mt-6 grid grid-cols-3 gap-4 border-t border-white/20 pt-4 max-w-md">
                  {[[site.pages.length, "pages"], [site.entities?.length ?? 0, "entities"], [((site.tokens ?? 0) / 1000).toFixed(0) + "k", "tokens"]].map(([v, l]) => <div key={String(l)}><dt className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/60">{l}</dt><dd className="text-2xl font-bold tabular-nums">{v}</dd></div>)}
                </dl>
              </div>
            </section>
          )}

          {status?.error && (
            <section className="mt-10 border-l-4 border-kapwa-red-600 bg-kapwa-red-50 p-6">
              <h2 className="font-bold text-neutral-900">RE:GOV could not finish this site</h2>
              <p className="mt-1 text-neutral-800">{status.error}</p>
              <p className="mt-2 text-sm text-neutral-600">If the site is behind bot protection and has no archived copy, there is nothing public to rebuild from. Try another address.</p>
            </section>
          )}

          <section className="mt-10">
            <SectionHead n={n++} title="Agent log" aside={live ? <span className="flex items-center gap-2"><span className="size-2 bg-kapwa-green-500 animate-pulse" /> live</span> : <span className="tabular-nums">{status?.events.length ?? 0} events</span>} />
            <ol className="mt-6 border-t border-kapwa-brand-900 max-h-[32rem] overflow-y-auto">
              {(status?.events ?? []).slice().reverse().map((e, i) => {
                const d = describe(e);
                return (
                  <li key={i} className="grid grid-cols-[auto_1fr] sm:grid-cols-[4.5rem_4.5rem_1fr] items-baseline gap-x-3 border-b border-neutral-200 px-1 py-2 text-[14px]">
                    <time className="hidden sm:block text-xs text-neutral-400 tabular-nums">{new Date(e.t).toLocaleTimeString("en-PH", { hour12: false, timeZone: "Asia/Manila" })}</time>
                    <span className={`${eyebrow} ${TAG[d.tag ?? ""] ?? "text-neutral-500"}`}>{d.tag ?? ""}</span>
                    <span className="text-neutral-800 break-words min-w-0">{d.text}</span>
                  </li>
                );
              })}
              {(!status || status.events.length === 0) && !procLog && <li className="px-1 py-6 text-sm text-neutral-400">{queued ? `Waiting for a free slot… (${elapsed}s)` : "Starting the agent…"}</li>}
              {procLog && <li className="px-1 py-4"><div className={`${eyebrow} text-neutral-400 mb-2`}>Process output</div><pre className="whitespace-pre-wrap break-words text-xs text-neutral-600">{procLog}</pre></li>}
            </ol>
          </section>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
