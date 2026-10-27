import { fixPage } from "./titles";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CrawlResult } from "./types";
import type { SiteModel, SitePage } from "./schema";
import { understandPage } from "./understand";
import { planSite } from "./plan";
import { segmentHome } from "./segment";
import { makeBand } from "./band";
import { pmap } from "./cache";

export type BuildEvent =
  | { type: "phase"; phase: "understand" | "plan" | "segment" | "band" | "write"; detail?: string }
  | { type: "page"; index: number; title: string; page_type: string; blocks: number; ms: number }
  | { type: "plan"; agency: string; nav: string[] }
  | { type: "segment"; regions: number; logo: boolean }
  | { type: "band"; brief: string }
  | { type: "built"; pages: number; tokens: number; ms: number };

export { slugOf } from "./slug";
import { slugOf } from "./slug";

export async function buildSite(jobId: string, onEvent: (e: BuildEvent) => void = () => {}, jobsRoot = "jobs"): Promise<SiteModel> {
  const jobDir = join(jobsRoot, jobId);
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  if (crawl.pages.length === 0) throw new Error("Nothing to build: the crawl produced no pages" + (crawl.skipped[0] ? ` (${crawl.skipped[0].reason})` : ""));
  const t0 = Date.now();
  let tokens = 0;

  onEvent({ type: "phase", phase: "understand", detail: `${crawl.pages.length} pages` });
  // (protected pages are skipped below)
  const usable = crawl.pages.filter((p) => !/^(Protected|Private):/i.test(p.title) && !/This content is password protected/i.test(p.text.slice(0, 2000)));
  const concurrency = Number(process.env.UNDERSTAND_CONCURRENCY ?? 3);
  const pages: SitePage[] = await pmap(usable, concurrency, async (p, i) => {
    const t = Date.now();
    const { model, usage } = await understandPage(jobDir, p, crawl.archive?.note ?? "");
    tokens += usage;
    onEvent({ type: "page", index: i, title: model.title, page_type: model.page_type, blocks: model.blocks.length, ms: Date.now() - t });
    return fixPage({ ...model, slug: slugOf(p.url), source_url: p.url, source_screenshot: p.screenshotFile });
  });
  // de-duplicate slugs (http/https or trailing variants)
  const seen = new Set<string>();
  const canon = (slug: string) => (/^(page-)?(home|index|main|default)$/.test(slug) ? "home" : slug);
  const unique = pages.map((p) => ({ ...p, slug: canon(p.slug) })).filter((p) => (seen.has(p.slug) ? false : (seen.add(p.slug), true)));

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
  }).filter((n) => n.title && !/^(Protected|Private):/i.test(n.title.replace(/<[^>]+>/g, "")));

  onEvent({ type: "phase", phase: "band" });
  let band: { band?: string; cover?: string; brief?: string } = {};
  try {
    const b = await makeBand(jobDir, plan, unique.map((p) => p.summary));
    band = { band: b.band, cover: b.cover, brief: b.brief };
    onEvent({ type: "band", brief: b.brief });
  } catch (e) {
    console.warn("[band] skipped:", (e as Error).message);
  }

  onEvent({ type: "phase", phase: "write" });
  const site: SiteModel = { ...plan, jobId, origin: crawl.origin, generated_at: new Date().toISOString(), pages: unique, news, assets: { logo: seg.logo, logo_box: seg.logo_box, band: band.band, cover: band.cover, band_brief: band.brief }, tokens };
  await writeFile(join(jobDir, "site.json"), JSON.stringify(site, null, 2));
  onEvent({ type: "built", pages: unique.length, tokens, ms: Date.now() - t0 });
  return site;
}
