/**
 * Polite same-origin crawler. Produces HTML, full-page + viewport screenshots,
 * visible text and link graph per page, plus WordPress REST JSON when exposed.
 */
import { chromium, type Page } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CrawlResult, CrawledPage, CrawlEvent, WpRest } from "./types";

export interface CrawlOptions {
  jobId: string;
  jobsRoot?: string;
  maxPages?: number;
  maxDepth?: number;
  delayMs?: number;
  viewport?: { width: number; height: number };
  maxFullPageHeight?: number;
  onEvent?: (e: CrawlEvent) => void;
}

const UA = "Mozilla/5.0 (compatible; SiteResurrectionBot/0.1; +https://github.com/rockyru) Chrome/120";
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

async function robotsDisallows(origin: string): Promise<RegExp[]> {
  try {
    const res = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return [];
    const txt = await res.text();
    const out: RegExp[] = [];
    let applies = false;
    for (const line of txt.split(/\r?\n/)) {
      const [k, ...rest] = line.split("#")[0].split(":");
      const v = rest.join(":").trim();
      if (!k) continue;
      const key = k.trim().toLowerCase();
      if (key === "user-agent") applies = v === "*";
      else if (applies && key === "disallow" && v) {
        out.push(new RegExp("^" + v.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")));
      }
    }
    return out;
  } catch {
    return [];
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

export async function crawl(startUrl: string, opts: CrawlOptions): Promise<CrawlResult> {
  const {
    jobId, jobsRoot = "jobs", maxPages = 20, maxDepth = 3, delayMs = 1000,
    viewport = { width: 1280, height: 900 }, maxFullPageHeight = 6000, onEvent = () => {},
  } = opts;
  const start = normalizeUrl(startUrl, startUrl);
  if (!start) throw new Error(`Bad start URL: ${startUrl}`);
  const origin = new URL(start).origin;
  const dir = join(jobsRoot, jobId);
  await mkdir(join(dir, "html"), { recursive: true });
  await mkdir(join(dir, "shots"), { recursive: true });

  const disallow = await robotsDisallows(origin);
  const blocked = (u: string) => disallow.some((re) => re.test(new URL(u).pathname));

  onEvent({ type: "start", origin });
  const wpPromise = fetchWpRest(origin);

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, userAgent: UA, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  await page.route("**/*", (route) => {
    const t = route.request().resourceType();
    return t === "media" || t === "font" ? route.abort() : route.continue();
  });

  const queue: { url: string; depth: number }[] = [{ url: start, depth: 0 }];
  const seen = new Set<string>([start]);
  const pages: CrawledPage[] = [];
  const skipped: CrawlResult["skipped"] = [];
  const startedAt = new Date().toISOString();

  while (queue.length && pages.length < maxPages) {
    const { url, depth } = queue.shift()!;
    if (blocked(url)) { skipped.push({ url, reason: "robots" }); onEvent({ type: "skip", url, reason: "robots" }); continue; }
    const idx = pages.length;
    const key = String(idx).padStart(3, "0");
    let status = 0;
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      status = res?.status() ?? 0;
      await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
      const ct = res?.headers()["content-type"] || "";
      if (!ct.includes("html")) { skipped.push({ url, reason: `content-type ${ct}` }); continue; }

      const ex = await extract(page, origin);
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
        fetchedAt: new Date().toISOString(), width: viewport.width, height: fullH,
      });
      onEvent({ type: "page", url, index: idx, title: ex.title, status });

      if (depth < maxDepth) {
        // nav links first so the important pages land inside the cap
        for (const l of [...navLinks, ...pageLinks]) {
          if (!seen.has(l)) { seen.add(l); queue.push({ url: l, depth: depth + 1 }); }
        }
      }
    } catch (e) {
      const reason = (e as Error).message.split("\n")[0].slice(0, 120);
      skipped.push({ url, reason });
      onEvent({ type: "skip", url, reason });
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  await browser.close();

  const wp = await wpPromise;
  if (wp) onEvent({ type: "wp-rest", pages: wp.pages.length, posts: wp.posts.length });

  const result: CrawlResult = { jobId, startUrl: start, origin, startedAt, finishedAt: new Date().toISOString(), pages, skipped, wp };
  await writeFile(join(dir, "crawl.json"), JSON.stringify(result, null, 2));
  onEvent({ type: "done", count: pages.length });
  return result;
}
