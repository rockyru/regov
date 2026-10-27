/**
 * Real photos of officials. SAM 3.1 finds portrait photos on the crawled pages that list people;
 * Muse Spark reads each photo with the caption around it, names the person from the page's own
 * list (or rejects it) and writes the alt text. Writes assets/people/*.jpg and assets/portraits.json.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema, type SiteModel } from "./schema";
import { cached, pmap } from "./cache";
import { samBoxes, type Box } from "./segment";
import type { CrawlResult } from "./types";
import { personKey } from "../lib/people";

export type Portrait = { name: string; file: string; alt: string; page: string };
export type PortraitFile = { generated_at: string; people: Portrait[]; checked: number };

const PROMPT = "portrait photo of a person";
const TILE = 1800, OVERLAP = 300, MAX_H = 6000, MAX_PAGES = 8;

const Match = z.object({ name: z.string().describe("exactly one of the candidate names, or empty if the caption does not name one of them or this is not a single person's portrait"), alt: z.string().describe("alt text: who it is and their position, e.g. 'Hon. Alfredo B. Castro Jr., Municipal Vice Mayor, in a barong'") });
const SYSTEM = `You see a photo cropped from a Philippine government web page, with the text printed around it (caption, name, position).
Decide which person from the candidate list this photo shows, using ONLY the name printed next to or under the photo. If no candidate's name is printed with it, if it shows several people, or if it is not a photo of a person, return an empty name. Never guess from the face.
Alt text: short, factual, name and position as printed, plus one visible detail at most. Never describe the face or appearance beyond attire.`;

export { personKey };

const iou = (a: Box, b: Box) => {
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)), y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const i = x * y, u = (a.right - a.left) * (a.bottom - a.top) + (b.right - b.left) * (b.bottom - b.top) - i;
  return u ? i / u : 0;
};

/** Portrait boxes on one full-page screenshot, in page coordinates (tiles keep SAM at full resolution). */
async function findPhotos(jobDir: string, shot: string): Promise<Box[]> {
  const file = join(jobDir, shot);
  const { width = 1280, height = 0 } = await sharp(file).metadata();
  const h = Math.min(height, MAX_H), out: Box[] = [];
  for (let top = 0; top < h; top += TILE - OVERLAP) {
    const th = Math.min(TILE, h - top);
    if (th < 200) break;
    const boxes = await cached(jobDir, ["portrait-sam-v1", PROMPT, shot, top, th], async () => {
      const buf = await sharp(file).extract({ left: 0, top, width, height: th }).png().toBuffer();
      return (await samBoxes(jobDir, `data:image/png;base64,${buf.toString("base64")}`, PROMPT)).boxes;
    });
    for (const b of boxes) {
      const w = b.right - b.left, bh = b.bottom - b.top, page = { ...b, top: b.top + top, bottom: b.bottom + top };
      if (b.confidence < 0.6 || w < 80 || bh < 80 || bh / w < 0.75 || bh / w > 2) continue;
      if (!out.some((o) => iou(o, page) > 0.5)) out.push(page);
    }
    if (top + th >= h) break;
  }
  return out;
}

/** The fixed header of the old site can leave a thin bar across a full-page screenshot: paint those rows from their neighbours. */
function mendSeams(px: Buffer, w: number, h: number) {
  const row = (y: number) => px.subarray(y * w * 3, (y + 1) * w * 3);
  // One colour across the row (2% slack for anti-aliasing at the photo's edges).
  const flat = (y: number) => { const r = row(y); let off = 0; for (let i = 3; i < r.length; i += 3) if (Math.abs(r[i] - r[0]) + Math.abs(r[i + 1] - r[1]) + Math.abs(r[i + 2] - r[2]) > 24) off++; return off < w * 0.02; };
  for (let y = 1; y < h - 1; y++) {
    if (!flat(y)) continue;
    let end = y; while (end < h - 1 && end - y < 6 && flat(end + 1)) end++;
    if (end - y >= 6 || y === 0 || end >= h - 1) { y = end; continue; }
    const above = row(y - 1), below = row(end + 1);
    for (let k = y; k <= end; k++) { const t = (k - y + 1) / (end - y + 2), r = row(k); for (let i = 0; i < r.length; i++) r[i] = Math.round(above[i] * (1 - t) + below[i] * t); }
    y = end;
  }
}

