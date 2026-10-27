import Link from "next/link";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite, settle, typicalRunMs } from "@/lib/jobs";
import { runQueue, LIMITS, type QueueInfo } from "@/lib/runQueue";
import { AppHeader, AppFooter, SectionHead, eyebrow, btn, nn } from "@/components/AppShell";
import { LiveRefresh } from "@/components/LiveRefresh";
import { STEPS, progressOf } from "@/lib/progress";
import { fmtMs, fmtBytes } from "@/lib/scores";

export const dynamic = "force-dynamic";
type Ev = { t: number; type: string; [k: string]: unknown };
type Status = { url: string; phase: string; events: Ev[]; done: boolean; error: string; startedAt: string; queue?: QueueInfo };


const mins = (ms: number) => Math.max(1, Math.round(ms / 60_000));

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
    case "wcag": return { text: Number(e.violations) === 0 ? `WCAG 2.2 AA check: no automated violations on ${e.pages} rebuilt pages` : `WCAG 2.2 AA check: ${e.violations} automated issues on ${e.pages} rebuilt pages`, tag: "phase" };
    case "scores": { const b = e.before as { load_ms: number; bytes: number } | null, a = e.after as { load_ms: number; bytes: number } | null; return { text: a ? `Homepage ${b ? `${fmtMs(b.load_ms)}, ${fmtBytes(b.bytes)} before → ` : ""}${fmtMs(a.load_ms)}, ${fmtBytes(a.bytes)} rebuilt` : "Speed check skipped", tag: "phase" }; }
    case "charter": return { text: Number(e.docs) ? `Muse Spark read ${e.docs} Citizen's Charter ${Number(e.docs) === 1 ? "PDF" : "PDFs"}: ${e.services} services with requirements, steps, fees and time` : "No Citizen's Charter PDF linked from the crawled pages", tag: "spark" };
    case "portraits": return { text: Number(e.found) ? `SAM 3.1 found ${e.found} portrait ${Number(e.found) === 1 ? "photo" : "photos"}; Muse Spark named ${e.named} from their captions and wrote alt text` : "No portrait photos found on the pages that list people", tag: "sam" };
    case "verify": return { text: `Self-check: ${e.faithful} of ${e.pages} pages faithful to the original, ${e.average}% of content kept on average${Number(e.unsupported) ? `, ${e.unsupported} statements flagged for a person to check` : ", nothing added"}`, tag: "spark" };
    case "design": return { text: e.mode === "refine" ? `Design check ${e.score}/10: already modern, keeping its look and upgrading it. ${e.reason}` : `Design check ${e.score}/10: rebuilding on the RE:GOV design. ${e.reason}`, tag: "spark" };
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
  const { steps, idx, detail, pct } = progressOf(status);
  const host = status?.url ? new URL(status.url).host : jobId;
  const v = site ? encodeURIComponent(site.generated_at) : "";
  const live = !status?.done && !status?.error;
  const elapsed = status ? Math.round((Date.now() - new Date(status.startedAt).getTime()) / 1000) : 0;
  const typical = live ? await typicalRunMs() : 0;
  const leftMs = Math.max(0, typical * (1 - pct / 100));
  // A job at place p starts when p slots have freed up; running jobs are assumed half done.
  const waitMs = queued ? (Math.ceil(queued.position / LIMITS.concurrency) - 0.5) * typical : 0;
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
            {live && <span className="size-2 bg-kapwa-brand-600 animate-pulse" />}{state}{live && <span className="font-medium normal-case tracking-normal text-neutral-500 tabular-nums">· {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}{!queued && ` · ${pct}% · ${leftMs < 60_000 ? "almost done" : `about ${mins(leftMs)} min left`}`}</span>}
          </p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 pb-2">
            <div className="min-w-0">
              <h1 className="text-4xl sm:text-5xl font-display font-normal tracking-tight text-neutral-900 break-words">{site?.agency.name ?? host}</h1>
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
                  <p className="mt-2 text-3xl sm:text-4xl font-display font-normal tracking-tight text-neutral-900">{queued.position === 1 ? "Next up" : `${queued.position - 1} ahead of you`}</p>
                  <p className="mt-1 text-lg text-kapwa-brand-900">Starts in about {mins(waitMs)} min · ready in about {mins(waitMs + typical)} min</p>
                  <p className="mt-2 max-w-xl text-neutral-700">The agent rebuilds a few sites at a time so each run gets the whole machine. You can leave and come back: it starts on its own, this page keeps refreshing, and the home page lists it until it is done. A run usually takes about {mins(typical)} minutes once it begins.</p>
                </div>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {[[queued.position, "your place"], [queued.of, "in line"], [queued.running, "running now"], [`~${mins(waitMs)}m`, "est. wait"]].map(([v, l]) => <div key={String(l)}><dd className="text-2xl font-bold tabular-nums">{v}</dd><dt className="text-[12px] text-neutral-500">{l}</dt></div>)}
                </dl>
              </div>
            </section>
          )}

          {/* Pipeline */}
          <section className="mt-10">
            <SectionHead n={n++} title="Pipeline" aside={<span className="tabular-nums">{steps.length} steps</span>} />
            <ol className={`mt-6 grid grid-cols-2 sm:grid-cols-3 ${steps.length === 8 ? "lg:grid-cols-8" : "lg:grid-cols-7"} border-l border-neutral-200`}>
              {steps.map((s, i) => {
                const st = status?.error && i === idx ? "error" : i < idx || status?.done ? "done" : i === idx && !queued ? "active" : "todo";
                const top = st === "done" ? "border-t-kapwa-brand-900" : st === "active" ? "border-t-kapwa-yellow-400" : st === "error" ? "border-t-kapwa-red-600" : "border-t-neutral-200";
                return (
                  <li key={s.key} className={`border-t-4 border-r border-b border-neutral-200 p-4 ${top} ${st === "todo" ? "text-neutral-400" : "text-neutral-900"} ${st === "active" ? "bg-kapwa-yellow-50" : ""}`}>
                    <div className="flex items-center justify-between text-sm font-semibold tabular-nums"><span>{nn(i)}</span><span className={st === "done" ? "text-kapwa-brand-900" : st === "error" ? "text-kapwa-red-700" : ""}>{st === "done" ? "✓" : st === "active" ? "…" : st === "error" ? "!" : ""}</span></div>
                    <div className="mt-3 font-bold">{s.label}</div>
                    <div className="text-[12px] text-neutral-500">{s.tool}</div>
                    {st === "active" && <div className="mt-2 text-[12px] font-semibold text-kapwa-brand-900 tabular-nums">{detail}</div>}
                  </li>
                );
              })}
            </ol>
            {live && !queued && (
              <div className="mt-4">
                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 text-sm">
                  <span className="font-semibold text-neutral-900">Step {idx + 1} of {steps.length} · {steps[idx]?.label} <span className="font-normal text-neutral-500">· {detail}</span></span>
                  <span className="tabular-nums text-neutral-500">{pct}% · {leftMs < 60_000 ? "almost done" : `about ${mins(leftMs)} min left`}</span>
                </div>
                <div className="relative mt-2 h-2 overflow-hidden bg-neutral-200" role="progressbar" aria-label="Agent progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-valuetext={`${steps[idx]?.label}, ${detail}`}>
                  <div className="absolute inset-y-0 left-0 overflow-hidden bg-kapwa-brand-900 transition-[width] duration-700" style={{ width: `${Math.max(3, pct)}%` }}>
                    <div className="absolute inset-y-0 left-0 w-2/5 bg-white/25 motion-safe:animate-sweep motion-reduce:hidden" />
                  </div>
                </div>
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
                <h2 className="mt-3 text-3xl sm:text-4xl font-display font-normal tracking-tight">{site.agency.name}</h2>
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
              {status.url && (
                <form method="post" action="/api/run" className="mt-4 flex flex-wrap items-center gap-3">
                  <input type="hidden" name="url" value={status.url} />
                  <button type="submit" className={btn.primary}>Try again →</button>
                  <Link href="/#reimagine" className="text-sm font-semibold text-kapwa-brand-900 hover:underline">Try another address</Link>
                </form>
              )}
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
