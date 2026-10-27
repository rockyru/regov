import { readdir, readFile, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import type { CrawlResult } from "@/pipeline/types";
import { slugOf } from "@/pipeline/slug";
import { fixPageTitles } from "@/pipeline/titles";
import { withCharter } from "./charterPages";
import { personKey } from "./people";

export const JOBS_ROOT = resolve(process.cwd(), "jobs");

export interface JobStatus { url: string; phase: string; done: boolean; error: string; startedAt: string; events: { t: number; type: string }[] }

/** A run that has written nothing for this long is treated as lost, whatever its file says. */
export const STALL_MS = 15 * 60 * 1000;
export function settle<T extends JobStatus>(s: T, now = Date.now()): T {
  if (s.done || s.error || s.phase === "queued") return s;
  const last = s.events.length ? s.events[s.events.length - 1].t : new Date(s.startedAt).getTime();
  if (now - last < STALL_MS) return s;
  return { ...s, phase: "error", error: "The agent went quiet for more than 15 minutes, so this run is considered lost. It usually means the agent restarted. Please start it again." };
}

/** Median wall time of the last 15 finished runs, for queue and progress estimates. Cached for a minute. */
let typical: { at: number; ms: number } | null = null;
export async function typicalRunMs(): Promise<number> {
  if (typical && Date.now() - typical.at < 60_000) return typical.ms;
  const runs: { start: number; ms: number }[] = [];
  for (const id of await readdir(JOBS_ROOT).catch(() => [] as string[])) {
    try {
      const s = JSON.parse(await readFile(join(JOBS_ROOT, id, "status.json"), "utf8")) as JobStatus;
      const start = new Date(s.startedAt).getTime(), end = s.events.at(-1)?.t ?? 0;
      if (s.done && end > start) runs.push({ start, ms: end - start });
    } catch { /* not a run */ }
  }
  const recent = runs.sort((a, b) => b.start - a.start).slice(0, 15).map((r) => r.ms).sort((a, b) => a - b);
  const ms = recent.length ? Math.min(15, Math.max(2, recent[Math.floor(recent.length / 2)] / 60_000)) * 60_000 : 6 * 60_000;
  typical = { at: Date.now(), ms };
  return ms;
}

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
    if (hasSite) site = scrubOfficial(JSON.parse(await readFile(join(dir, "site.json"), "utf8")));
    if (hasStatus) try { status = settle(JSON.parse(await readFile(join(dir, "status.json"), "utf8"))); } catch { /* mid-write */ }
    return { id, crawl, site, status, mtime: (await stat(dir)).mtimeMs };
  }));
  return jobs.filter((j) => j.crawl || j.status).sort((a, b) => b.mtime - a.mtime);
}

const OFFICIAL_LEAD = /^\s*(the\s+)?official\s+(web\s?site|site|web\s?portal|portal|online\s+portal|home\s?page|page)\s+(of|for)\s+(the\s+)?/i;
const OFFICIAL_ANY = /\b(the\s+)?official\s+(web\s?site|site|web\s?portal|portal|home\s?page)\b/gi;

/** The reimagined site is a concept: never let generated copy call itself "the official website". */
export function scrubOfficial(site: SiteModel): SiteModel {
  const kind = site.site_kind ?? "national_agency";
  const loc = site.locality ?? { province: "", region: "", city: "" };
  const isLgu = ["province", "city_municipality", "barangay"].includes(kind);
  const place = [loc.city || site.agency.short_name || site.agency.name, loc.province].filter(Boolean).join(", ");
  const fallback = isLgu ? `Serving the people of ${place}` : kind === "university" || kind === "school" ? "Learning, research and service for the community" : kind === "hospital" ? "Care for every patient" : "Public service for every Filipino";
  const fix = (t: string) => (OFFICIAL_LEAD.test(t) ? fallback : t.replace(OFFICIAL_ANY, "website"));
  site.agency.tagline = fix(site.agency.tagline ?? "");
  site.agency.description = (site.agency.description ?? "").replace(OFFICIAL_ANY, "website");
  for (const p of site.pages) {
    if (p.hero?.subheading) p.hero.subheading = fix(p.hero.subheading);
    if (OFFICIAL_LEAD.test(p.title)) p.title = p.slug === "home" ? site.agency.name : p.title.replace(OFFICIAL_LEAD, "");
    if (p.hero?.heading && OFFICIAL_LEAD.test(p.hero.heading)) p.hero.heading = site.agency.name;
  }
  return fixPageTitles(site);
}

export async function loadSite(jobId: string): Promise<SiteModel | null> {
  if (!/^[\w.-]+$/.test(jobId)) return null;
  await ensureRestored();
  let site: SiteModel;
  try { site = scrubOfficial(JSON.parse(await readFile(join(JOBS_ROOT, jobId, "site.json"), "utf8"))); } catch { return null; }
  try {
    const p = JSON.parse(await readFile(join(JOBS_ROOT, jobId, "assets/portraits.json"), "utf8")) as { people: { name: string; file: string; alt: string }[] };
    const v = encodeURIComponent(site.generated_at);
    site.portraits = Object.fromEntries(p.people.map((x) => [personKey(x.name), { src: `/api/jobs/${jobId}/${x.file}?v=${v}`, alt: x.alt }]));
  } catch { /* no portraits for this site */ }
  return withCharter(site, join(JOBS_ROOT, jobId));
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
