import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import type { CrawlResult } from "@/pipeline/types";
import { slugOf } from "@/pipeline/slug";

export const JOBS_ROOT = resolve(process.cwd(), "jobs");

export interface JobStatus { url: string; phase: string; done: boolean; error: string; startedAt: string; events: { t: number; type: string }[] }

// Restore jobs from R2 once per process if the local jobs dir is empty (container cold start).
let restoring: Promise<void> | null = null;
async function ensureRestored() {
  if (restoring) return restoring;
  restoring = (async () => {
    try {
      const ids = (await readdir(JOBS_ROOT).catch(() => [] as string[])).filter((d) => !d.startsWith("."));
      if (ids.length > 0) return;
      if (!(process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)) return;
      const { pullAll } = await import("../../scripts/sync-jobs");
      await pullAll();
    } catch (e) {
      console.warn("[jobs] restore skipped:", (e as Error).message);
    }
  })();
  return restoring;
}

export async function listJobs() {
  await ensureRestored();
  let ids: string[] = [];
  try { ids = (await readdir(JOBS_ROOT)).filter((d) => !d.startsWith(".")); } catch { return []; }
  const jobs = await Promise.all(ids.map(async (id) => {
    const dir = join(JOBS_ROOT, id);
    const has = async (f: string) => stat(join(dir, f)).then(() => true).catch(() => false);
    const [hasCrawl, hasSite, hasStatus] = await Promise.all([has("crawl.json"), has("site.json"), has("status.json")]);
    let crawl: CrawlResult | null = null, site: SiteModel | null = null, status: JobStatus | null = null;
    if (hasCrawl) crawl = JSON.parse(await readFile(join(dir, "crawl.json"), "utf8"));
    if (hasSite) site = JSON.parse(await readFile(join(dir, "site.json"), "utf8"));
    if (hasStatus) try { status = JSON.parse(await readFile(join(dir, "status.json"), "utf8")); } catch { /* mid-write */ }
    return { id, crawl, site, status, mtime: (await stat(dir)).mtimeMs };
  }));
  return jobs.filter((j) => j.crawl || j.status).sort((a, b) => b.mtime - a.mtime);
}

export async function loadSite(jobId: string): Promise<SiteModel | null> {
  if (!/^[\w.-]+$/.test(jobId)) return null;
  await ensureRestored();
  try { return JSON.parse(await readFile(join(JOBS_ROOT, jobId, "site.json"), "utf8")); } catch { return null; }
}

export function findPage(site: SiteModel, slug: string): SitePage | undefined {
  const s = slug || "home";
  return site.pages.find((p) => p.slug === s) ?? site.pages.find((p) => p.slug.endsWith("/" + s));
}

/** Rewrite a content href so same-site links stay inside the preview. */
export function previewHref(jobId: string, origin: string, href: string): string {
  if (!href) return "#";
  if (href.startsWith(origin)) href = href.slice(origin.length) || "/";
  if ((href.startsWith("/") && !href.startsWith("//")) || href.startsWith("?")) {
    if (/\.(pdf|docx?|xlsx?|pptx?|zip|jpe?g|png|gif)(\?|$)/i.test(href)) return origin + href; // files stay on the source
    const slug = slugOf(origin + (href.startsWith("?") ? "/" + href : href));
    return slug === "home" ? `/preview/${jobId}` : `/preview/${jobId}/${slug}`;
  }
  return href;
}
