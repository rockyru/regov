// End-to-end: crawl + build, writing jobs/<id>/status.json for the UI to poll.
// npx tsx --env-file=.env scripts/pipeline.ts <url> <jobId> [maxPages]
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { crawl, BlockedError } from "../src/pipeline/crawl";
import { loadRobots, type Robots } from "../src/pipeline/robots";
import { checkTerms, TermsError } from "../src/pipeline/terms";
import { optedOut } from "../src/lib/optout";
import { pickReachable } from "../src/pipeline/reach";
import { findSnapshot } from "../src/pipeline/archive";
import { pushJob, pushFile } from "./sync-jobs";
import { buildSite } from "../src/pipeline/build";
import { auditRebuilt } from "../src/pipeline/audit";
import { scoreSite } from "../src/pipeline/scores";
import { readCharters } from "../src/pipeline/charter";
import { findPortraits } from "../src/pipeline/portraits";
import { verifySite } from "../src/pipeline/verify";
import { findEvidence } from "../src/pipeline/evidence";
import { withUsage } from "../src/lib/usage";

const [inputUrl, jobId, max = "20"] = process.argv.slice(2);
const ROBOTS_BLOCKED = "This site's robots.txt asks crawlers not to visit it, so RE:GOV will not rebuild it, not even from the Wayback Machine.";
const OPTED_OUT = "This site is on RE:GOV's do-not-crawl list, so RE:GOV will not rebuild it.";
const THIN = "The site gave the agent too little text to rebuild, live or in the Wayback Machine.";
let url = inputUrl;
if (!url || !jobId) { console.error("usage: pipeline.ts <url> <jobId> [maxPages]"); process.exit(1); }
const dir = join("jobs", jobId);
const status = { url, jobId, startedAt: new Date().toISOString(), phase: "crawl", events: [] as unknown[], done: false, error: "",
  // Set when the site's own rules stop the run: the job page explains it and the run does not use up the daily allowance.
  refused: undefined as undefined | { reason: "terms" | "robots" | "optout" | "insufficient"; quote?: string; urls?: string[] } };
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
    if (optedOut(url)) throw new Error(OPTED_OUT);
    const origin = new URL(url).origin;
    // robots.txt first: a site that asks REGOVBot (or every crawler) to stay away is not rebuilt at all, not even from the archive.
    const robots = await loadRobots(origin);
    log({ type: "robots", state: robots.state, delayMs: robots.delayMs, blocksSite: robots.blocksSite });
    if (robots.blocksSite) throw new Error(ROBOTS_BLOCKED);
    // Terms of use next, before any page is collected. TermsError stops the run; anything else (homepage not
    // fetchable, model error) leaves it to the archive pass or records that the terms could not be checked.
    let termsChecked = false;
    const gate = async (r: Robots, archiveTimestamp?: string) => {
      try {
        const t = await withUsage(dir, "run", "terms", () => checkTerms(dir, origin, r, archiveTimestamp));
        log({ type: "terms", urls: t.urls, restricts: false, source: t.source });
        termsChecked = true;
      } catch (e) {
        if (e instanceof TermsError) { log({ type: "terms", urls: e.result.urls, restricts: true, reason: e.result.reason, quote: e.result.quote }); throw e; }
        log({ type: "terms", error: (e as Error).message.split("\n")[0].slice(0, 120) });
      }
    };
    const runCrawl = async (r: Robots, archiveTimestamp?: string) => {
      const res = await crawl(url, { jobId, maxPages: Number(max), onEvent: log, archiveTimestamp, robots: r });
      if (res.pages.length) log({ type: "quality", ...res.quality, coverage: res.coverage, archive: !!archiveTimestamp });
      return res;
    };
    let why = "";
    // Set when the live site answered but showed (almost) no text; with no archive copy either, the run is refused, not failed.
    let thin = false;
    if (robots.state === "unreachable") {
      why = "The site did not answer (robots.txt could not be read)";
      log({ type: "unreachable", reason: "robots.txt unreachable" });
    } else {
      await gate(robots);
      try {
        const r = await runCrawl(robots);
        if (r.pages.length === 0) {
          why = `The site could not be fetched (${r.skipped[0]?.reason ?? "no pages"})`;
          log({ type: "unreachable", reason: r.skipped[0]?.reason ?? "no pages" });
        } else if (r.quality?.status === "insufficient") {
          why = `The site showed too little text to rebuild (${r.quality.reasons[0]})`;
          thin = true;
          log({ type: "insufficient", reason: r.quality.reasons[0] });
        }
      } catch (e) {
        if (!(e instanceof BlockedError)) throw e;
        log({ type: "blocked", url: e.url, reason: e.reason });
        why = e.message;
        thin = e.reason.startsWith("blank page");
      }
    }
    if (why) {
      // Dead, firewalled or bot-protected: rebuild from the Wayback Machine instead, under the robots.txt and terms it captured.
      status.phase = "archive";
      const snap = await findSnapshot(url);
      if (!snap) throw new Error(thin ? THIN : `${why}. No Wayback Machine copy found either.`);
      log({ type: "archive", timestamp: snap.timestamp, captures: snap.captures });
      const archived = await loadRobots(origin, snap.timestamp);
      if (archived.blocksSite) throw new Error(ROBOTS_BLOCKED);
      if (!termsChecked) await gate(archived, snap.timestamp);
      const a = await runCrawl(archived, snap.timestamp);
      if (a.quality?.status === "insufficient") throw new Error(thin ? THIN : `${why}. The Wayback Machine copy has too little text to rebuild either (${a.quality.reasons[0]}).`);
    }
    if (!termsChecked) console.warn("[terms] could not be checked; see the terms events in status.json");
    status.phase = "build";
    await withUsage(dir, "run", "build", () => buildSite(jobId, (e) => { if (e.type === "phase") status.phase = e.phase; log(e); }));
    // Self-check: Muse Spark compares each rebuilt page with its original (never fails the run).
    status.phase = "verify"; await flush();
    try {
      const v = await withUsage(dir, "run", "verify", async () => verifySite(dir, JSON.parse(await readFile(join(dir, "site.json"), "utf8"))));
      log({ type: "verify", pages: v.pages.length, average: v.average, faithful: v.pages.filter((p) => p.verdict === "faithful").length, unsupported: v.pages.reduce((n, p) => n + p.unsupported.length, 0) });
    } catch (e) {
      console.warn("[verify] skipped:", (e as Error).message);
    }
    // Citizen's Charter PDFs → service pages (Muse Spark reads each PDF; never fails the run).
    status.phase = "charter"; await flush();
    try {
      const c = await withUsage(dir, "run", "charter", () => readCharters(dir));
      log({ type: "charter", docs: c.docs.length, services: c.docs.reduce((n, d) => n + d.services.length, 0) });
    } catch (e) {
      console.warn("[charter] skipped:", (e as Error).message);
    }
    // Officials' photos: SAM 3.1 finds them on the crawled pages, Muse Spark names them (never fails the run).
    status.phase = "portraits"; await flush();
    try {
      const p = await withUsage(dir, "run", "portraits", async () => findPortraits(dir, JSON.parse(await readFile(join(dir, "site.json"), "utf8"))));
      log({ type: "portraits", found: p.checked, named: p.people.length });
    } catch (e) {
      console.warn("[portraits] skipped:", (e as Error).message);
    }
    // Outline the old homepage's accessibility problems for the report (never fails the run).
    status.phase = "evidence"; await flush();
    try {
      const ev = await withUsage(dir, "run", "evidence", async () => findEvidence(dir, JSON.parse(await readFile(join(dir, "site.json"), "utf8"))));
      log({ type: "evidence", outlined: ev?.items.length ?? 0 });
    } catch (e) {
      console.warn("[evidence] skipped:", (e as Error).message);
    }
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
    status.refused = e instanceof TermsError ? { reason: "terms", quote: e.result.quote, urls: e.result.urls }
      : status.error === ROBOTS_BLOCKED ? { reason: "robots" } : status.error === OPTED_OUT ? { reason: "optout" } : status.error === THIN ? { reason: "insufficient" } : undefined;
    if (status.refused) log({ type: "refused", ...status.refused }); else console.error(e);
  }
  await flush(); await flushing;
})();
