/**
 * "Ask this site": Muse Spark answers a visitor's question from the rebuilt site's own pages only,
 * citing the pages it used. Answers are cached per question and site version.
 */
import { join } from "node:path";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema, type SiteModel } from "./schema";
import { cached } from "./cache";
import { withUsage } from "../lib/usage";
import { JOBS_ROOT } from "../lib/jobs";
import { pageText, searchSite } from "../lib/siteSearch";

const SYSTEM = `You answer residents' questions using ONLY the pages of one Philippine government website that are given to you.
- Answer in the language of the question (English or Filipino). Plain words, at most 120 words. Use a short numbered list for steps or requirements.
- Use only facts present in the pages. Never invent requirements, fees, office hours, names, phone numbers or deadlines. If the pages do not answer the question, set found=false and say briefly what the site does cover or which office to contact, if a page names one.
- sources: the slugs of the pages you actually used, most relevant first (max 3). Only slugs from the given pages.
- This is an unofficial concept site: never say you are the agency or that anything is official. No legal or medical advice.`;

const Answer = z.object({ found: z.boolean(), answer_markdown: z.string(), sources: z.array(z.string()) });
export type Answer = z.infer<typeof Answer>;
const SCHEMA = strictSchema(Answer);

/** Questions answered by the model (cache misses) per process per day, and per visitor per 10 minutes. */
const DAILY_MAX = Number(process.env.ASK_DAILY_MAX) || 300;
const PER_IP = Number(process.env.ASK_RATE_LIMIT) || 8;
let spent = { day: "", n: 0 };
const hits = new Map<string, number[]>();
export class AskLimitError extends Error { constructor(public reason: "daily" | "visitor") { super(reason); } }

function admit(ip: string) {
  const day = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  if (spent.day !== day) spent = { day, n: 0 };
  if (spent.n >= DAILY_MAX) throw new AskLimitError("daily");
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000);
  if (recent.length >= PER_IP) throw new AskLimitError("visitor");
  hits.set(ip, [...recent, now]);
  if (hits.size > 5000) hits.clear();
  spent.n++;
}

export const normalizeQuestion = (q: string) => q.replace(/\s+/g, " ").trim().slice(0, 200);

export async function askSite(site: SiteModel, question: string, ip: string): Promise<Answer & { usage: number }> {
  const q = normalizeQuestion(question);
  const top = searchSite(site, q, 5);
  // Every page's title and summary (so a question worded differently still finds its page), plus the full text of the best matches.
  const index = site.pages.map((p) => `- ${p.slug}: ${p.title} — ${p.summary}`).join("\n").slice(0, 9000);
  const full = top.map((h) => `### ${h.page.slug}: ${h.page.title}\n${pageText(h.page).slice(0, 3500)}`).join("\n\n");
  const hotlines = (site.entities ?? []).filter((e) => e.type === "hotline").map((e) => `- ${e.name}: ${e.detail}`).join("\n");
  const prompt = `Site: ${site.agency.name} (${new URL(site.origin).host})\n\nAll pages:\n${index}\n- hotlines: Emergency hotlines (national 911 and the numbers below)\n\nHotlines published on the site:\n${hotlines || "none"}\n\nFull text of the most relevant pages:\n${full || "(no keyword matches)"}\n\nQuestion: ${q}`;
  const out = await cached(join(JOBS_ROOT, site.jobId), ["ask-v2", MUSE, site.generated_at, q.toLowerCase()], async () => {
    admit(ip);
    const r = await withUsage(join(JOBS_ROOT, site.jobId), "on_demand", "ask", () => meta.responses.create({
      model: MUSE,
      instructions: SYSTEM,
      input: prompt,
      text: { format: { type: "json_schema", name: "answer", strict: true, schema: SCHEMA } },
      reasoning: { effort: "low" } as never,
    }, { timeout: 60_000 }));
    return { ...Answer.parse(JSON.parse(r.output_text)), usage: r.usage?.total_tokens ?? 0 };
  });
  const valid = new Set([...site.pages.map((p) => p.slug), "hotlines"]);
  return { ...out, sources: out.sources.filter((s) => valid.has(s)).slice(0, 3) };
}
