/**
 * Identity band: Muse Spark turns the site plan into an art brief, Muse Image
 * paints a wide header illustration in the Kapwa palette. One image per site.
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { meta, MUSE, MUSE_IMAGE } from "../lib/meta";
import { cached } from "./cache";
import type { SitePlan } from "./schema";

const STYLE = `Wide horizontal website header band. Flat, modern editorial illustration, clean vector shapes, soft gradients. Palette: deep blue #0038a8, red #ce1226, yellow #fcd116, white, with greens for landscape. No text, no letters, no logos, no seals, no flags with writing. Calm, dignified, civic, hopeful. Leave the left third as quiet negative space (plain deep blue or sky) for a headline.`;

export async function makeBand(jobDir: string, plan: SitePlan, pageSummaries: string[]) {
  const brief = await cached(jobDir, ["band-brief-v1", MUSE, plan.agency.name, plan.site_kind, plan.agency.description], async () => {
    const r = await meta.responses.create({
      model: MUSE,
      instructions: "You write one-paragraph art briefs for illustrators. Be concrete and visual: people, places, objects, time of day. Never include text, logos or names in the picture. 60-90 words. Output only the brief.",
      input: `Government body: ${plan.agency.name} (${plan.site_kind.replace(/_/g, " ")}${plan.lgu?.province ? `, ${plan.lgu.province}` : ""}${plan.lgu?.region ? `, ${plan.lgu.region}` : ""}).\nMandate: ${plan.agency.description}\nTagline: ${plan.agency.tagline}\nWhat the site is about: ${pageSummaries.slice(0, 12).join(" | ").slice(0, 1500)}\n\nDescribe a header illustration that captures this body's identity and the people it serves. For a town or province, show its landscape, livelihood and landmarks; for an agency, the people and work of its mandate.`,
      reasoning: { effort: "low" } as never,
    });
    return r.output_text.trim();
  });

  const img = await cached(jobDir, ["band-image-v1", MUSE_IMAGE, brief], async () => {
    const r = await meta.images.generate({ model: MUSE_IMAGE, prompt: `${STYLE}\n\nScene: ${brief}`, n: 1, size: "1792x512", output_format: "jpeg" } as never);
    const d = (r as { data: { b64_json?: string }[] }).data[0];
    if (!d?.b64_json) throw new Error("Muse Image returned no image");
    return { b64: d.b64_json };
  });

  await mkdir(join(jobDir, "assets"), { recursive: true });
  const buf = Buffer.from(img.b64, "base64");
  const meta_ = await sharp(buf).metadata();
  await writeFile(join(jobDir, "assets/band.jpg"), await sharp(buf).resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer());
  return { band: "assets/band.jpg", brief, width: meta_.width ?? 0, height: meta_.height ?? 0 };
}
