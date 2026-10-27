/**
 * Design check: Muse Spark looks at the old homepage and decides whether RE:GOV replaces its look
 * (redesign, the default) or keeps its identity and upgrades it (refine, for sites that are
 * already modern). For refine it also returns the brand colour and the hero image to reuse.
 */
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { cached } from "./cache";
import { strictSchema } from "./schema";
import { toDataUrl } from "./images";

const Verdict = z.object({
  modern_score: z.number().describe("0-10. 8+ only for a polished, current product-grade site"),
  mode: z.enum(["redesign", "refine"]),
  reason: z.string().describe("One sentence on why"),
  primary: z.string().describe("Dominant brand colour as #rrggbb"),
  hero: z.object({
    found: z.boolean(),
    left: z.number(), top: z.number(), right: z.number(), bottom: z.number(),
  }).describe("Main hero photo or illustration, WITHOUT the headline text, in 0-1000 normalised coordinates of the screenshot"),
});
export type Design = { mode: "redesign" | "refine"; score: number; reason: string; primary: string; hero?: string };

const SYSTEM = `You are a senior visual designer judging the first screen of a Philippine government website.
RE:GOV rebuilds such sites on its own design: flat and editorial, a white identity header with the seal, a blue navigation bar, a dark navy masthead with ruled lists, and an illustrated banner.
Choose one mode:
- "redesign" (the usual case): the site looks dated or generic (cluttered portal, tables, small or low-contrast text, image sliders, default WordPress/Joomla themes, mixed fonts), OR it already uses the standard Philippine government portal layout (GOVPH bar, seal and name header, menu bar, slider). Our design is the upgrade.
- "refine": the site is genuinely modern and polished, at the level of a well-funded recent product site: confident typography, generous whitespace, a cohesive brand palette, high-quality custom photography or illustration, a clear hero with calls to action. Replacing it with our template would be a downgrade, so we keep its identity and improve it.
Be strict: most government sites are "redesign". "refine" needs modern_score 8 or more.
Also give the primary brand colour as a hex code (the main non-neutral colour of buttons, links or logo) and the bounding box of the hero photo or illustration without the headline text, in 0-1000 normalised coordinates (0,0 top left; 1000,1000 bottom right); found=false when there is none.`;

export async function assessDesign(jobDir: string, viewportShot: string): Promise<{ design: Design; usage: number }> {
  const file = join(jobDir, viewportShot);
  const shot = await toDataUrl(file, 1200);
  const { verdict, usage } = await cached(jobDir, ["assess-v2", MUSE, viewportShot], async () => {
    const r = await meta.responses.create({
      model: MUSE,
      instructions: SYSTEM,
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "Judge this homepage." }, { type: "input_image", image_url: shot.dataUrl, detail: "high" }] }],
      text: { format: { type: "json_schema", name: "design_verdict", strict: true, schema: strictSchema(Verdict) } },
      reasoning: { effort: "low" } as never,
    } as never);
    const res = r as unknown as { output_text: string; usage?: { total_tokens?: number } };
    return { verdict: Verdict.parse(JSON.parse(res.output_text)), usage: res.usage?.total_tokens ?? 0 };
  });

  const primary = /^#[0-9a-f]{6}$/i.test(verdict.primary) ? verdict.primary.toLowerCase() : "#0038a8";
  const refine = verdict.mode === "refine" && verdict.modern_score >= 8;
  const design: Design = { mode: refine ? "refine" : "redesign", score: verdict.modern_score, reason: verdict.reason, primary };
  // Reuse their hero art when the box is big enough to be a picture rather than a stray icon.
  const h = verdict.hero;
  if (refine && h.found && h.right - h.left >= 200 && h.bottom - h.top >= 250) {
    const { width: W = 1280, height: H = 900 } = await sharp(file).metadata();
    const x = (v: number) => Math.round((Math.min(1000, Math.max(0, v)) / 1000) * W), y = (v: number) => Math.round((Math.min(1000, Math.max(0, v)) / 1000) * H);
    const left = Math.min(W - 1, x(h.left)), top = Math.min(H - 1, y(h.top));
    await mkdir(join(jobDir, "assets"), { recursive: true });
    await sharp(file).extract({ left, top, width: Math.max(1, Math.min(W - left, x(h.right) - left)), height: Math.max(1, Math.min(H - top, y(h.bottom) - top)) }).jpeg({ quality: 85 }).toFile(join(jobDir, "assets/hero-original.jpg"));
    design.hero = "assets/hero-original.jpg";
  }
  return { design, usage };
}
