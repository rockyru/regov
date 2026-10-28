/**
 * Polite same-origin crawler. Produces HTML, full-page + viewport screenshots,
 * visible text and link graph per page, plus WordPress REST JSON when exposed.
 */
import { chromium, type Page } from "playwright";
import { axeAudit } from "./wcag";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import type { CrawlResult, CrawledPage, CrawlEvent, WpRest } from "./types";
import { BLOCKED_TITLE, PARKED_TITLE, fromArchive, toArchive, hostKey } from "./archive";
import { UA, loadRobots, type Robots } from "./robots";
import { sitemapUrls } from "./sitemap";
import { crawlQuality } from "./quality";

export { UA };

export class BlockedError extends Error { constructor(public url: string, public reason: string) { super(`Blocked by bot protection: ${reason}`); } }

export interface CrawlOptions {
  jobId: string;
  jobsRoot?: string;
  maxPages?: number;
  maxDepth?: number;
  delayMs?: number;
  viewport?: { width: number; height: number };
  maxFullPageHeight?: number;
  onEvent?: (e: CrawlEvent) => void;
  /** Crawl the Wayback Machine copy at this timestamp instead of the live site. */
  archiveTimestamp?: string;
  /** robots.txt already read by the caller; loaded here otherwise. */
  robots?: Robots;
}

const FILE_RE = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|jpe?g|png|gif|webp|svg|mp4|mp3|csv|txt)(\?.*)?$/i;
const TRACKING = /^(utm_|fbclid|gclid|_ga)/;

