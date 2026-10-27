/**
 * Citizen's Charter PDFs → service pages. Every Philippine office must publish a Citizen's
 * Charter (RA 11032) listing each service's requirements, steps, fees and processing time, and
 * most sites only link it as a PDF. Muse Spark reads each PDF (text or scan) and returns the
 * services as structured data; loadSite turns them into pages. Writes assets/charter.json.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { meta, MUSE } from "../lib/meta";
import { strictSchema } from "./schema";
import { cached, pmap } from "./cache";
import { UA } from "./crawl";
import type { CrawlResult } from "./types";

export const Service = z.object({
  title: z.string().describe("service name as written, e.g. 'Application for New Business Permit'"),
  summary: z.string().describe("one plain-language sentence: what a citizen gets"),
  classification: z.string().describe("Simple, Complex, Highly Technical, or empty"),
  who_may_avail: z.string(),
  requirements: z.array(z.object({ item: z.string(), where_to_secure: z.string() })),
  steps: z.array(z.object({ client_step: z.string(), agency_action: z.string(), fees: z.string(), processing_time: z.string(), person_responsible: z.string() })),
  total_fees: z.string().describe("as written, e.g. 'None' or 'PHP 150.00'; empty if not stated"),
  total_time: z.string().describe("as written, e.g. '1 hour, 30 minutes'; empty if not stated"),
});
export const CharterDoc = z.object({
  office: z.string().describe("the office or department this charter covers, e.g. 'Business Permits and Licensing Office'"),
  services: z.array(Service).describe("every service in the document, in order; empty if this is not a citizen's charter"),
});
export type Service = z.infer<typeof Service>;
export type CharterFile = { generated_at: string; docs: ({ url: string; pages_hint: number } & z.infer<typeof CharterDoc>)[]; skipped: { url: string; reason: string }[] };

const SYSTEM = `You read a Citizen's Charter (or a similar services document) of a Philippine government office, published under the Ease of Doing Business Act (RA 11032).
Extract every external and internal service exactly as written: requirements (and where to secure each), the client steps with the agency action, fees, processing time and person responsible for each step, and the totals.
Copy fees, times, names and legal references verbatim. Never invent or estimate a value; use an empty string when the document does not say.
Summaries are one plain sentence for citizens. If the document is not a services charter, return an empty services list.`;

/** Charters are read most-relevant first; 8 covers the main offices of most LGUs at a fraction of the cost of all of them. */
const MAX_DOCS = Number(process.env.CHARTER_MAX_DOCS) || 8;
const MAX_BYTES = 20 * 1024 * 1024;

/** Linked PDFs that are charters: Citizen's Charter files when the site has any, else files named "charter",
 *  and only as a last resort up to 3 "services"/"requirements" files (those are often benefit checklists, not charters). */
export function charterCandidates(crawl: CrawlResult): string[] {
  const pdfs = [...new Set(crawl.pages.flatMap((p) => p.attachments).filter((a) => /\.pdf(\?|$)/i.test(a)))];
  const name = (u: string) => { try { return decodeURIComponent(u.split("/").pop() ?? u); } catch { return u; } };
  // Newest edition first when a site keeps several years of the same charter.
  const year = (u: string) => Math.max(0, ...(name(u).match(/20\d\d/g) ?? []).map(Number));
  const citizen = pdfs.filter((u) => /citizen.{0,3}s?.{0,3}charter/i.test(name(u))).sort((a, b) => year(b) - year(a));
  if (citizen.length) return citizen.slice(0, MAX_DOCS);
  const charter = pdfs.filter((u) => /charter/i.test(name(u))).sort((a, b) => year(b) - year(a));
  if (charter.length) return charter.slice(0, MAX_DOCS);
  return pdfs.filter((u) => /requirements|services/i.test(name(u))).slice(0, 3);
}

async function download(url: string, archive?: string): Promise<Buffer> {
  const tries = [url, ...(archive ? [`https://web.archive.org/web/${archive}id_/${url}`] : [])];
  let last = "";
  for (const u of tries) {
    try {
      const res = await fetch(u, { headers: { "user-agent": UA }, redirect: "follow", signal: AbortSignal.timeout(60_000) });
      const buf = Buffer.from(await res.arrayBuffer());
      if (!res.ok) { last = `HTTP ${res.status}`; continue; }
      if (buf.subarray(0, 5).toString() !== "%PDF-") { last = "not a PDF"; continue; }
      if (buf.length > MAX_BYTES) { last = "larger than 20 MB"; continue; }
      return buf;
    } catch (e) { last = (e as Error).message; }
  }
  throw new Error(last || "download failed");
}

export async function readCharters(jobDir: string, onDoc: (url: string, services: number) => void = () => {}): Promise<CharterFile> {
  const crawl = JSON.parse(await readFile(join(jobDir, "crawl.json"), "utf8")) as CrawlResult;
  const out: CharterFile = { generated_at: new Date().toISOString(), docs: [], skipped: [] };
  await pmap(charterCandidates(crawl), 3, async (url) => {
    try {
      const pdf = await download(url, crawl.archive?.timestamp);
      const hash = createHash("sha1").update(pdf).digest("hex").slice(0, 16);
      await mkdir(join(jobDir, "docs"), { recursive: true });
      await writeFile(join(jobDir, "docs", `${hash}.pdf`), pdf);
      const doc = await cached(jobDir, ["charter-v1", MUSE, hash], async () => {
        const r = await meta.responses.create({
          model: MUSE,
          instructions: SYSTEM,
          input: [{ type: "message", role: "user", content: [
            { type: "input_text", text: `Document: ${decodeURIComponent(url.split("/").pop() ?? "")}` },
            { type: "input_file", filename: "charter.pdf", file_data: `data:application/pdf;base64,${pdf.toString("base64")}` } as never,
          ] }],
          text: { format: { type: "json_schema", name: "charter", strict: true, schema: strictSchema(CharterDoc) } },
          reasoning: { effort: "low" } as never,
        }, { timeout: 240_000 });
        return CharterDoc.parse(JSON.parse(r.output_text));
      });
      const services = doc.services.filter((s) => s.title.trim() && (s.steps.length || s.requirements.length));
      if (services.length) out.docs.push({ url, pages_hint: (pdf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? []).length, office: doc.office, services });
      else out.skipped.push({ url, reason: "no services found" });
      onDoc(url, services.length);
    } catch (e) {
      out.skipped.push({ url, reason: (e as Error).message.split("\n")[0].slice(0, 160) });
    }
  });
  out.docs.sort((a, b) => a.office.localeCompare(b.office));
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/charter.json"), JSON.stringify(out, null, 2));
  return out;
}
