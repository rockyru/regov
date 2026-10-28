/**
 * Terms check, before any page is collected: find the site's terms of use (or legal notice,
 * disclaimer, copyright page) from its homepage links and let Muse Spark read it. If the terms
 * forbid automated access, or republishing the content without permission, the run stops.
 * Every fetch here is allowed by the site's robots.txt and sent as REGOVBot.
 */
import { join } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, type Page } from "playwright";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { cached } from "./cache";
import { strictSchema } from "./schema";
import { BLOCKED_TITLE, fromArchive, toArchive } from "./archive";
import { UA, type Robots } from "./robots";

const TERMS = /terms|conditions|legal|disclaimer|copyright|website[-_ ]?polic|acceptable[-_ ]use|data[-_ ]use/i;
const NOT_TERMS = /privacy|cookie/i;

const Verdict = z.object({
  is_terms_page: z.boolean().describe("The text is a terms of use, legal notice, disclaimer or copyright page"),
  prohibits_automated_access: z.boolean(),
  prohibits_reproduction: z.boolean(),
  quote: z.string().describe("The exact sentence that decides it; empty when neither is prohibited"),
  summary: z.string().describe("One plain sentence for the person who asked for the rebuild"),
});

export type TermsResult = {
  checked_at: string;
  source: "live" | "archive";
  /** Pages read, empty when the site links to no terms. */
  urls: string[];
  restricts: boolean;
  reason: "automated_access" | "reproduction" | "none";
  quote: string;
  summary: string;
};

export class TermsError extends Error {
  constructor(public result: TermsResult) {
    super(`This site's terms of use do not allow ${result.reason === "automated_access" ? "automated access" : "republishing its content without permission"}, so RE:GOV will not rebuild it.${result.quote ? ` The terms say: “${result.quote}”` : ""}`);
  }
}

const SYSTEM = `You read the terms of use, legal notice or disclaimer of a Philippine government website for RE:GOV, a non-commercial tool. RE:GOV visits up to 30 public pages at about one request a second as REGOVBot, then publishes a redesigned copy of the content, clearly labelled as an unofficial concept, with a link back to every original page.
Decide, from the text only:
- prohibits_automated_access: true only if it explicitly forbids crawlers, robots, spiders, scrapers, automated means, or data mining or harvesting of the site.
- prohibits_reproduction: true only if it explicitly forbids copying, reproducing, republishing, framing or modifying the site's content without prior permission. A bare "all rights reserved", or a requirement to credit or cite the source, does not count; permission to reproduce with acknowledgement means false.
- quote: the exact sentence that decides it, copied verbatim; empty when neither is prohibited.
- summary: one plain sentence for the person who asked for the rebuild.
If the text is not a terms, legal or disclaimer page at all, set is_terms_page false and both prohibitions false.`;

/** Open a page in a real browser (sites build menus and footers with JavaScript). Throws on bot protection. */
async function open(page: Page, url: string, archiveTimestamp?: string): Promise<void> {
  const res = await page.goto(archiveTimestamp ? toArchive(url, archiveTimestamp) : url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  // Single-page apps answer 404 for routes they render themselves, so judge by content, not status alone.
  const thin = ((await page.evaluate(() => document.body?.innerText ?? "")) as string).trim().length < 300;
  if (!res || BLOCKED_TITLE.test(await page.title()) || (res.status() >= 400 && thin)) throw new Error(`HTTP ${res?.status() ?? "?"} "${(await page.title()).slice(0, 40)}"`);
}

/** Links on the page that look like terms, legal or disclaimer pages, most likely first. */
export function termsLinks(anchors: { text: string; href: string }[], origin: string, archived: boolean): string[] {
  const host = new URL(origin).hostname.replace(/^www\./, "");
  const out: { url: string; score: number }[] = [];
  for (const a of anchors) {
    let u: URL;
    try { u = new URL(archived ? fromArchive(a.href) : a.href); } catch { continue; }
    if (u.hostname.replace(/^www\./, "") !== host || /\.(pdf|docx?)$/i.test(u.pathname)) continue;
    const hay = `${a.text.replace(/\s+/g, " ").trim()} ${u.pathname}`;
    if (!TERMS.test(hay) || NOT_TERMS.test(hay)) continue;
    u.hash = "";
    out.push({ url: u.toString(), score: /terms|conditions/i.test(hay) ? 0 : /legal|copyright/i.test(hay) ? 1 : 2 });
  }
  return [...new Map(out.sort((a, b) => a.score - b.score).map((x) => [x.url, x])).keys()].slice(0, 2);
}

/**
 * Throws when the homepage cannot be fetched (the caller retries from the archive) and
 * TermsError when the terms restrict what RE:GOV does.
 */
export async function checkTerms(jobDir: string, origin: string, robots: Robots, archiveTimestamp?: string): Promise<TermsResult> {
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"] });
  const texts: string[] = [];
  let urls: string[] = [];
  try {
    const page = await (await browser.newContext({ userAgent: UA, ignoreHTTPSErrors: true })).newPage();
    await open(page, `${origin}/`, archiveTimestamp);
    const anchors = await page.$$eval("a[href]", (els) => els.map((a) => ({ text: (a as HTMLElement).innerText || a.textContent || "", href: (a as HTMLAnchorElement).href })));
    urls = termsLinks(anchors, origin, !!archiveTimestamp).filter((u) => robots.allows(u));
    for (const u of urls) {
      try {
        await open(page, u, archiveTimestamp);
        const text = await page.evaluate(() => { document.querySelectorAll("script, style, noscript, nav, header, footer").forEach((e) => e.remove()); return ((document.querySelector("main") as HTMLElement | null)?.innerText || document.body.innerText || "").replace(/\s+/g, " ").trim(); });
        texts.push(`${u}\n${text.slice(0, 12_000)}`);
      } catch { /* unreachable terms page: judged on the others */ }
    }
  } finally {
    await browser.close();
  }
  const base = { checked_at: new Date().toISOString(), source: archiveTimestamp ? "archive" as const : "live" as const, urls };
  let result: TermsResult = { ...base, restricts: false, reason: "none", quote: "", summary: urls.length ? "The site's terms page could not be read." : "The site links to no terms of use." };
  if (texts.length) {
    const v = await cached(jobDir, ["terms-v1", MUSE, texts], async () => {
      const r = await meta.responses.create({
        model: MUSE, instructions: SYSTEM, input: texts.join("\n\n---\n\n"),
        text: { format: { type: "json_schema", name: "terms_verdict", strict: true, schema: strictSchema(Verdict) } },
        reasoning: { effort: "low" } as never,
      } as never);
      return Verdict.parse(JSON.parse((r as unknown as { output_text: string }).output_text));
    });
    const reason = v.prohibits_automated_access ? "automated_access" : v.prohibits_reproduction ? "reproduction" : "none";
    result = { ...base, restricts: reason !== "none", reason, quote: v.quote.trim(), summary: v.is_terms_page ? v.summary : "The linked page is not a terms of use page." };
  }
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/terms.json"), JSON.stringify(result, null, 2));
  if (result.restricts) throw new TermsError(result);
  return result;
}
