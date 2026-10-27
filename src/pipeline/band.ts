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

const STYLE = `Extremely wide 10:1 panoramic strip illustration for a website header (think a long mural). Flat, modern editorial vector style, clean shapes, soft gradients, gentle lighting. Palette: deep blue #0038a8, red #ce1226, yellow #fcd116, white, with natural greens. One continuous scene across the full width with NO hard vertical boundaries, panels, frames or borders. The composition gets calmer and simpler toward the left: open sky, distant landscape, soft atmospheric haze; the detailed subject sits in the right two thirds. No text, no letters, no logos, no seals, no signage. Patriotic Filipino mood: the Philippine flag flying somewhere in the scene, flag colours echoed in bunting or clothing, soft sun rays in the sky. Calm, dignified, civic, hopeful.`;

const COVER_STYLE = `4:3 landscape cover illustration. Flat, modern editorial vector style, clean shapes, soft gradients. Palette: deep blue #0038a8, red #ce1226, yellow #fcd116, white, natural greens. A single well-composed scene with a clear focal point in the centre. No text, no letters, no logos, no seals, no signage. Patriotic Filipino mood: a Philippine flag in the scene, flag colours echoed in details. Calm, dignified, civic, hopeful.`;

export async function makeBand(jobDir: string, plan: SitePlan, pageSummaries: string[]) {
  const brief = await cached(jobDir, ["band-brief-v2", MUSE, plan.agency.name, plan.site_kind, plan.agency.description], async () => {
    const r = await meta.responses.create({
      model: MUSE,
      instructions: "You write one-paragraph art briefs for illustrators of Philippine civic scenes. Be concrete, visual and ACCURATE to this specific institution and place: use what you know about the real town, province, region, campus or agency (its actual geography, coast or mountains, well-known landmarks, main crops and livelihoods, campus buildings, the real work of the mandate). Name at least two recognisable local or institutional details; never generic filler that could be any town. Patriotic and proud: a Philippine flag flying on a pole, red-white-blue-yellow accents, morning light. Diverse Filipinos going about public life. Never include text, logos, seals or names in the picture. 70-100 words. Output only the brief.",
      input: `Government body: ${plan.agency.name} (${plan.site_kind.replace(/_/g, " ")}${plan.locality?.city ? `, ${plan.locality.city}` : ""}${plan.locality?.province ? `, ${plan.locality.province}` : ""}${plan.locality?.region ? `, ${plan.locality.region}` : ""}).\nMandate: ${plan.agency.description}\nTagline: ${plan.agency.tagline}\nWhat the site is about: ${pageSummaries.slice(0, 12).join(" | ").slice(0, 1500)}\nNamed places, units and programs found on the site: ${plan.entities.filter((e) => ["campus", "facility", "unit", "barangay", "program"].includes(e.type)).slice(0, 20).map((e) => e.name).join(", ") || "none"}\n\nDescribe a header illustration that captures this body's identity and the people it serves. For a town or province, show its landscape, livelihood and landmarks; for a university or school, students, campus life and learning; for a hospital, care and healing; for an agency, the people and work of its mandate.`,
      reasoning: { effort: "low" } as never,
    });
    return r.output_text.trim();
  });

  const img = await cached(jobDir, ["band-image-v4", MUSE_IMAGE, brief], async () => {
    const r = await meta.images.generate({ model: MUSE_IMAGE, prompt: `${STYLE}\n\nScene: ${brief}`, n: 1, size: "2560x256", output_format: "jpeg" } as never);
    const d = (r as { data: { b64_json?: string }[] }).data[0];
    if (!d?.b64_json) throw new Error("Muse Image returned no image");
    return { b64: d.b64_json };
  });

  await mkdir(join(jobDir, "assets"), { recursive: true });
  const buf = Buffer.from(img.b64, "base64");
  const meta_ = await sharp(buf).metadata();
  await writeFile(join(jobDir, "assets/band.jpg"), await sharp(buf).resize({ width: 2880, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer());

  // Dedicated 4:3 cover for cards and social previews, same scene, composed for the format.
  let cover = "";
  try {
    const c = await cached(jobDir, ["cover-image-v2", MUSE_IMAGE, brief], async () => {
      const r = await meta.images.generate({ model: MUSE_IMAGE, prompt: `${COVER_STYLE}\n\nScene: ${brief}`, n: 1, size: "1024x768", output_format: "jpeg" } as never);
      const d = (r as { data: { b64_json?: string }[] }).data[0];
      if (!d?.b64_json) throw new Error("no cover");
      return { b64: d.b64_json };
    });
    await writeFile(join(jobDir, "assets/cover.jpg"), await sharp(Buffer.from(c.b64, "base64")).resize({ width: 1200, withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer());
    cover = "assets/cover.jpg";
  } catch (e) {
    console.warn("[band] cover skipped:", (e as Error).message);
  }
  return { band: "assets/band.jpg", cover, brief, width: meta_.width ?? 0, height: meta_.height ?? 0 };
}
