// Admission control for pipeline runs. One Node process serves the app inside the single
// container, so an in-memory queue is authoritative: at most RUN_CONCURRENCY pipelines run at
// once, the rest wait in order, and the queue refuses new work past RUN_QUEUE_MAX. Each visitor
// (by IP) gets RUN_RATE_LIMIT submissions per RUN_RATE_WINDOW_MIN minutes. A host that is running,
// queued, or finished within RUN_DEDUPE_HOURS is not rebuilt again; callers redirect to that job.
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export interface QueueInfo { position: number; of: number; running: number }
export interface RunStatusFile { url: string; jobId: string; startedAt: string; phase: string; events: unknown[]; done: boolean; error: string; queue?: QueueInfo }
interface Job { jobId: string; url: string; host: string; max: string; enqueuedAt: number; ip: string }

const num = (k: string, d: number) => { const v = Number(process.env[k]); return Number.isFinite(v) && v > 0 ? v : d; };
export const LIMITS = {
  concurrency: num("RUN_CONCURRENCY", 2),
  queueMax: num("RUN_QUEUE_MAX", 8),
  perIp: num("RUN_RATE_LIMIT", 3),
  windowMs: num("RUN_RATE_WINDOW_MIN", 10) * 60_000,
  dedupeMs: num("RUN_DEDUPE_HOURS", 24) * 3_600_000,
  stallMs: num("RUN_STALL_MIN", 20) * 60_000,
  dailyMax: num("RUN_DAILY_MAX", 15),
};

const ROOT = process.cwd();
export const IS_PROD = process.env.NODE_ENV === "production";
const JOBS = resolve(ROOT, "jobs");
const hostKey = (h: string) => h.toLowerCase().replace(/^www\./, "");
/** Epoch ms of the most recent midnight in Asia/Manila (UTC+8, no DST). */
export function manilaMidnight(now = Date.now()): number {
  const DAY = 86_400_000, OFFSET = 8 * 3_600_000;
  return Math.floor((now + OFFSET) / DAY) * DAY - OFFSET;
}
export const LOST = "The agent restarted while this run was in progress, so the run was lost. Please start it again.";

class RunQueue {
  waiting: Job[] = [];
  running = new Map<string, { job: Job; child: ChildProcess }>();
  hits = new Map<string, number[]>();
  stalled = new Set<string>();

  constructor() {
    // Watchdog: a child that has not touched its status file for stallMs is killed so it
    // cannot hold a slot forever (hung browser, stuck network call). The exit handler reports it.
    const tick = Math.max(1000, Math.min(60_000, LIMITS.stallMs / 2));
    setInterval(() => {
      const now = Date.now();
      for (const [jobId, { child }] of this.running) {
        let last = 0;
        try { last = statSync(resolve(JOBS, jobId, "status.json")).mtimeMs; } catch { continue; }
        if (now - last > LIMITS.stallMs && !this.stalled.has(jobId)) { this.stalled.add(jobId); child.kill("SIGKILL"); }
      }
    }, tick).unref();
    // A "queued" status on disk that this process does not know about belonged to a previous
    // process (restart mid-queue). Close it out so the job page does not wait forever.
    // Production only: `next dev` renders in recycled worker processes, so there the queue
    // owner and the renderer are often different processes and this check would misfire.
    if (!IS_PROD) return;
    try {
      for (const id of readdirSync(JOBS)) {
        const f = resolve(JOBS, id, "status.json");
        if (!existsSync(f)) continue;
        try {
          const s = JSON.parse(readFileSync(f, "utf8")) as RunStatusFile;
          if (s.done || s.error) continue;
          // Nothing can be running in a process that has just started, so every live-looking status is a lost run.
          const error = s.phase === "queued" ? "The agent restarted before this run started. Please start it again." : LOST;
          writeFileSync(f, JSON.stringify({ ...s, phase: "error", error }));
        } catch { /* mid-write or foreign file */ }
      }
    } catch { /* no jobs dir yet */ }
  }

  /** Sliding-window per-IP limit. Returns seconds until the next allowed submission, or 0. */
  rateLimit(ip: string): number {
    const now = Date.now();
    const recent = (this.hits.get(ip) ?? []).filter((t) => now - t < LIMITS.windowMs);
    if (recent.length >= LIMITS.perIp) return Math.ceil((recent[0] + LIMITS.windowMs - now) / 1000);
    recent.push(now);
    this.hits.set(ip, recent);
    if (this.hits.size > 5000) for (const [k, v] of this.hits) if (!v.some((t) => now - t < LIMITS.windowMs)) this.hits.delete(k);
    return 0;
  }

