import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { listJobs, loadSite, JOBS_ROOT } from "./jobs";
import { isLgu } from "./civic";
import { CHARTER_SLUG } from "./charterPages";
import type { SitePage } from "@/pipeline/schema";

type Block = SitePage["blocks"][number];
export type Example = { jobId: string; origin: string; site: string; page: string; slug: string; block: Block };
export type Study = {
  sites: number; pages: number; blocks: number;
  types: { type: string; blocks: number; sites: number }[];
  examples: Record<string, Example>;
  design: { checked: number; refined: number };
  charter?: { jobId: string; slug: string; site: string };
  hotlines?: { jobId: string; site: string };
};

/** Items each example should have: enough to show the pattern, few enough to read. */
const RANGE: Record<string, [number, number]> = { contact: [3, 6], steps: [3, 5], timeline: [3, 5], faq: [3, 5], people: [4, 8], links: [5, 8] };
/** Hand-picked examples (production job, page, heading); any that are missing fall back to the best automatic pick. */
const PINNED: Record<string, [string, string, string]> = {
  contact: ["calabarzon-denr-gov-ph-mvqa1iak", "contact-us", "DENR Calabarzon"],
  steps: ["malabon-gov-ph-mvq4ihy1", "senior-citizen-program", "How to apply for a senior citizen ID"],
  people: ["cityofvalencia-gov-ph-mvqwkyqa", "mayors-of-valencia", "The Local Chief Executives"],
  links: ["baler-gov-ph-mvq52jpg", "arta-corner", "Related services and transparency links"],
  timeline: ["csc-gov-ph-mvq75ria", "about/historical-highlights", "How the Philippine civil service began"],
  faq: ["muntinlupacity-gov-ph-mvq6utu6", "frequently-asked-questions", "General questions"],
};
const TTL = 10 * 60 * 1000;
let cache: { at: number; study: Study } | null = null;

/** What RE:GOV's built sites contain, block by block, plus one real example of each pattern Kapwa lacks. Cached for ten minutes. */
export async function kapwaStudy(): Promise<Study> {
  if (cache && Date.now() - cache.at < TTL) return cache.study;
  const jobs = (await listJobs()).filter((j) => j.site);
  const types = new Map<string, { blocks: number; sites: Set<string> }>();
  const best = new Map<string, { score: number; ex: Example }>();
  let pages = 0, blocks = 0, checked = 0, refined = 0;
  const hasPortraits = new Set<string>();
  await Promise.all(jobs.map(async (j) => { if (await stat(join(JOBS_ROOT, j.id, "assets/portraits.json")).then(() => true, () => false)) hasPortraits.add(j.id); }));
  for (const j of jobs) {
    const site = j.site!;
    const name = site.agency.short_name || site.agency.name;
    if (site.design) { checked++; if (site.design.mode === "refine") refined++; }
    for (const p of site.pages) {
      pages++;
      for (const b of p.blocks) {
        blocks++;
        const t = types.get(b.type) ?? { blocks: 0, sites: new Set() };
        t.blocks++; t.sites.add(j.id); types.set(b.type, t);
        const range = RANGE[b.type];
        const items = (b.items ?? []).filter((it) => it.title.trim());
        const pin = PINNED[b.type];
        if (pin && pin[0] === j.id && pin[1] === p.slug && b.heading.startsWith(pin[2])) {
          best.set(b.type, { score: Infinity, ex: { jobId: j.id, origin: site.origin, site: name, page: p.title, slug: p.slug, block: { ...b, items: items.slice(0, 8) } } });
          continue;
        }
        if (!range || !b.heading.trim() || items.length < range[0] || items.length > range[1]) continue;
        // Prefer full, readable items; people examples need photos to show the pattern.
        const text = items.reduce((n, it) => n + Math.min(160, it.title.length + it.description.length + it.meta.length), 0);
        const filled = items.filter((it) => it.description || it.meta).length / items.length;
        const score = text * (0.5 + filled) * (b.type === "people" && hasPortraits.has(j.id) ? 3 : 1) * (/[ÃÂ�]/.test(JSON.stringify(items)) ? 0 : 1);
        if ((best.get(b.type)?.score ?? 0) < score) best.set(b.type, { score, ex: { jobId: j.id, origin: site.origin, site: name, page: p.title, slug: p.slug, block: { ...b, items } } });
      }
    }
  }
  // A Citizen's Charter service page from the site with the most services, and a town or city for the hotlines page.
  const services = await Promise.all(jobs.map(async (j) => {
    try { const c = JSON.parse(await readFile(join(JOBS_ROOT, j.id, "assets/charter.json"), "utf8")) as { docs: { services: unknown[] }[] }; return { j, n: c.docs.reduce((t, d) => t + d.services.length, 0) }; } catch { return { j, n: 0 }; }
  }));
  const top = services.sort((a, b) => b.n - a.n)[0];
  let charter: Study["charter"];
  if (top?.n) {
    const full = await loadSite(top.j.id);
    const caps = (t: string) => (t.match(/\b[A-Z]{3,}\b/g) ?? []).length;
    const page = full?.pages.filter((p) => p.document && p.slug !== CHARTER_SLUG).sort((a, b) => caps(a.title) - caps(b.title))[0];
    if (page) charter = { jobId: top.j.id, slug: page.slug, site: top.j.site!.agency.short_name || top.j.site!.agency.name };
  }
  const lgu = (top?.n && isLgu(top.j.site!) ? top.j : undefined) ?? jobs.find((j) => isLgu(j.site!));
  const hotlines: Study["hotlines"] = lgu ? { jobId: lgu.id, site: lgu.site!.agency.short_name || lgu.site!.agency.name } : undefined;
  const study: Study = {
    sites: jobs.length, pages, blocks,
    types: [...types].map(([type, v]) => ({ type, blocks: v.blocks, sites: v.sites.size })).sort((a, b) => b.blocks - a.blocks),
    examples: Object.fromEntries([...best].map(([k, v]) => [k, v.ex])),
    design: { checked, refined }, charter, hotlines,
  };
  cache = { at: Date.now(), study };
  return study;
}
