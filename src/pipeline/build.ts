import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CrawlResult } from "./types";
import type { SiteModel, SitePage } from "./schema";
import { understandPage } from "./understand";
import { planSite } from "./plan";
import { segmentHome } from "./segment";
import { pmap } from "./cache";

export type BuildEvent =
  | { type: "phase"; phase: "understand" | "plan" | "segment" | "write"; detail?: string }
  | { type: "page"; index: number; title: string; page_type: string; blocks: number; ms: number }
  | { type: "plan"; agency: string; nav: string[] }
  | { type: "segment"; regions: number; logo: boolean }
  | { type: "built"; pages: number; tokens: number; ms: number };

export const slugOf = (url: string) => {
  const p = new URL(url).pathname.replace(/^\/|\/$/g, "");
  return p === "" ? "home" : p.toLowerCase().replace(/[^a-z0-9/]+/g, "-").replace(/-+/g, "-");
};

export async function buildSite(jobId: string, onEvent: (e: BuildEvent) => void = () => {}, jobsRoot = "jobs"): Promise<SiteModel> {
  const jobDir = join(jobsRoot, jobId);
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  const t0 = Date.now();
  let tokens = 0;

  onEvent({ type: "phase", phase: "understand", detail: `${crawl.pages.length} pages` });
  const pages: SitePage[] = await pmap(crawl.pages, 4, async (p, i) => {
    const t = Date.now();
    const { model, usage } = await understandPage(jobDir, p);
    tokens += usage;
    onEvent({ type: "page", index: i, title: model.title, page_type: model.page_type, blocks: model.blocks.length, ms: Date.now() - t });
    return { ...model, slug: slugOf(p.url), source_url: p.url, source_screenshot: p.screenshotFile };
  });
  // de-duplicate slugs (http/https or trailing variants)
  const seen = new Set<string>();
  const unique = pages.filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)));

  onEvent({ type: "phase", phase: "plan" });
  const { plan, usage } = await planSite(jobDir, crawl, unique);
  tokens += usage;
  onEvent({ type: "plan", agency: plan.agency.name, nav: plan.nav.map((n) => n.label) });

  onEvent({ type: "phase", phase: "segment" });
  const seg = await segmentHome(jobDir, crawl.pages[0].viewportShotFile);
  onEvent({ type: "segment", regions: seg.segments.length, logo: !!seg.logo });

  const news = (crawl.wp?.posts ?? []).map((p) => {
    const x = p as { title?: { rendered?: string }; date?: string; excerpt?: { rendered?: string }; link?: string };
    return { title: x.title?.rendered ?? "", date: x.date ?? "", excerpt: (x.excerpt?.rendered ?? "").replace(/<[^>]+>/g, "").trim(), href: x.link ?? "" };
  });

  onEvent({ type: "phase", phase: "write" });
  const site: SiteModel = { ...plan, jobId, origin: crawl.origin, generated_at: new Date().toISOString(), pages: unique, news, assets: { logo: seg.logo, logo_box: seg.logo_box }, tokens };
  await writeFile(join(jobDir, "site.json"), JSON.stringify(site, null, 2));
  onEvent({ type: "built", pages: unique.length, tokens, ms: Date.now() - t0 });
  return site;
}
