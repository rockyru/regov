import { join } from "node:path";
import { meta, MUSE } from "../lib/meta";
import { PageModel, strictSchema } from "./schema";
import { cached } from "./cache";
import { toDataUrl } from "./images";
import type { CrawledPage } from "./types";

const SYSTEM = `You are migrating a legacy Philippine government website to a modern, citizen-first site that follows the BetterGov.ph standard.
You receive one page: its screenshot, visible text, headings and links. Produce a faithful, well-structured content model.
Rules:
- Preserve ALL substantive content (names, dates, legal citations, addresses, numbers, lists). Do not invent facts. Do not summarize away details.
- Drop site chrome: global navigation, search boxes, "you are here" breadcrumbs, footers, cookie notices, clocks, visitor counters.
- Rewrite only for clarity: plain language, sentence case, short paragraphs. Keep official names and legal text verbatim.
- Text that only exists inside an image (infographics, posters, scanned notices): transcribe what is legible into a block and list it in migration_notes.
- Use the block types well: 'people' for officials/staff, 'contact' for addresses/phones, 'steps' for procedures, 'faq' for Q&A, 'table' for tabular data, 'links' for document/download lists, 'timeline' for dated history.
- hrefs: keep same-site links as site-relative paths (e.g. /about-us/legal-basis), keep files and external links absolute.
- a11y_issues: concrete, e.g. "hero text is an image with no alt", "low-contrast grey links", "no heading hierarchy".`;

export async function understandPage(jobDir: string, page: CrawledPage) {
  const shot = await toDataUrl(join(jobDir, page.screenshotFile));
  const prompt = [
    `URL: ${page.url}`,
    `Title: ${page.title}`,
    page.description && `Meta description: ${page.description}`,
    `Headings: ${page.headings.map((h) => `h${h.level} ${h.text}`).join(" | ").slice(0, 2000)}`,
    `Links on page (same site): ${page.links.slice(0, 80).map((l) => new URL(l).pathname).join(", ")}`,
    `Attachments: ${page.attachments.filter((a) => /\.(pdf|docx?|xlsx?)/i.test(a)).slice(0, 40).join(", ") || "none"}`,
    `\nVisible text:\n${page.text.slice(0, 14000)}`,
  ].filter(Boolean).join("\n");

  return cached(jobDir, ["understand-v1", MUSE, page.url, page.text.length, shot.height], async () => {
    const r = await meta.responses.create({
      model: MUSE,
      instructions: SYSTEM,
      input: [{
        type: "message", role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: shot.dataUrl, detail: "high" },
        ],
      }],
      text: { format: { type: "json_schema", name: "page_model", strict: true, schema: strictSchema(PageModel) } },
      reasoning: { effort: "low" } as never,
    });
    const parsed = PageModel.parse(JSON.parse(r.output_text));
    return { model: parsed, usage: r.usage?.total_tokens ?? 0 };
  });
}
