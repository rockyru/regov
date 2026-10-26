// End-to-end: crawl + build, writing jobs/<id>/status.json for the UI to poll.
// npx tsx --env-file=.env scripts/pipeline.ts <url> <jobId> [maxPages]
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { crawl, BlockedError } from "../src/pipeline/crawl";
import { findSnapshot } from "../src/pipeline/archive";
import { pushJob, pushFile } from "./sync-jobs";
import { buildSite } from "../src/pipeline/build";

const [url, jobId, max = "20"] = process.argv.slice(2);
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
    try {
      await crawl(url, { jobId, maxPages: Number(max), onEvent: log });
    } catch (e) {
      if (!(e instanceof BlockedError)) throw e;
      log({ type: "blocked", url: e.url, reason: e.reason });
      status.phase = "archive";
      const snap = await findSnapshot(url);
      if (!snap) throw new Error(`${e.message}. No Wayback Machine copy found either.`);
      log({ type: "archive", timestamp: snap.timestamp, captures: snap.captures });
      await crawl(url, { jobId, maxPages: Number(max), onEvent: log, archiveTimestamp: snap.timestamp });
    }
    status.phase = "build";
    await buildSite(jobId, (e) => { if (e.type === "phase") status.phase = e.phase; log(e); });
    status.phase = "done"; status.done = true;
    await flush();
    await pushJob(jobId).catch((e) => console.warn("[sync]", (e as Error).message));
  } catch (e) {
    status.error = (e as Error).message; status.phase = "error";
    console.error(e);
  }
  await flush(); await flushing;
})();
