/**
 * Self-check: did the rebuild keep everything, and add nothing? For each page Muse Spark compares
 * the original (visible text, plus the screenshot when it is on disk) with the rebuilt content,
 * and reports coverage, what is missing and any statement the original does not support.
 * Writes assets/verify.json for the report.
 */
import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema, type SiteModel, type SitePage } from "./schema";
import { cached, pmap } from "./cache";
import { toDataUrl } from "./images";
import { pageText } from "../lib/siteSearch";
import type { CrawlResult } from "./types";

const Check = z.object({
  coverage: z.number().describe("0-100: share of the original's substantive content (facts, names, numbers, dates, lists, procedures) present in the rebuild; ignore site chrome like menus, footers, sliders and counters"),
  missing: z.array(z.string()).describe("at most 5 specific items from the original that the rebuild lost, most important first"),
  unsupported: z.array(z.string()).describe("at most 5 statements in the rebuild that the original does not support (invented or changed facts); rewording and summaries are fine"),
  verdict: z.enum(["faithful", "minor_gaps", "major_gaps"]),
});
export type Check = z.infer<typeof Check>;
export type VerifyFile = { generated_at: string; pages: ({ slug: string; title: string; source_url: string } & Check)[]; average: number };

const SYSTEM = `You audit an AI migration of a Philippine government web page. You get the ORIGINAL page (its visible text, and a screenshot when available) and the REBUILT page (title, summary and content as Markdown).
Judge only substance: facts, names, positions, numbers, fees, dates, addresses, lists, steps and legal references. Ignore navigation, footers, cookie notices, visitor counters, sliders and layout. Plain-language rewording and short summaries are expected and fine.
- coverage: how much of the original's substantive content survives (100 = nothing lost).
- missing: specific lost items, quoted or named precisely.
- unsupported: statements in the rebuild that are not in the original (invented or changed facts). Be strict: a changed number or name counts.
- verdict: faithful (coverage >= 90 and nothing unsupported), minor_gaps, or major_gaps (coverage < 70 or any changed fact).
Content marked "[transcribed from an image on the original]" comes from pictures: check it against the screenshot if there is one; without a screenshot, do not judge it. Links to the original's linked files (listed) are supported.`;

// Image blocks carry a marker so the checker knows they were transcribed from a picture, not from the page text.
const MAX_PAGES = Number(process.env.VERIFY_MAX_PAGES) || 10;

const rebuiltText = (p: SitePage) => [`# ${p.title}`, p.summary, p.hero.heading !== p.title ? p.hero.heading : "", p.hero.subheading, pageText({ ...p, blocks: p.blocks.map((b) => (b.type === "image" ? { ...b, heading: `[transcribed from an image on the original] ${b.heading}` } : b)) })].filter(Boolean).join("\n\n");

export async function verifySite(jobDir: string, site: SiteModel, onPage: (slug: string, c: Check) => void = () => {}): Promise<VerifyFile> {
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  const byUrl = new Map(crawl.pages.map((p) => [p.url, p]));
  // The homepage, then the pages with the most content (where a lost or changed fact matters most), up to VERIFY_MAX_PAGES.
  const size = (p: SitePage) => pageText(p).length;
  const pages = site.pages.filter((p) => !p.document && byUrl.has(p.source_url))
    .sort((a, b) => Number(b.slug === "home") - Number(a.slug === "home") || size(b) - size(a))
    .slice(0, MAX_PAGES);
  const results = await pmap(pages, 3, async (p) => {
    const orig = byUrl.get(p.source_url)!;
    const shotFile = join(jobDir, orig.screenshotFile);
    const shot = existsSync(shotFile) ? await toDataUrl(shotFile, 3200, 60) : null;
    const files = orig.attachments.map((a) => decodeURIComponent(a.split("/").pop() ?? a)).slice(0, 40).join(", ");
    const prompt = `ORIGINAL page ${orig.url}\nTitle: ${orig.title}\n${shot ? "Screenshot attached." : "No screenshot available."}\nLinked files: ${files || "none"}\nVisible text:\n${orig.text.slice(0, 8000)}\n\n---\nREBUILT page:\n${rebuiltText(p).slice(0, 8000)}`;
    try {
      const c = await cached(jobDir, ["verify-v2", MUSE, p.slug, prompt.length, !!shot], async () => {
        const r = await meta.responses.create({
          model: MUSE, instructions: SYSTEM,
          input: [{ type: "message", role: "user", content: [{ type: "input_text", text: prompt }, ...(shot ? [{ type: "input_image" as const, image_url: shot.dataUrl, detail: "high" as const }] : [])] }],
          text: { format: { type: "json_schema", name: "check", strict: true, schema: strictSchema(Check) } },
          reasoning: { effort: "low" } as never,
        }, { timeout: 120_000 });
        return Check.parse(JSON.parse(r.output_text));
      });
      const clean = { ...c, coverage: Math.max(0, Math.min(100, Math.round(c.coverage))), missing: c.missing.slice(0, 5), unsupported: c.unsupported.slice(0, 5) };
      onPage(p.slug, clean);
      return { slug: p.slug, title: p.title, source_url: p.source_url, ...clean };
    } catch (e) {
      console.warn("[verify]", p.slug, (e as Error).message);
      return null;
    }
  });
  const done = results.filter((r): r is NonNullable<typeof r> => !!r);
  const out: VerifyFile = { generated_at: new Date().toISOString(), pages: done, average: done.length ? Math.round(done.reduce((t, r) => t + r.coverage, 0) / done.length) : 0 };
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/verify.json"), JSON.stringify(out, null, 2));
  return out;
}
