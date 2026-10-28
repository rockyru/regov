import { join } from "node:path";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { PageModel, strictSchema } from "./schema";
import { cached } from "./cache";
import { toDataUrl } from "./images";
import type { CrawledPage } from "./types";
import type { Region } from "./imageText";

// Homepage only: one entry per SAM 3.1 crop, saying what was read from it and where it went.
const RegionReads = z.array(z.object({
  region: z.number().describe("region number"),
  text_found: z.boolean().describe("the crop holds words or figures that are not elsewhere in the visible text"),
  block_heading: z.string().describe("heading of the block that now holds its content; empty if none"),
  summary: z.string().describe("what it says, in one short line; empty if nothing"),
}));
const HomeModel = PageModel.extend({ region_reads: RegionReads });

const SYSTEM = `You are migrating a legacy Philippine government website to a modern, citizen-first site that follows the BetterGov.ph standard.
You receive one page: its screenshot, visible text, headings and links. Produce a faithful, well-structured content model.
Rules:
- Preserve ALL substantive content (names, dates, legal citations, addresses, numbers, lists). Do not invent facts. Do not summarize away details.
- Drop site chrome: global navigation, search boxes, "you are here" breadcrumbs, footers, cookie notices, clocks, visitor counters.
- Rewrite only for clarity: plain language, sentence case, short paragraphs. Keep official names and legal text verbatim.
- Text that only exists inside an image (infographics, posters, scanned notices): transcribe what is legible into a block and list it in migration_notes.
- Use the block types well: 'people' for officials/staff, 'contact' for addresses/phones, 'steps' for procedures, 'faq' for Q&A, 'table' for tabular data, 'links' for document/download lists, 'timeline' for dated history.
- hrefs: keep same-site links as site-relative paths (e.g. /about-us/legal-basis), keep files and external links absolute.
- a11y_issues: concrete, and each starts with the WCAG 2.2 success criterion it fails, e.g. "1.1.1 Non-text Content: hero text is an image with no alt", "1.4.3 Contrast (Minimum): low-contrast grey links", "1.3.1 Info and Relationships: no heading hierarchy". Use a criterion only when it really applies; otherwise write "Best practice: ...".`;

/** `regions`: crops of images that hold text on this page (homepage), found by SAM 3.1, read here at full resolution. */
export async function understandPage(jobDir: string, page: CrawledPage, archiveNote = "", regions: (Region & { dataUrl: string })[] = []) {
  const shot = await toDataUrl(join(jobDir, page.screenshotFile));
  const prompt = [
    archiveNote && `NOTE: ${archiveNote} Flag content that is clearly time-sensitive (officials, schedules, fees) in migration_notes.`,
    `URL: ${page.url}`,
    `Title: ${page.title}`,
    page.description && `Meta description: ${page.description}`,
    `Headings: ${page.headings.map((h) => `h${h.level} ${h.text}`).join(" | ").slice(0, 2000)}`,
    `Links on page (same site): ${page.links.slice(0, 80).map((l) => new URL(l).pathname).join(", ")}`,
    `Attachments: ${page.attachments.filter((a) => /\.(pdf|docx?|xlsx?)/i.test(a)).slice(0, 40).join(", ") || "none"}`,
    `\nVisible text:\n${page.text.slice(0, 14000)}`,
    regions.length && `\nImages that hold text: SAM 3.1 located ${regions.length} on this page. After the page screenshot come full-resolution crops of them, in this order:\n${regions.map((r) => `${r.n}. ${r.label} (${r.kind}, at x ${Math.round(r.box.left)}, y ${Math.round(r.box.top)})`).join("\n")}\nRead each crop. Put any fact found only in it (names, dates, fees, hotlines, schedules) into the right block, transcribe its text into a block when it says more than the page does, and fill region_reads for every region. Never describe decoration.`,
  ].filter(Boolean).join("\n");

  const schema = regions.length ? HomeModel : PageModel;
  return cached(jobDir, ["understand-v1", MUSE, page.url, page.text.length, shot.height, archiveNote, ...(regions.length ? [regions.map((r) => [r.n, r.label, r.box])] : [])], async () => {
    const r = await meta.responses.create({
      model: MUSE,
      instructions: SYSTEM,
      input: [{
        type: "message", role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: shot.dataUrl, detail: "high" },
          ...regions.map((x) => ({ type: "input_image" as const, image_url: x.dataUrl, detail: "high" as const })),
        ],
      }],
      text: { format: { type: "json_schema", name: "page_model", strict: true, schema: strictSchema(schema) } },
      reasoning: { effort: "low" } as never,
    });
    const { region_reads: reads = [], ...parsed } = schema.parse(JSON.parse(r.output_text)) as PageModel & { region_reads?: z.infer<typeof RegionReads> };
    return { model: PageModel.parse(parsed), usage: r.usage?.total_tokens ?? 0, reads };
  });
}
