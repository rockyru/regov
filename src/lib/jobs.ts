import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import type { CrawlResult } from "@/pipeline/types";

export const JOBS_ROOT = resolve(process.cwd(), "jobs");

export async function listJobs() {
  let ids: string[] = [];
  try { ids = (await readdir(JOBS_ROOT)).filter((d) => !d.startsWith(".")); } catch { return []; }
  const jobs = await Promise.all(ids.map(async (id) => {
    const dir = join(JOBS_ROOT, id);
    const has = async (f: string) => stat(join(dir, f)).then(() => true).catch(() => false);
    const [hasCrawl, hasSite] = await Promise.all([has("crawl.json"), has("site.json")]);
    let crawl: CrawlResult | null = null, site: SiteModel | null = null;
    if (hasCrawl) crawl = JSON.parse(await readFile(join(dir, "crawl.json"), "utf8"));
    if (hasSite) site = JSON.parse(await readFile(join(dir, "site.json"), "utf8"));
    return { id, crawl, site, mtime: (await stat(dir)).mtimeMs };
  }));
  return jobs.filter((j) => j.crawl).sort((a, b) => b.mtime - a.mtime);
}

export async function loadSite(jobId: string): Promise<SiteModel | null> {
  if (!/^[\w.-]+$/.test(jobId)) return null;
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
  if (href.startsWith("/") && !href.startsWith("//")) {
    if (/\.(pdf|docx?|xlsx?|pptx?|zip|jpe?g|png|gif)$/i.test(href)) return origin + href; // files stay on the source
    const path = href.replace(/\/+$/, "");
    return `/preview/${jobId}${path === "" ? "" : path}`;
  }
  return href;
}
