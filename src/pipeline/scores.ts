/**
 * Before and after, measured the same way: load the original homepage and the rebuilt one in a
 * fresh browser (no cache), twice each, and record load time, largest paint, bytes on the wire,
 * request count and axe-core WCAG violations. Writes assets/scores.json. Free (no model calls).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser } from "playwright";
import { axeAudit } from "./wcag";
import { auditBase } from "./audit";
import { UA } from "./crawl";
import type { CrawlResult } from "./types";
import type { Metrics, Scores } from "../lib/scores";
export { fmtMs, fmtBytes, type Metrics, type Scores } from "../lib/scores";


/** Where visitors reach the rebuild (through the CDN), so both sides cross the public internet. */
export const scoreBase = () => process.env.SCORE_BASE ?? process.env.PUBLIC_ORIGIN ?? auditBase();

async function loadOnce(browser: Browser, url: string, audit: boolean): Promise<Metrics> {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, userAgent: UA, ignoreHTTPSErrors: true });
  try {
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    let bytes = 0, requests = 0;
    cdp.on("Network.requestWillBeSent", () => { requests++; });
    cdp.on("Network.loadingFinished", (e: { encodedDataLength: number }) => { bytes += e.encodedDataLength; });
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await page.goto(url, { waitUntil: "load", timeout: 60_000 });
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    const t = await page.evaluate(() => new Promise<{ load: number; lcp: number | null }>((done) => {
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const load = nav ? nav.loadEventEnd - nav.startTime : performance.now();
      let lcp: number | null = null;
      try {
        new PerformanceObserver((l) => { for (const e of l.getEntries()) lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      } catch { /* unsupported */ }
      setTimeout(() => done({ load, lcp }), 300);
    }));
    const axe = audit ? await axeAudit(page).catch(() => null) : null;
    return { url, load_ms: Math.round(t.load), lcp_ms: t.lcp == null ? null : Math.round(t.lcp), bytes, requests, axe_violations: axe?.violations.length ?? 0, axe_elements: axe?.violations.reduce((n, v) => n + v.nodes, 0) ?? 0 };
  } finally {
    await ctx.close();
  }
}

/** Two cold loads; the faster times (network noise only ever adds), the first load's weight and axe result. */
async function measure(browser: Browser, url: string): Promise<Metrics> {
  const a = await loadOnce(browser, url, true);
  const b = await loadOnce(browser, url, false).catch(() => a);
  const min = (x: number | null, y: number | null) => (x == null ? y : y == null ? x : Math.min(x, y));
  return { ...a, load_ms: Math.min(a.load_ms, b.load_ms), lcp_ms: min(a.lcp_ms, b.lcp_ms) };
}

export async function scoreSite(jobDir: string, jobId: string, base = scoreBase()): Promise<Scores> {
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  const out: Scores = { generated_at: new Date().toISOString(), original: null, original_note: "", rebuilt: null, rebuilt_base: base };
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"] });
  try {
    if (crawl.archive) out.original_note = "The original was rebuilt from a Wayback Machine capture, so its speed could not be measured fairly.";
    else {
      try { out.original = await measure(browser, crawl.pages[0]?.url ?? crawl.startUrl); }
      catch (e) { out.original_note = `The original homepage did not load for measurement (${(e as Error).message.split("\n")[0].slice(0, 120)}).`; }
    }
    try { out.rebuilt = await measure(browser, `${base}/preview/${jobId}`); }
    catch (e) { console.warn("[scores] rebuilt:", (e as Error).message); }
  } finally {
    await browser.close();
  }
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/scores.json"), JSON.stringify(out, null, 2));
  return out;
}