  /** Job id of a run for this host that is in flight, waiting, or finished recently. */
  existing(host: string): { jobId: string; state: "running" | "queued" | "done" } | null {
    const key = hostKey(host);
    for (const { job } of this.running.values()) if (hostKey(job.host) === key) return { jobId: job.jobId, state: "running" };
    for (const job of this.waiting) if (hostKey(job.host) === key) return { jobId: job.jobId, state: "queued" };
    const since = Date.now() - LIMITS.dedupeMs;
    let best: { jobId: string; t: number } | null = null;
    try {
      for (const id of readdirSync(JOBS)) {
        const dir = resolve(JOBS, id);
        if (!existsSync(resolve(dir, "site.json"))) continue;
        try {
          const s = JSON.parse(readFileSync(resolve(dir, "status.json"), "utf8")) as RunStatusFile;
          const t = new Date(s.startedAt).getTime();
          if (s.done && hostKey(new URL(s.url).hostname) === key && t > since && (!best || t > best.t)) best = { jobId: id, t };
        } catch { /* hand-made job dirs have no status.json */ }
      }
    } catch { /* no jobs dir */ }
    return best ? { jobId: best.jobId, state: "done" } : null;
  }

  /** Runs started since midnight Manila time, counted from status files (survives restarts). */
  usedToday(): number {
    const start = manilaMidnight();
    let n = 0;
    try {
      for (const id of readdirSync(JOBS)) {
        try {
          const s = JSON.parse(readFileSync(resolve(JOBS, id, "status.json"), "utf8")) as RunStatusFile;
          if (new Date(s.startedAt).getTime() >= start) n++;
        } catch { /* not a job */ }
      }
    } catch { /* no jobs dir */ }
    return n;
  }
  get quotaLeft() { return Math.max(0, LIMITS.dailyMax - this.usedToday()); }
  get full() { return this.waiting.length >= LIMITS.queueMax; }
  /** False only when this process is sure the job is not queued or running. Always true in dev (see constructor). */
  isTracked(jobId: string) { return !IS_PROD || this.running.has(jobId) || this.waiting.some((j) => j.jobId === jobId); }
  snapshot() { return { running: this.running.size, waiting: this.waiting.length, today: { used: this.usedToday(), max: LIMITS.dailyMax }, ...LIMITS }; }

  enqueue(input: Omit<Job, "enqueuedAt">): QueueInfo {
    const job: Job = { ...input, enqueuedAt: Date.now() };
    mkdirSync(resolve(JOBS, job.jobId), { recursive: true });
    this.waiting.push(job);
    this.writeQueued(job);
    this.pump();
    return this.infoFor(job);
  }

  private infoFor(job: Job): QueueInfo {
    return { position: this.waiting.indexOf(job) + 1, of: this.waiting.length, running: this.running.size };
  }

  private writeQueued(job: Job) {
    const status: RunStatusFile = { url: job.url, jobId: job.jobId, startedAt: new Date(job.enqueuedAt).toISOString(), phase: "queued", events: [], done: false, error: "", queue: this.infoFor(job) };
    writeFileSync(resolve(JOBS, job.jobId, "status.json"), JSON.stringify(status));
  }

  private pump() {
    while (this.running.size < LIMITS.concurrency && this.waiting.length > 0) this.start(this.waiting.shift()!);
    for (const j of this.waiting) this.writeQueued(j); // positions moved
  }

  private start(job: Job) {
    const dir = resolve(JOBS, job.jobId);
    const fail = (msg: string) => writeFileSync(resolve(dir, "status.json"), JSON.stringify({ url: job.url, jobId: job.jobId, startedAt: new Date().toISOString(), phase: "error", events: [], done: false, error: msg }));
    const args = [resolve(ROOT, "node_modules/tsx/dist/cli.mjs"), "scripts/pipeline.ts", job.url, job.jobId, job.max];
    if (existsSync(resolve(ROOT, ".env"))) args.unshift("--env-file=.env");
    try {
      const log = openSync(resolve(dir, "pipeline.log"), "a");
      const child = spawn(process.execPath, args, { cwd: ROOT, stdio: ["ignore", log, log], env: { ...process.env } });
      this.running.set(job.jobId, { job, child });
      const release = () => { if (this.running.delete(job.jobId)) this.pump(); };
      child.on("error", (e) => { fail(`could not start the agent: ${e.message}`); release(); });
      child.on("exit", (code, signal) => {
        // A pipeline that dies (out of memory, killed) never writes a terminal status itself.
        try {
          const s = JSON.parse(readFileSync(resolve(dir, "status.json"), "utf8")) as RunStatusFile;
          const why = this.stalled.has(job.jobId) ? `The agent made no progress for ${Math.round(LIMITS.stallMs / 60_000)} minutes and was stopped.` : `The agent stopped unexpectedly (${signal ? `signal ${signal}` : `exit code ${code}`}).`;
          if (!s.done && !s.error) writeFileSync(resolve(dir, "status.json"), JSON.stringify({ ...s, phase: "error", error: `${why} Please start it again.` }));
        } catch { /* no status yet */ }
        this.stalled.delete(job.jobId);
        release();
      });
    } catch (e) {
      fail(`could not start the agent: ${(e as Error).message}`);
    }
  }
}

// One instance per process; survives dev-server module reloads.
const g = globalThis as unknown as { __regovRunQueue?: RunQueue };
export const runQueue = (g.__regovRunQueue ??= new RunQueue());
