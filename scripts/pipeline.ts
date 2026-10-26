// End-to-end: crawl + build, writing jobs/<id>/status.json for the UI to poll.
// npx tsx --env-file=.env scripts/pipeline.ts <url> <jobId> [maxPages]
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { crawl } from "../src/pipeline/crawl";
import { buildSite } from "../src/pipeline/build";

const [url, jobId, max = "20"] = process.argv.slice(2);
if (!url || !jobId) { console.error("usage: pipeline.ts <url> <jobId> [maxPages]"); process.exit(1); }
const dir = join("jobs", jobId);
const status = { url, jobId, startedAt: new Date().toISOString(), phase: "crawl", events: [] as unknown[], done: false, error: "" };
let flushing: Promise<void> = Promise.resolve();
const flush = () => (flushing = flushing.then(() => writeFile(join(dir, "status.json"), JSON.stringify(status))));
const log = (e: unknown) => { status.events.push({ t: Date.now(), ...(e as object) }); console.log(JSON.stringify(e)); flush(); };

(async () => {
  await mkdir(dir, { recursive: true });
  await flush();
  try {
    await crawl(url, { jobId, maxPages: Number(max), onEvent: log });
    status.phase = "build";
    await buildSite(jobId, (e) => { if (e.type === "phase") status.phase = e.phase; log(e); });
    status.phase = "done"; status.done = true;
  } catch (e) {
    status.error = (e as Error).message; status.phase = "error";
    console.error(e);
  }
  await flush(); await flushing;
})();
