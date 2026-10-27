// End-to-end: crawl + build, writing jobs/<id>/status.json for the UI to poll.
// npx tsx --env-file=.env scripts/pipeline.ts <url> <jobId> [maxPages]
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { crawl, BlockedError } from "../src/pipeline/crawl";
import { pickReachable } from "../src/pipeline/reach";
import { findSnapshot } from "../src/pipeline/archive";
import { pushJob, pushFile } from "./sync-jobs";
import { buildSite } from "../src/pipeline/build";
import { auditRebuilt } from "../src/pipeline/audit";
import { scoreSite } from "../src/pipeline/scores";

const [inputUrl, jobId, max = "20"] = process.argv.slice(2);
let url = inputUrl;
if (!url || !jobId) { console.error("usage: pipeline.ts <url> <jobId> [maxPages]"); process.exit(1); }
const dir = join("jobs", jobId);
const status = { url, jobId, startedAt: new Date().toISOString(), phase: "crawl", events: [] as unknown[], done: false, error: "" };
let flushing: Promise<void> = Promise.resolve();
let lastMirror = 0;
const flush = () => (flushing = flushing.then(async () => {
  const body = JSON.stringify(status);
  await writeFile(join(dir, "status.json"), body);
  if (Date.now() - lastMirror > 5000 || status.done || status.error) {
    lastMirror = Date.now();
    await pushFile(`${jobId}/status.json`, body).catch(() => {});
  }
}));
const log = (e: unknown) => { status.events.push({ t: Date.now(), ...(e as object) }); console.log(JSON.stringify(e)); flush(); };

(async () => {
  await mkdir(dir, { recursive: true });
  await flush();
  try {
    // Bare domain vs www., transient DNS misses: start from the variant that answers.
    const reach = await pickReachable(url);
    if (new URL(reach.url).hostname !== new URL(url).hostname) { log({ type: "redirect", from: url, to: reach.url, note: reach.note }); url = reach.url; status.url = url; }
    const runCrawl = (archiveTimestamp?: string) => crawl(url, { jobId, maxPages: Number(max), onEvent: log, archiveTimestamp });
    let why = "";
    try {
      const r = await runCrawl();
      if (r.pages.length === 0) {
        why = `The site could not be fetched (${r.skipped[0]?.reason ?? "no pages"})`;
        log({ type: "unreachable", reason: r.skipped[0]?.reason ?? "no pages" });
      }
    } catch (e) {
      if (!(e instanceof BlockedError)) throw e;
      log({ type: "blocked", url: e.url, reason: e.reason });
      why = e.message;
    }
    if (why) {
      // Dead, firewalled or bot-protected: rebuild from the Wayback Machine instead.
      status.phase = "archive";
      const snap = await findSnapshot(url);
      if (!snap) throw new Error(`${why}. No Wayback Machine copy found either.`);
      log({ type: "archive", timestamp: snap.timestamp, captures: snap.captures });
      await runCrawl(snap.timestamp);
    }
    status.phase = "build";
    await buildSite(jobId, (e) => { if (e.type === "phase") status.phase = e.phase; log(e); });
    // WCAG 2.2 check of the rebuilt pages through the running app (free; never fails the run).
    status.phase = "audit"; await flush();
    try {
      const a = await auditRebuilt(dir, jobId);
      log({ type: "wcag", pages: a.pages.length, violations: a.pages.reduce((t, p) => t + p.violations.length, 0) });
    } catch (e) {
      console.warn("[audit] skipped:", (e as Error).message);
    }
    // Before/after homepage speed, weight and axe errors (free; never fails the run).
    try {
      const s = await scoreSite(dir, jobId);
      log({ type: "scores", before: s.original && { load_ms: s.original.load_ms, bytes: s.original.bytes }, after: s.rebuilt && { load_ms: s.rebuilt.load_ms, bytes: s.rebuilt.bytes } });
    } catch (e) {
      console.warn("[scores] skipped:", (e as Error).message);
    }
    status.phase = "done"; status.done = true;
    await flush();
    await pushJob(jobId).catch((e) => console.warn("[sync]", (e as Error).message));
  } catch (e) {
    status.error = (e as Error).message; status.phase = "error";
    console.error(e);
  }
  await flush(); await flushing;
})();
