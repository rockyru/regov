/**
 * Art direction for refined sites: Muse Spark composes a product-grade homepage hero from the
 * site's own words and figures (ethereal gradient style), and Muse Image paints the backdrop.
 * The spec is stored on site.design.art and rendered by AuroraMasthead.
 */
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { z } from "zod";
import { meta, MUSE, MUSE_IMAGE } from "../lib/meta";
import { cached } from "./cache";
import { strictSchema, type SiteModel } from "./schema";

const Art = z.object({
  headline: z.array(z.object({ text: z.string(), indent: z.number().describe("0 = starts at the left margin, 1 = steps in to the middle") }))
    .describe("Exactly 3 lines staggered 1,0,1, each AT MOST 11 characters including spaces (e.g. ALL GOV'T / SERVICES / ONE APP). Reuse the site's own promise, abbreviating if needed. The first word of the 0 line is set in white"),
  lede: z.string().describe("At most 10 words, plain and concrete"),
  stat: z.object({ value: z.string(), label: z.string().describe("1-2 words") }).describe("The most impressive figure stated on the site, e.g. 900M+ / Transactions"),
  card: z.object({
    title: z.string().describe("Label of the card's figure, 1-3 words"),
    value: z.string().describe("A second figure stated on the site, different from stat"),
    shifts: z.array(z.object({ from: z.string(), to: z.string() })).describe("Exactly 3 before/after pairs the service brings, each side one short word or abbreviation of at most 8 characters, e.g. Queue/Online, Paper/Digital, Office/24-7"),
    note: z.string().describe("Reassurance true to the site, at most 5 words"),
  }),
  feature: z.object({ title: z.string().describe("Two short lines' worth, at most 6 words, inviting"), slug: z.string().describe("One of the given page slugs") }),
  round_cta: z.object({ label: z.string().describe("2 words, e.g. Learn more"), slug: z.string().describe("One of the given page slugs") }),
  corner_cta: z.object({ label: z.string().describe("2 words in the site's voice, e.g. Download app"), slug: z.string() }),
  palette: z.object({ canvas: z.string(), haze: z.string(), deep: z.string(), accent: z.string(), ink: z.string() })
    .describe("#rrggbb in the site's own app/brand theme. deep: the brand colour; canvas: a very pale tint of it for the page (e.g. #f4f7ff); haze: a light tint for chips and glows (e.g. #dfe8ff); accent: the second colour of the logo or brand, used only for small dots; ink: near-black text tinted toward the brand"),
  art_prompt: z.string().describe("60-90 words for an image model: the backdrop picture"),
});
export type ArtDirection = z.infer<typeof Art> & { image: string };

const SYSTEM = `You are an art director turning a modern Philippine government digital service's homepage into a product-grade landing page.
Visual language (follow it closely): a calm, luminous page in the site's own app theme: a very pale tint of the brand colour as the canvas, white, and the brand colour itself, never unrelated pastels. Softly lit frosted-glass 3D icons float in the left third of the hero. The headline is enormous, regular weight, tight tracking, ALL CAPS, broken into staggered lines that step in and out, in a gradient of the brand colour, one word knocked out in white. Thin hairline grid rules with small dots at their crossings. A big white circular "learn more" style button. Two frosted cards at the lower right: one with a figure-led data panel, one feature card with a photo of the product in hand. A short lede at lower left and one huge stat with a small label.
Rules: use only words and figures that appear in the content given. Never invent numbers. Never say "official". Slugs must come from the list given.
For art_prompt describe ONLY the backdrop, plainly about THIS service, with NO people, NO phone or device and NO flag: a premium 3D render of 5-6 frosted-glass icons of what the service does (e.g. for a government app: ID card, document, health cross, briefcase, house, shield), floating at gentle angles in a loose cluster in the left third of the frame, softly lit, some slightly out of focus for depth. The rest of the frame is an empty, seamless, very pale tint of the brand colour with a faint glow of the brand colour behind the icons. Clean studio lighting, soft shadows, professional, minimal. No text, no letters, no logos.`;

export async function artDirect(jobDir: string, site: SiteModel, opts: { keepImage?: boolean } = {}): Promise<{ art: ArtDirection; usage: number }> {
  const home = site.pages.find((p) => p.slug === "home");
  const slugs = site.pages.filter((p) => !p.slug.includes("/")).map((p) => `${p.slug}: ${p.title}`).join("\n");
  const text = [
    `Name: ${site.agency.name} (${site.agency.parent})`, `Tagline: ${site.agency.tagline}`, `About: ${site.agency.description}`,
    `Brand colour: ${site.design?.primary ?? "#0038a8"}`,
    home && `Hero: ${home.hero.heading} / ${home.hero.subheading} / CTA ${home.hero.primary_cta_label}`,
    `Popular services: ${site.popular_services.map((s) => `${s.title} (${s.slug}): ${s.description}`).join("; ")}`,
    home && `Homepage sections: ${home.blocks.map((b) => `${b.heading}: ${b.body_markdown.slice(0, 200)} ${b.items.slice(0, 6).map((i) => `${i.title} ${i.description}`).join(" | ").slice(0, 400)}`).join("\n")}`,
    `Page slugs:\n${slugs}`,
  ].filter(Boolean).join("\n").slice(0, 9000);

  const { art, usage } = await cached(jobDir, ["art-direct-v5", MUSE, text], async () => {
    const r = await meta.responses.create({
      model: MUSE, instructions: SYSTEM,
      input: text,
      text: { format: { type: "json_schema", name: "art_direction", strict: true, schema: strictSchema(Art) } },
      reasoning: { effort: "medium" } as never,
    } as never);
    const res = r as unknown as { output_text: string; usage?: { total_tokens?: number } };
    return { art: Art.parse(JSON.parse(res.output_text)), usage: res.usage?.total_tokens ?? 0 };
  });

  const p = art.palette;
  if (opts.keepImage && site.design?.art?.image) return { art: { ...art, image: site.design.art.image }, usage };
  const img = await cached(jobDir, ["art-image-v5", MUSE_IMAGE, art.art_prompt], async () => {
    const r = await meta.images.generate({
      model: MUSE_IMAGE, n: 1, size: "1536x1024", output_format: "jpeg",
      prompt: `${art.art_prompt}\n\nColours: brand ${p.deep}, pale background ${p.canvas}, light tint ${p.haze}, white. Professional 3D render, soft depth of field. Only the glass icons: no people, no phone, no device, no flag, no text.`,
    } as never);
    const d = (r as { data: { b64_json?: string }[] }).data[0];
    if (!d?.b64_json) throw new Error("Muse Image returned no image");
    return { b64: d.b64_json };
  });
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/art.jpg"), await sharp(Buffer.from(img.b64, "base64")).resize({ width: 2400, withoutEnlargement: true }).jpeg({ quality: 84 }).toBuffer());
  return { art: { ...art, image: "assets/art.jpg" }, usage };
}
