/**
 * Sitemap discovery: the sitemaps robots.txt lists, else the usual locations (WordPress, Yoast, plain).
 * Follows one level of sitemap indexes. Every fetch is allowed by robots.txt and sent as REGOVBot.
 */
import { fetchAsBot, type Robots } from "./robots";

const GUESSES = ["/sitemap.xml", "/sitemap_index.xml", "/wp-sitemap.xml"];
const MAX_CHILDREN = 6;
const MAX_URLS = 1000;

/** The <loc> URLs of a sitemap or sitemap index, CDATA and &amp; unwrapped. */
export const locs = (xml: string) => [...xml.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]\s]+)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => m[1].replace(/&amp;/g, "&"));

async function read(url: string): Promise<string> {
  const r = await fetchAsBot(url, 15_000);
  if (r.status >= 400 || !/<(urlset|sitemapindex)\b/i.test(r.body)) return "";
  return r.body;
}

/** Page URLs from the site's sitemaps, in sitemap order; empty when there is none. */
export async function sitemapUrls(origin: string, robots: Robots): Promise<{ urls: string[]; sources: string[] }> {
  const candidates = robots.sitemaps.length ? robots.sitemaps : GUESSES.map((p) => origin + p);
  const sources: string[] = [];
  const out = new Set<string>();
  for (const sm of candidates) {
    if (out.size >= MAX_URLS) break;
    if (!robots.allows(sm)) continue;
    let xml = "";
    try { xml = await read(sm); } catch { continue; }
    if (!xml) continue;
    sources.push(sm);
    // An index lists other sitemaps; page sitemaps (pages, posts) usually come first, so take the first few.
    const children = /<sitemapindex\b/i.test(xml) ? locs(xml).filter((u) => robots.allows(u)).slice(0, MAX_CHILDREN) : [];
    if (!children.length) for (const u of locs(xml)) if (out.size < MAX_URLS) out.add(u);
    // One at a time, a second apart, like the crawl itself.
    for (const c of children) {
      if (out.size >= MAX_URLS) break;
      await new Promise((r) => setTimeout(r, Math.max(1000, robots.delayMs)));
      for (const u of locs(await read(c).catch(() => ""))) if (out.size < MAX_URLS) out.add(u);
    }
    // robots.txt may list several sitemaps; the guesses are alternatives, so stop at the first that answers.
    if (!robots.sitemaps.length) break;
  }
  return { urls: [...out], sources };
}
