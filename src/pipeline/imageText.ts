/**
 * Text that lives inside images on the old homepage (banners, posters, infographics, scanned notices):
 * Muse Spark spots each one and names it as it looks, SAM 3.1 finds it on the screenshot, and the
 * full-resolution crop goes back to Muse Spark with the page so it can transcribe what a scaled-down
 * screenshot would blur. Writes assets/regions.json and assets/regions/<n>.jpg.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema } from "./schema";
import { cached } from "./cache";
import { samBoxes } from "./segment";
import type { CrawlResult } from "./types";

export const REGION_KINDS = ["banner", "poster", "infographic", "notice", "map", "other"] as const;
export type Region = {
  n: number; kind: (typeof REGION_KINDS)[number]; label: string; prompt: string; confidence: number;
  box: { left: number; top: number; right: number; bottom: number }; file: string;
  /** Filled after the homepage is rebuilt: what Muse Spark read in the crop and where it went. */
  read?: { text_found: boolean; block_heading: string; summary: string };
};
export type RegionsFile = { generated_at: string; shot: string; width: number; height: number; spotted: number; regions: Region[] };

const Spot = z.object({ items: z.array(z.object({
  kind: z.enum(REGION_KINDS),
  prompt: z.string().describe("2-5 word noun phrase naming the image as it looks, for a segmentation model: e.g. 'blue banner with seal', 'event poster', 'chart'"),
  label: z.string().describe("6-10 words for a report, e.g. 'Mayor's banner: name and title only in the image'"),
})).describe("images whose words or figures exist only inside the image; at most 5, most informative first") });

const SYSTEM = `You see the upper part of an old Philippine government homepage. List the images that carry information as text or figures inside the picture: banners or slides with words, event posters, infographics, scanned notices, maps with labels. Skip photos without words, logos and seals on their own, icons, and buttons. For each, name it in a short noun phrase a segmentation model can find (what it looks like), and write a short label for a report. At most 5.`;

const MAX_HEIGHT = 2400;

export async function findImageText(jobDir: string, crawl: CrawlResult): Promise<RegionsFile | null> {
  const home = crawl.pages[0];
  if (!home) return null;
  const full = join(jobDir, home.screenshotFile), src = existsSync(full) ? full : join(jobDir, home.viewportShotFile);
  const m = await sharp(src).metadata();
  const width = m.width ?? 1280, height = Math.min(m.height ?? 900, MAX_HEIGHT);
  const img = await sharp(src).extract({ left: 0, top: 0, width, height }).jpeg({ quality: 82 }).toBuffer();
  await mkdir(join(jobDir, "assets/regions"), { recursive: true });
  const file = join(jobDir, "assets/regions.jpg");
  await writeFile(file, img);
  const key = `${home.url}:${src.endsWith(home.screenshotFile) ? home.screenshotFile : home.viewportShotFile}:${height}`;
  const spot = await cached(jobDir, ["regions-spot-v1", MUSE, key], async () => {
    const r = await meta.responses.create({
      model: MUSE, instructions: SYSTEM,
      input: [{ type: "message", role: "user", content: [{ type: "input_image", image_url: `data:image/jpeg;base64,${img.toString("base64")}`, detail: "high" }] }],
      text: { format: { type: "json_schema", name: "image_text", strict: true, schema: strictSchema(Spot) } },
      reasoning: { effort: "low" } as never,
    }, { timeout: 90_000 });
    return Spot.parse(JSON.parse(r.output_text));
  });
  // Each spotted image is looked up in parallel; overlaps are dropped afterwards, most informative first.
  const found = await Promise.all(spot.items.slice(0, 5).map(async (it) => {
    // SAM is sensitive to wording: fall back from the full phrase to its last two words, then its head noun.
    const words = it.prompt.toLowerCase().trim().split(/\s+/);
    for (const prompt of [...new Set([words.join(" "), words.slice(-2).join(" "), words.slice(-1)[0]])]) {
      const boxes = await cached(jobDir, ["regions-sam-v1", prompt, key], async () => (await samBoxes(jobDir, file, prompt)).boxes).catch(() => []);
      // Big enough to hold words and not (nearly) the whole page.
      const best = boxes.filter((b) => b.confidence >= 0.4 && b.right - b.left >= 120 && b.bottom - b.top >= 60 && (b.right - b.left) * (b.bottom - b.top) < width * height * 0.6)
        .sort((x, y) => y.confidence - x.confidence)[0];
      if (best) return { it, best, used: prompt };
    }
    return null;
  }));
  const regions: Region[] = [];
  for (const f of found) {
    if (!f || regions.some((x) => overlap(x.box, f.best) > 0.5)) continue;
    const { it, best, used } = f;
    const n = regions.length + 1;
    const left = Math.max(0, Math.floor(best.left)), top = Math.max(0, Math.floor(best.top));
    const w = Math.min(width - left, Math.ceil(best.right - left)), h = Math.min(height - top, Math.ceil(best.bottom - top));
    const crop = `assets/regions/${n}.jpg`;
    await sharp(src).extract({ left, top, width: w, height: h }).jpeg({ quality: 88 }).toFile(join(jobDir, crop));
    regions.push({ n, kind: it.kind, label: it.label, prompt: used, confidence: best.confidence, box: { left: best.left, top: best.top, right: best.right, bottom: best.bottom }, file: crop });
  }
  const out: RegionsFile = { generated_at: new Date().toISOString(), shot: "assets/regions.jpg", width, height, spotted: Math.min(5, spot.items.length), regions };
  await writeFile(join(jobDir, "assets/regions.json"), JSON.stringify(out, null, 2));
  return out;
}

/** Intersection over the smaller box. */
function overlap(a: Region["box"], b: Region["box"]) {
  const w = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), h = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return (w * h) / Math.max(1, Math.min((a.right - a.left) * (a.bottom - a.top), (b.right - b.left) * (b.bottom - b.top)));
}

/** Crops as image data URLs for the homepage understand call. */
export async function regionImages(jobDir: string, f: RegionsFile) {
  return Promise.all(f.regions.map(async (r) => ({ ...r, dataUrl: `data:image/jpeg;base64,${(await readFile(join(jobDir, r.file))).toString("base64")}` })));
}

/** Record what Muse Spark read in each crop. */
export async function saveReads(jobDir: string, f: RegionsFile, reads: { region: number; text_found: boolean; block_heading: string; summary: string }[]) {
  for (const r of f.regions) {
    const x = reads.find((y) => y.region === r.n);
    if (x) r.read = { text_found: x.text_found, block_heading: x.block_heading, summary: x.summary };
  }
  await writeFile(join(jobDir, "assets/regions.json"), JSON.stringify(f, null, 2));
}
