import type { AxeResult } from "./wcag";
export interface CrawledPage {
  url: string;
  path: string;          // URL path + search, used as a stable key
  depth: number;
  status: number;
  title: string;
  description: string;
  htmlFile: string;      // relative to job dir
  screenshotFile: string;
  viewportShotFile: string;
  text: string;          // visible text, truncated
  headings: { level: number; text: string }[];
  links: string[];       // same-origin page links (normalized)
  attachments: string[]; // same-origin files (pdf, doc, images in content)
  navLinks: string[];    // links found inside <nav>/<header>
  fetchedAt: string;
  width: number;
  height: number;        // full-page screenshot size in px
  axe?: AxeResult;       // WCAG 2.2 A/AA audit of the original page (runs from Oct 27 2026)
}

export interface WpRest {
  pages: unknown[];
  posts: unknown[];
}

export interface CrawlResult {
  jobId: string;
  startUrl: string;
  origin: string;
  startedAt: string;
  finishedAt: string;
  pages: CrawledPage[];
  skipped: { url: string; reason: string }[];
  wp?: WpRest;
  /** Set when the live site was blocked and the Wayback Machine copy was crawled instead. */
  archive?: { timestamp: string; date: string; note: string };
  /** What the crawl found and what it left out (runs from Oct 28 2026). */
  coverage?: Coverage;
  quality?: Quality;
}

export interface Coverage {
  /** Page cap for the run. */
  limit: number;
  /** Distinct same-site page addresses found in links and sitemaps, the start page included. */
  discovered: number;
  /** Addresses listed in the site's sitemaps, and the sitemaps read. */
  sitemap: number;
  sitemaps: string[];
  crawled: number;
  /** Disallowed by robots.txt. */
  robots: number;
  /** Same text as a page already collected. */
  duplicate: number;
  /** Loaded but showed no text. */
  empty: number;
  /** Errors, timeouts, rate limits, non-HTML answers, bot protection on an inner page. */
  failed: number;
  /** Found but never fetched because the run reached its page cap. */
  not_reached: number;
}

/** complete: every page found was collected; partial: some were left out (reasons say which); insufficient: too little text to rebuild. */
export interface Quality { status: "complete" | "partial" | "insufficient"; reasons: string[]; chars: number }

export type CrawlEvent =
  | { type: "start"; origin: string; archive?: string }
  | { type: "blocked"; url: string; reason: string }
  | { type: "page"; url: string; index: number; title: string; status: number }
  | { type: "skip"; url: string; reason: string }
  | { type: "sitemap"; urls: number; sources: string[] }
  | { type: "rate-limited"; url: string; waitMs: number }
  | { type: "wp-rest"; pages: number; posts: number }
  | { type: "done"; count: number };