export async function findPortraits(jobDir: string, site: SiteModel): Promise<PortraitFile> {
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  const shotOf = new Map(crawl.pages.map((p) => [p.url, p.screenshotFile]));
  const officials = (site.entities ?? []).filter((e) => e.type === "official");
  const pages = site.pages.filter((p) => p.slug === "home" || p.blocks.some((b) => b.type === "people") || officials.some((o) => o.slug === p.slug))
    .filter((p) => shotOf.get(p.source_url) && existsSync(join(jobDir, shotOf.get(p.source_url)!)))
    .sort((a, b) => b.blocks.filter((x) => x.type === "people").length - a.blocks.filter((x) => x.type === "people").length)
    .slice(0, MAX_PAGES);
  const out: PortraitFile = { generated_at: new Date().toISOString(), people: [], checked: 0 };
  const taken = new Set<string>();
  await mkdir(join(jobDir, "assets/people"), { recursive: true });
  for (const page of pages) {
    const shot = shotOf.get(page.source_url)!, file = join(jobDir, shot);
    const names = [...new Set([...page.blocks.filter((b) => b.type === "people").flatMap((b) => b.items.map((i) => i.title)), ...officials.map((o) => o.name)].filter((n) => n.trim()))];
    if (!names.length) continue;
    const { width = 1280, height = 0 } = await sharp(file).metadata();
    const photos = (await findPhotos(jobDir, shot).catch((e) => { console.warn("[portraits] sam:", (e as Error).message); return [] as Box[]; })).slice(0, 24);
    out.checked += photos.length;
    await pmap(photos, 3, async (b) => {
      // The photo plus its caption: a little above, more below, some room at the sides.
      const left = Math.max(0, Math.floor(b.left - 60)), top = Math.max(0, Math.floor(b.top - 60));
      const ctx = { left, top, width: Math.min(width - left, Math.ceil(b.right - b.left + 120)), height: Math.min(height - top, Math.ceil(b.bottom - b.top + 300)) };
      const img = await sharp(file).extract(ctx).jpeg({ quality: 80 }).toBuffer();
      const m = await cached(jobDir, ["portrait-match-v1", MUSE, shot, Math.round(b.left), Math.round(b.top), names], async () => {
        const r = await meta.responses.create({
          model: MUSE, instructions: SYSTEM,
          input: [{ type: "message", role: "user", content: [{ type: "input_text", text: `Candidates:\n${names.map((n) => `- ${n}`).join("\n")}` }, { type: "input_image", image_url: `data:image/jpeg;base64,${img.toString("base64")}`, detail: "high" }] }],
          text: { format: { type: "json_schema", name: "portrait", strict: true, schema: strictSchema(Match) } },
          reasoning: { effort: "low" } as never,
        }, { timeout: 90_000 });
        return Match.parse(JSON.parse(r.output_text));
      });
      const name = names.find((n) => personKey(n) === personKey(m.name));
      if (!name || taken.has(personKey(name))) return;
      taken.add(personKey(name));
      // Square crop around the photo, faces sit in the upper part of a portrait.
      const w = b.right - b.left, h = b.bottom - b.top, side = Math.min(w, h);
      const sx = Math.max(0, Math.round(b.left + (w - side) / 2)), sy = Math.max(0, Math.round(b.top + (h - side) * 0.2));
      const s = Math.min(side, width - sx, height - sy);
      const raw = await sharp(file).extract({ left: sx, top: sy, width: Math.floor(s), height: Math.floor(s) }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      mendSeams(raw.data, raw.info.width, raw.info.height);
      const rel = `assets/people/${personKey(name).replace(/ /g, "-").slice(0, 60)}.jpg`;
      await sharp(raw.data, { raw: { width: raw.info.width, height: raw.info.height, channels: 3 } }).resize(320, 320).jpeg({ quality: 82 }).toFile(join(jobDir, rel));
      out.people.push({ name, file: rel, alt: m.alt, page: page.slug });
    });
  }
  await writeFile(join(jobDir, "assets/portraits.json"), JSON.stringify(out, null, 2));
  return out;
}