export function normalizeUrl(raw: string, base: string): string | null {
  try {
    const u = new URL(raw, base);
    if (!/^https?:$/.test(u.protocol)) return null;
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (TRACKING.test(k)) u.searchParams.delete(k);
    // WP pagination / feeds / admin are noise
    if (/\/(wp-admin|wp-login|feed|xmlrpc|wp-json|comments)\b/i.test(u.pathname)) return null;
    if (/\/page\/\d+\/?$/.test(u.pathname)) return null;
    if (u.searchParams.has("replytocom") || u.searchParams.has("share")) return null;
    if (u.pathname.length > 1 && u.pathname.endsWith("/")) u.pathname = u.pathname.slice(0, -1);
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchWpRest(origin: string): Promise<WpRest | undefined> {
  const get = async (kind: string) => {
    const fields = "id,link,slug,title,parent,menu_order,date,modified,excerpt,content,featured_media,categories";
    const res = await fetch(`${origin}/wp-json/wp/v2/${kind}?per_page=100&_fields=${fields}`, {
      headers: { "user-agent": UA, accept: "application/json" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as unknown[];
  };
  try {
    const [pages, posts] = await Promise.all([get("pages"), get("posts").catch(() => [])]);
    return { pages, posts };
  } catch {
    return undefined;
  }
}

interface Extracted {
  all: string[]; navLinks: string[]; headings: { level: number; text: string }[];
  imgs: string[]; text: string; description: string; title: string;
}

// Passed to the browser as a string: tsx/esbuild injects a `__name` helper into
// nested functions, which does not exist inside the page context.
const EXTRACT_SRC = String.raw`(origin) => {
  const abs = (h) => { try { return new URL(h, location.href).toString(); } catch { return null; } };
  const same = (u) => !!u && u.startsWith(origin);
  const anchors = [...document.querySelectorAll("a[href]")];
  const all = anchors.map((a) => abs(a.getAttribute("href") || "")).filter(same);
  const navEls = [...document.querySelectorAll("nav, header, [role=navigation], #menu, .menu, #nav, .nav, .navbar")];
  const navLinks = navEls
    .flatMap((n) => [...n.querySelectorAll("a[href]")])
    .map((a) => abs(a.getAttribute("href") || ""))
    .filter(same);
  const headings = [...document.querySelectorAll("h1,h2,h3")].map((h) => ({
    level: Number(h.tagName[1]),
    text: (h.textContent || "").trim().replace(/\s+/g, " ").slice(0, 200),
  })).filter((h) => h.text);
  const imgs = [...document.querySelectorAll("img[src]")].map((i) => abs(i.getAttribute("src") || "")).filter(same);
  const text = (document.body && document.body.innerText || "").replace(/\n{3,}/g, "\n\n").slice(0, 20000);
  const meta = document.querySelector('meta[name="description"]');
  const description = meta ? meta.content || "" : "";
  return { all, navLinks, headings, imgs, text, description, title: document.title };
}`;

async function extract(page: Page, origin: string): Promise<Extracted> {
  return page.evaluate(`(${EXTRACT_SRC})(${JSON.stringify(origin)})`) as Promise<Extracted>;
}

/** Round-robin links across their first path segment. */
export function diverse(links: string[]): string[] {
  const groups = new Map<string, string[]>();
  for (const l of links) {
    // region_11, office-3 … collapse to one group; category/tag/news archives go last
    const segs = new URL(l).pathname.split("/").filter(Boolean);
    const seg = (segs[0] ?? "").replace(/[-_]?\d+$/, "") + (/^(category|tag|news|author|date)$/i.test(segs[1] ?? "") ? "#archive" : "");
    (groups.get(seg) ?? groups.set(seg, []).get(seg)!).push(l);
  }
  const out: string[] = [];
  const lists = [...groups.entries()].sort(([a], [b]) => Number(a.endsWith("#archive")) - Number(b.endsWith("#archive"))).map(([, v]) => v);
  for (let i = 0; lists.some((g) => g.length > i); i++) for (const g of lists) if (g[i]) out.push(g[i]);
  return out;
}

export async function crawl(startUrl: string, opts: CrawlOptions): Promise<CrawlResult> {
  const {
    jobId, jobsRoot = "jobs", maxPages = 20, maxDepth = 3, viewport = { width: 1280, height: 900 },
    maxFullPageHeight = 6000, onEvent = () => {}, archiveTimestamp,
  } = opts;
  const baseDelay = opts.delayMs ?? (archiveTimestamp ? 2500 : 1000);
  const start = normalizeUrl(startUrl, startUrl);
  if (!start) throw new Error(`Bad start URL: ${startUrl}`);
  const origin = new URL(start).origin;
  const site = hostKey(start);
  // In archive mode every fetch goes to web.archive.org; keys/paths stay in terms of the original site.
  const fetchUrl = (orig: string) => (archiveTimestamp ? toArchive(orig, archiveTimestamp) : orig);
  const sameSite = (u: string) => hostKey(u) === site;
  const dir = join(jobsRoot, jobId);
  await mkdir(join(dir, "html"), { recursive: true });
  await mkdir(join(dir, "shots"), { recursive: true });

  // The site's own robots.txt (its Wayback capture in archive mode) governs every page we fetch.
  const robots = opts.robots ?? (await loadRobots(origin, archiveTimestamp));
  const blocked = (u: string) => !robots.allows(u);
  // Raised when the site answers 429 Too Many Requests; never below its Crawl-delay.
  let delayMs = Math.max(baseDelay, robots.delayMs);

  onEvent({ type: "start", origin, archive: archiveTimestamp });
  // Sitemaps fill in pages the menus hide (JavaScript menus, deep sections). Live sites only: the archive rarely holds them.
  const sitemapPromise = archiveTimestamp ? Promise.resolve({ urls: [] as string[], sources: [] as string[] }) : sitemapUrls(origin, robots).catch(() => ({ urls: [] as string[], sources: [] as string[] }));
  const wpPromise = archiveTimestamp || blocked(`${origin}/wp-json/wp/v2/pages`) ? Promise.resolve(undefined) : fetchWpRest(origin);

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"] });
  const ctx = await browser.newContext({ viewport, userAgent: UA, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    const t = route.request().resourceType();
    return t === "media" || t === "font" ? route.abort() : route.continue();
  });

  const queue: { url: string; depth: number; tries?: number }[] = [{ url: start, depth: 0 }];
  const seen = new Set<string>([start]);
  const digests = new Map<string, string>();
  const pageUrl = (u: string) => { const n = normalizeUrl(u, start); return n && sameSite(n) && !FILE_RE.test(n) ? n : null; };
  let sitemapQueued = false;
  const pages: CrawledPage[] = [];
  const skipped: CrawlResult["skipped"] = [];
  const startedAt = new Date().toISOString();

  while (pages.length < maxPages) {
    // Links first; the sitemap's pages join once the links run out.
    if (!queue.length && !sitemapQueued) {
      sitemapQueued = true;
      const sm = await sitemapPromise;
      const fresh = [...new Set(sm.urls.map(pageUrl).filter((u): u is string => !!u && !seen.has(u)))];
      if (sm.sources.length) onEvent({ type: "sitemap", urls: sm.urls.length, sources: sm.sources });
      for (const l of diverse(fresh)) { seen.add(l); queue.push({ url: l, depth: 1 }); }
    }
    if (!queue.length) break;
    const { url, depth, tries = 0 } = queue.shift()!;
    if (blocked(url)) { skipped.push({ url, reason: "robots" }); onEvent({ type: "skip", url, reason: "robots" }); continue; }
    const idx = pages.length;
    const key = String(idx).padStart(3, "0");
    let status = 0;
    try {
      const res = await page.goto(fetchUrl(url), { waitUntil: "domcontentloaded", timeout: 45_000 });
      status = res?.status() ?? 0;
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
      // Too many requests: wait as asked (or back off), slow the whole crawl, and retry twice.
      if (status === 429) {
        const ra = Number(res?.headers()["retry-after"]);
        const waitMs = Math.min(60_000, ra > 0 ? ra * 1000 : 10_000 * (tries + 1));
        delayMs = Math.min(30_000, Math.max(delayMs * 2, 3000));
        onEvent({ type: "rate-limited", url, waitMs });
        if (tries < 2) { queue.unshift({ url, depth, tries: tries + 1 }); await new Promise((r) => setTimeout(r, waitMs)); continue; }
        if (pages.length === 0) { await browser.close(); throw new BlockedError(url, "429 Too Many Requests"); }
        skipped.push({ url, reason: "rate limited (429)" });
        onEvent({ type: "skip", url, reason: "rate limited (429)" });
        continue;
      }
      const ct = res?.headers()["content-type"] || "";
      if (!ct.includes("html")) { skipped.push({ url, reason: `content-type ${ct}` }); continue; }

      const title = await page.title();
      if (!archiveTimestamp && (BLOCKED_TITLE.test(title) || ((status === 403 || status === 503) && /cloudflare|captcha|challenge/i.test(await page.content())))) {
        const reason = `${status} "${title.slice(0, 60)}"`;
        onEvent({ type: "blocked", url, reason });
        if (pages.length === 0) { await browser.close(); throw new BlockedError(url, reason); }
        skipped.push({ url, reason: `blocked ${reason}` });
        continue;
      }

      if (PARKED_TITLE.test(title)) { skipped.push({ url, reason: `parked/suspended page "${title.slice(0, 40)}"` }); continue; }

      let ex = await extract(page, archiveTimestamp ? "https://web.archive.org" : origin);
      // A blank page may still be rendering; give it a few more seconds before judging it.
      const blank = (x: Extracted) => x.text.trim().length < 80 && x.headings.length === 0;
      if (blank(ex)) { await page.waitForTimeout(5000); ex = await extract(page, archiveTimestamp ? "https://web.archive.org" : origin); }
      if (blank(ex)) {
        // A blank homepage is usually a JavaScript challenge or an app that renders nothing for crawlers: try the archive.
        const reason = `blank page, no text after waiting${title ? ` ("${title.slice(0, 40)}")` : ""}`;
        if (pages.length === 0 && !archiveTimestamp) { await browser.close(); throw new BlockedError(url, reason); }
        skipped.push({ url, reason: "no text on the page" });
        onEvent({ type: "skip", url, reason: "no text on the page" });
        continue;
      }
      // http/https, www, ?lang= and print variants of one page: keep the first.
      const digest = createHash("sha1").update(ex.text.replace(/\s+/g, " ").trim()).digest("hex");
      if (digests.has(digest)) { skipped.push({ url, reason: `duplicate of ${digests.get(digest)}` }); continue; }
      digests.set(digest, url);
      if (archiveTimestamp) {
        // translate archive links back to the original site
        ex.all = ex.all.map(fromArchive).filter(sameSite);
        ex.navLinks = ex.navLinks.map(fromArchive).filter(sameSite);
        ex.imgs = ex.imgs.map(fromArchive).filter(sameSite);
      }
      // Baseline for the report's WCAG section; a failed audit never fails the crawl.
      const axe = await axeAudit(page).catch(() => undefined);
      const html = await page.content();
      const fullH = Math.min(await page.evaluate("document.documentElement.scrollHeight") as number, maxFullPageHeight);
      const shot = `shots/${key}.png`;
      const vshot = `shots/${key}.viewport.png`;
      await page.screenshot({ path: join(dir, vshot) });
      await page.screenshot({ path: join(dir, shot), clip: { x: 0, y: 0, width: viewport.width, height: fullH }, fullPage: true });
      await writeFile(join(dir, `html/${key}.html`), html);

      const links = [...new Set(ex.all.map((u) => normalizeUrl(u, url)).filter((u): u is string => !!u))];
      const attachments = [...new Set([...links.filter((l) => FILE_RE.test(l)), ...ex.imgs])];
      const pageLinks = links.filter((l) => !FILE_RE.test(l));
      const navLinks = [...new Set(ex.navLinks.map((u) => normalizeUrl(u, url)).filter((u): u is string => !!u && !FILE_RE.test(u)))];

      const u = new URL(url);
      pages.push({
        url, path: u.pathname + u.search, depth, status, title: ex.title, description: ex.description,
        htmlFile: `html/${key}.html`, screenshotFile: shot, viewportShotFile: vshot,
        text: ex.text, headings: ex.headings, links: pageLinks, attachments, navLinks,
        fetchedAt: new Date().toISOString(), width: viewport.width, height: fullH, axe,
      });
      onEvent({ type: "page", url, index: idx, title: ex.title, status });

      if (depth < maxDepth) {
        // nav links first, interleaved across top-level sections, so a small page cap
        // still samples every part of the site instead of one dropdown's children.
        const fresh = [...navLinks, ...pageLinks].filter((l) => !seen.has(l));
        for (const l of diverse([...new Set(fresh)])) { seen.add(l); queue.push({ url: l, depth: depth + 1 }); }
      }
    } catch (e) {
      if (e instanceof BlockedError) throw e;
      const reason = (e as Error).message.split("\n")[0].slice(0, 120);
      skipped.push({ url, reason });
      onEvent({ type: "skip", url, reason });
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  await browser.close();

  const wp = await wpPromise;
  if (wp) onEvent({ type: "wp-rest", pages: wp.pages.length, posts: wp.posts.length });

  const sm = await sitemapPromise;
  const listed = new Set(sm.urls.map(pageUrl).filter((u): u is string => !!u));
  const discovered = new Set([...seen, ...listed]).size;
  const count = (re: RegExp) => skipped.filter((x) => re.test(x.reason)).length;
  const robotsN = count(/^robots$/), duplicate = count(/^duplicate of /), empty = count(/^no text on the page$/);
  const coverage = {
    limit: maxPages, discovered, sitemap: listed.size, sitemaps: sm.sources, crawled: pages.length,
    robots: robotsN, duplicate, empty, failed: skipped.length - robotsN - duplicate - empty,
    not_reached: Math.max(0, discovered - pages.length - skipped.length),
  };
  const result: CrawlResult = { jobId, startUrl: start, origin, startedAt, finishedAt: new Date().toISOString(), pages, skipped, wp, coverage };
  result.quality = crawlQuality(result);
  if (archiveTimestamp) {
    const d = `${archiveTimestamp.slice(0, 4)}-${archiveTimestamp.slice(4, 6)}-${archiveTimestamp.slice(6, 8)}`;
    result.archive = { timestamp: archiveTimestamp, date: d, note: `Live site is behind bot protection; content comes from the Wayback Machine capture of ${d}.` };
  }
  await writeFile(join(dir, "crawl.json"), JSON.stringify(result, null, 2));
  onEvent({ type: "done", count: pages.length });
  return result;
}
