/**
 * Visual evidence for the report: Muse Spark looks at the old homepage with its accessibility
 * findings and names, for each visible one, the element to outline; SAM 3.1 finds that element
 * on the screenshot. Writes assets/evidence.json (numbered boxes linked to findings).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema, type SiteModel } from "./schema";
import { cached } from "./cache";
import { samBoxes } from "./segment";
import { wcagForFinding } from "./wcag";
import type { CrawlResult } from "./types";

export type Evidence = { n: number; finding: string; label: string; sc: string[]; prompt: string; box: { left: number; top: number; right: number; bottom: number }; confidence: number };
export type EvidenceFile = { generated_at: string; shot: string; width: number; height: number; items: Evidence[] };

const Plan = z.object({ items: z.array(z.object({
  finding: z.number().describe("number of the finding in the list"),
  prompt: z.string().describe("2-5 word noun phrase naming the element as it looks, for a segmentation model: e.g. 'image slider', 'banner with text', 'grey menu links', 'search box'"),
  label: z.string().describe("6-10 words for the report, e.g. 'Event poster: all its text is inside the image'"),
})).describe("only findings whose element is visible in this screenshot; at most 6, most serious first") });

const SYSTEM = `You see the upper part of an old Philippine government homepage and a numbered list of accessibility findings about it.
For each finding whose element you can SEE in this screenshot, name that element in a short noun phrase a segmentation model can find (what it looks like, not why it fails), and write a short label for a report. Skip findings about things not visible here (keyboard focus, page title, code). At most 6.`;

export async function findEvidence(jobDir: string, site: SiteModel): Promise<EvidenceFile | null> {
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  const home = crawl.pages[0], page = site.pages.find((p) => p.slug === "home") ?? site.pages[0];
  if (!home?.viewportShotFile || !page) return null;
  const findings = [...page.a11y_issues, ...(home.axe?.violations ?? []).map((v) => `${v.help} (axe-core, ${v.nodes} elements)`)].slice(0, 20);
  if (!findings.length) return null;
  // The first 2400px of the full-page screenshot when it is on disk (most findings sit below the fold), else the first screen.
  const full = join(jobDir, home.screenshotFile), src = existsSync(full) ? full : join(jobDir, home.viewportShotFile);
  const meta0 = await sharp(src).metadata();
  const width = meta0.width ?? 1280, height = Math.min(meta0.height ?? 900, 2400);
  const img = await sharp(src).extract({ left: 0, top: 0, width, height }).jpeg({ quality: 82 }).toBuffer();
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/evidence.jpg"), img);
  const file = join(jobDir, "assets/evidence.jpg");
  const shot = `data:image/jpeg;base64,${img.toString("base64")}`;
  const key = `${src.endsWith(home.screenshotFile) ? home.screenshotFile : home.viewportShotFile}:${height}`;
  const plan = await cached(jobDir, ["evidence-plan-v1", MUSE, key, findings], async () => {
    const r = await meta.responses.create({
      model: MUSE, instructions: SYSTEM,
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: findings.map((f, i) => `${i + 1}. ${f}`).join("\n") }, { type: "input_image", image_url: shot, detail: "high" }] }],
      text: { format: { type: "json_schema", name: "evidence", strict: true, schema: strictSchema(Plan) } },
      reasoning: { effort: "low" } as never,
    }, { timeout: 90_000 });
    return Plan.parse(JSON.parse(r.output_text));
  });
  const items: Evidence[] = [];
  for (const it of plan.items.slice(0, 6)) {
    const finding = findings[it.finding - 1];
    if (!finding) continue;
    // SAM is sensitive to wording: when the full phrase finds nothing usable, try its head noun phrase ("online payment hero banner" → "hero banner" → "banner").
    const words = it.prompt.toLowerCase().trim().split(/\s+/);
    let best: Awaited<ReturnType<typeof samBoxes>>["boxes"][number] | undefined, used = "";
    for (const prompt of [...new Set([words.join(" "), words.slice(-2).join(" "), words.slice(-1)[0]])]) {
      const boxes = await cached(jobDir, ["evidence-sam-v1", prompt, key], async () => (await samBoxes(jobDir, file, prompt)).boxes).catch(() => []);
      // Most confident box that is not (nearly) the whole screen and does not repeat an earlier one.
      best = boxes.filter((b) => b.confidence >= 0.4 && (b.right - b.left) * (b.bottom - b.top) < width * height * 0.8)
        .filter((b) => !items.some((x) => Math.abs(x.box.left - b.left) < 8 && Math.abs(x.box.top - b.top) < 8))
        .sort((x, y) => y.confidence - x.confidence)[0];
      if (best) { used = prompt; break; }
    }
    if (!best) continue;
    items.push({ n: items.length + 1, finding, label: it.label, sc: wcagForFinding(finding), prompt: used, box: { left: best.left, top: best.top, right: best.right, bottom: best.bottom }, confidence: best.confidence });
  }
  const out: EvidenceFile = { generated_at: new Date().toISOString(), shot: "assets/evidence.jpg", width, height, items };
  await writeFile(join(jobDir, "assets/evidence.json"), JSON.stringify(out, null, 2));
  return out;
}
