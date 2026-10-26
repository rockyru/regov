/**
 * SAM 3.1 over the homepage: region map for the UI overlay, and a clean logo
 * cut-out (mask → alpha) reused as the new site's brand mark.
 */
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { parseImageStream, recordsOfKind, decodeMaskToRaster } from "@meta-sam/parser";
import { meta, SAM } from "../lib/meta";
import { cached } from "./cache";
import { pngDataUrl } from "./images";

export interface Box { prompt: string; objectId: string; left: number; top: number; right: number; bottom: number; confidence: number }
export const REGION_PROMPTS = ["logo", "search box", "map", "infographic", "photograph"];

async function samBoxes(jobDir: string, file: string, prompt: string) {
  const dataUrl = await pngDataUrl(file);
  const stream = await meta.responses.create({
    model: SAM,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: prompt }, { type: "input_image", image_url: dataUrl, detail: "auto" }] }],
    stream: true,
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
  });
  const result = await parseImageStream(stream as never).finalResult;
  const boxes = recordsOfKind(result.records, "box") as unknown as (Omit<Box, "prompt"> & { confidence?: number })[];
  const masks = recordsOfKind(result.records, "mask") as unknown[];
  return { boxes: boxes.map((b) => ({ prompt, objectId: String(b.objectId), left: b.left, top: b.top, right: b.right, bottom: b.bottom, confidence: b.confidence ?? 0 })), masks, result };
}

export async function segmentHome(jobDir: string, viewportShot: string) {
  const file = join(jobDir, viewportShot);
  const all: Box[] = [];
  let logoMasks: { masks: unknown[]; boxes: Box[] } | null = null;
  for (const prompt of REGION_PROMPTS) {
    const { boxes, masks } = await cached(jobDir, ["sam-v1", prompt, viewportShot], async () => {
      const r = await samBoxes(jobDir, file, prompt);
      return { boxes: r.boxes, masks: r.masks };
    });
    all.push(...boxes);
    if (prompt === "logo") logoMasks = { masks, boxes };
  }
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/segments.json"), JSON.stringify(all, null, 2));

  // Logo: biggest confident box in the top 35% of the viewport, prefer left half.
  const img = sharp(file);
  const { width = 1280, height = 900 } = await img.metadata();
  const cands = (logoMasks?.boxes ?? []).filter((b) => b.top < height * 0.35 && b.confidence > 0.5);
  cands.sort((a, b) => ((b.right - b.left) * (b.bottom - b.top)) * (b.left < width / 2 ? 1.5 : 1) - ((a.right - a.left) * (a.bottom - a.top)) * (a.left < width / 2 ? 1.5 : 1));
  const logo = cands[0];
  if (!logo) return { segments: all, logo: "", logo_box: [] as number[] };

  const pad = 6;
  const left = Math.max(0, Math.floor(logo.left - pad)), top = Math.max(0, Math.floor(logo.top - pad));
  const w = Math.min(width - left, Math.ceil(logo.right - logo.left + pad * 2)), h = Math.min(height - top, Math.ceil(logo.bottom - logo.top + pad * 2));
  let out = sharp(file).extract({ left, top, width: w, height: h }).png();
  try {
    type MaskRec = { objectId: string; mask: { width: number; height: number; encoding: string; payload: string }; bounds: { left: number; top: number; right: number; bottom: number } };
    const rec = (logoMasks!.masks as MaskRec[]).find((m) => String(m.objectId) === logo.objectId);
    if (rec) {
      const raster = decodeMaskToRaster(rec.mask as never); // row-major 0/1, rec.mask.width × rec.mask.height
      const mw = rec.mask.width, mh = rec.mask.height;
      // The raster either spans the whole image or just the record bounds; map crop pixels accordingly.
      const full = mw === width && mh === height;
      const bx = rec.bounds.left, by = rec.bounds.top, bw = Math.max(1, rec.bounds.right - rec.bounds.left), bh = Math.max(1, rec.bounds.bottom - rec.bounds.top);
      const alpha = Buffer.alloc(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const sx = left + x, sy = top + y;
        let mx: number, my: number;
        if (full) { mx = sx; my = sy; } else { mx = Math.floor((sx - bx) / bw * mw); my = Math.floor((sy - by) / bh * mh); }
        alpha[y * w + x] = mx >= 0 && my >= 0 && mx < mw && my < mh && raster[my * mw + mx] ? 255 : 0;
      }
      // blur() widens to 3 channels unless forced back to greyscale raw; keep it one channel.
      let soft = await sharp(alpha, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).toColourspace("b-w").raw().toBuffer();
      if (soft.length !== w * h) soft = alpha;
      const rgb = await sharp(file).extract({ left, top, width: w, height: h }).removeAlpha().raw().toBuffer();
      out = sharp(rgb, { raw: { width: w, height: h, channels: 3 } }).joinChannel(soft, { raw: { width: w, height: h, channels: 1 } }).png();
    }
  } catch (e) {
    console.warn("[segment] mask alpha failed, using plain crop:", (e as Error).message);
  }
  await out.toFile(join(jobDir, "assets/logo.png"));
  return { segments: all, logo: "assets/logo.png", logo_box: [left, top, w, h] };
}
