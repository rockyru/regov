/**
 * Filipino edition of a rebuilt site. Muse Spark translates the site's own strings (navigation,
 * services, page titles and summaries) and each page's content the first time someone reads it
 * in Filipino; every chunk is cached on disk under jobs/<id>/models, so each is paid for once.
 */
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema, type SiteModel, type SitePage } from "./schema";
import { cached, pmap } from "./cache";
import { createHash } from "node:crypto";

const SYSTEM = `You translate the text of a Philippine government website from English into Filipino for the citizens who use it.
Write clear, polite, everyday Filipino as the Komisyon sa Wikang Filipino and government sites do: address readers as "kayo/inyo", prefer common words over deep Tagalog, and keep English loanwords Filipinos actually use (online, website, permit, email, form, update).
Keep unchanged: names of people; official names of agencies, offices, programs and laws (e.g. "Republic Act No. 11032"); place names; numbers, dates, money, phone numbers, email addresses and URLs; Markdown syntax (tables, links, lists, bold, headings).
If a text is already Filipino, or is only a name, number, code or address, return it unchanged.
Translate meaning, not word by word. Never add, drop or explain content. Never describe the site as official.
You receive a JSON array of {id, text}. Return every id exactly once with its translation.`;

const Out = z.object({ items: z.array(z.object({ id: z.string(), text: z.string() })) });
const SCHEMA = strictSchema(Out);

/** Model calls (cache misses) allowed per process per day: the Filipino edition is free to read, not free to make. */
const DAILY_MAX = Number(process.env.TRANSLATE_DAILY_MAX) || 400;
let spent = { day: "", n: 0 };
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
export class TranslateBudgetError extends Error {}

const inflight = new Map<string, Promise<Record<string, string>>>();

/** Text worth sending: has letters and is not a bare URL, email or phone number. */
const worth = (s: string) => /\p{L}{2}/u.test(s) && !/^\s*(https?:\/\/\S+|\S+@\S+\.\S+|[+\d\s()./-]+)\s*$/.test(s);

async function translateChunk(jobDir: string, chunk: { id: string; text: string }[]): Promise<Record<string, string>> {
  const key = ["fil-v1", MUSE, chunk];
  const id = createHash("sha1").update(JSON.stringify(key)).digest("hex");
  const hit = inflight.get(id);
  if (hit) return hit;
  const run = cached(jobDir, key, async () => {
    if (spent.day !== today()) spent = { day: today(), n: 0 };
    if (spent.n >= DAILY_MAX) throw new TranslateBudgetError("Daily translation budget used");
    spent.n++;
    const r = await meta.responses.create({
      model: MUSE,
      instructions: SYSTEM,
      input: JSON.stringify(chunk),
      text: { format: { type: "json_schema", name: "translation", strict: true, schema: SCHEMA } },
      reasoning: { effort: "low" } as never,
    }, { timeout: 120_000 });
    const out: Record<string, string> = {};
    for (const it of Out.parse(JSON.parse(r.output_text)).items) if (it.text.trim()) out[it.id] = it.text;
    return out;
  }).finally(() => inflight.delete(id));
  inflight.set(id, run);
  return run;
}

/** Translate a list of strings; anything the model skipped stays in English. */
export async function translateStrings(jobDir: string, strings: string[], budget = 5000): Promise<string[]> {
  const unique = [...new Set(strings.filter(worth))];
  const chunks: { id: string; text: string }[][] = [];
  let cur: { id: string; text: string }[] = [], size = 0;
  unique.forEach((text, i) => {
    if (cur.length && size + text.length > budget) { chunks.push(cur); cur = []; size = 0; }
    cur.push({ id: `t${i}`, text }); size += text.length;
  });
  if (cur.length) chunks.push(cur);
  const maps = await pmap(chunks, 4, (c) => translateChunk(jobDir, c));
  const byText = new Map<string, string>();
  chunks.forEach((c, k) => c.forEach((it) => { const t = maps[k][it.id]; if (t) byText.set(it.text, t); }));
  return strings.map((s) => byText.get(s) ?? s);
}

type Ref = [Record<string, unknown>, string];
const refs = (o: Record<string, unknown>, ...keys: string[]): Ref[] => keys.filter((k) => typeof o[k] === "string" && o[k]).map((k) => [o, k] as Ref);

async function apply(jobDir: string, list: Ref[], budget?: number) {
  const out = await translateStrings(jobDir, list.map(([o, k]) => o[k] as string), budget);
  list.forEach(([o, k], i) => { o[k] = out[i]; });
}

/** Site-wide strings: identity line, navigation, services, sections, and every page's title and summary. */
export async function translateSite(jobDir: string, site: SiteModel): Promise<SiteModel> {
  const s = structuredClone(site);
  const list: Ref[] = [
    ...refs(s.agency as never, "tagline", "description", "parent"),
    ...s.nav.flatMap((n) => [...refs(n as never, "label", "description"), ...n.children.flatMap((c) => refs(c as never, "label", "group"))]),
    ...s.popular_services.flatMap((p) => refs(p as never, "title", "description")),
    ...s.home_sections.flatMap((h) => refs(h as never, "heading", "description")),
    ...(s.hubs ?? []).flatMap((h) => refs(h as never, "heading")),
    ...s.footer.quick_links.flatMap((q) => refs(q as never, "label")),
    ...(s.entities ?? []).filter((e) => e.type === "official").flatMap((e) => refs(e as never, "detail")),
    ...s.pages.flatMap((p) => refs(p as never, "title", "summary")),
  ];
  await apply(jobDir, list, 4000);
  return s;
}

/** One page's content: hero, every block heading and body, and every item. */
export async function translatePage(jobDir: string, page: SitePage): Promise<SitePage> {
  const p = structuredClone(page);
  const list: Ref[] = [
    ...refs(p as never, "title", "summary", "section"),
    ...refs(p.hero as never, "heading", "subheading", "primary_cta_label"),
    ...p.blocks.flatMap((b) => [...refs(b as never, "heading", "body_markdown"), ...b.items.flatMap((it) => refs(it as never, "title", "description", "meta"))]),
  ];
  await apply(jobDir, list);
  return p;
}
