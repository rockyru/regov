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
}

export type CrawlEvent =
  | { type: "start"; origin: string; archive?: string }
  | { type: "blocked"; url: string; reason: string }
  | { type: "page"; url: string; index: number; title: string; status: number }
  | { type: "skip"; url: string; reason: string }
  | { type: "wp-rest"; pages: number; posts: number }
  | { type: "done"; count: number };
