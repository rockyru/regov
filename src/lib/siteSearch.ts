/** Keyword search over a rebuilt site's pages: instant, free, and the retrieval step for "Ask this site". */
import type { SiteModel, SitePage } from "@/pipeline/schema";

const STOP = new Set("a an and are as at be by can do does for from get go how i if in is it me my of on or the to what when where which who why will with you your ang ay ba ko kung mga na ng nga ni po sa si ano paano saan kailan sino bakit ako akin namin natin kayo inyo para may mayroon".split(" "));
const words = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").match(/[\p{L}\p{N}]+/gu) ?? [];
export const terms = (q: string) => [...new Set(words(q).filter((w) => w.length > 1 && !STOP.has(w)))];

/** Everything a page says, as plain text. */
export const pageText = (p: SitePage) => p.blocks.map((b) => [b.heading, b.body_markdown, ...b.items.map((it) => [it.title, it.description, it.meta].filter(Boolean).join(" — "))].filter(Boolean).join("\n")).join("\n\n");

export type Hit = { page: SitePage; score: number; snippet: string };

export function searchSite(site: SiteModel, q: string, limit = 8): Hit[] {
  const ts = terms(q);
  if (!ts.length) return [];
  const hits: Hit[] = [];
  for (const page of site.pages) {
    const fields: [string, number][] = [[page.title, 6], [page.summary, 3], [page.blocks.map((b) => b.heading).join(" "), 3], [page.section, 1], [pageText(page), 1]];
    let score = 0, matched = 0;
    for (const t of ts) {
      let s = 0;
      for (const [text, w] of fields) {
        const n = words(text).filter((x) => x === t || (t.length > 3 && x.startsWith(t))).length;
        if (n) s += w * (1 + Math.log(n));
      }
      if (s) { matched++; score += s; }
    }
    if (!matched) continue;
    score *= matched / ts.length; // pages that cover more of the question first
    const body = pageText(page).replace(/[#*_`|>]+/g, " ").replace(/\s+/g, " ");
    const at = ts.map((t) => body.toLowerCase().indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? -1;
    const snippet = at < 0 ? page.summary : (at > 60 ? "…" : "") + body.slice(Math.max(0, at - 60), at + 160).trim() + "…";
    hits.push({ page, score, snippet });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
