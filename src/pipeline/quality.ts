/**
 * Crawl quality, so an empty or half-collected site is never presented as a complete rebuild.
 * insufficient stops the run (the pipeline tries the Wayback Machine first); partial is shown on the job page and report.
 */
import type { CrawlResult, Quality } from "./types";

/** Below this much visible text across all pages there is nothing to rebuild. */
export const MIN_CHARS = 1500;
const USABLE = 200;

export function crawlQuality(c: Pick<CrawlResult, "pages" | "skipped" | "coverage">): Quality {
  const chars = c.pages.reduce((n, p) => n + p.text.trim().length, 0);
  const usable = c.pages.filter((p) => p.text.trim().length >= USABLE).length;
  if (usable === 0 || chars < MIN_CHARS) {
    return { status: "insufficient", chars, reasons: [c.pages.length ? `${c.pages.length === 1 ? "The one page collected has" : `The ${c.pages.length} pages collected have`} ${chars.toLocaleString("en-PH")} characters of text in all` : "No page could be collected"] };
  }
  const v = c.coverage;
  const reasons: string[] = [];
  if (v) {
    if (v.not_reached > 0) reasons.push(`${v.crawled} of the ${v.discovered.toLocaleString("en-PH")} pages found were collected; each run rebuilds up to ${v.limit}`);
    if (v.robots) reasons.push(`${v.robots} ${v.robots === 1 ? "page is" : "pages are"} excluded by the site's robots.txt`);
    if (v.failed) reasons.push(`${v.failed} ${v.failed === 1 ? "page" : "pages"} could not be fetched`);
    if (v.empty) reasons.push(`${v.empty} ${v.empty === 1 ? "page" : "pages"} showed no text`);
  } else if (c.skipped.length) {
    reasons.push(`${c.skipped.length} ${c.skipped.length === 1 ? "address was" : "addresses were"} left out during the crawl`);
  }
  return { status: reasons.length ? "partial" : "complete", reasons, chars };
}
