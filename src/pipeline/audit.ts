/**
 * WCAG audit of a rebuilt site: open every page of the preview through the running app and run
 * axe-core on it. Writes assets/wcag.json for the report. Free (no model calls).
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { axeAudit, type AxeResult } from "./wcag";

export type RebuiltAudit = { generated_at: string; axe_version: string; pages: ({ slug: string; title: string } & AxeResult)[] };

/** Where the app answers from inside the server (the pipeline runs on the same machine). */
export const auditBase = () => process.env.AUDIT_BASE ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;

export async function auditRebuilt(jobDir: string, jobId: string, base = auditBase()): Promise<RebuiltAudit> {
  const site = JSON.parse(await readFile(join(jobDir, "site.json"), "utf8")) as { pages: { slug: string; title: string }[] };
  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"] });
  const out: RebuiltAudit = { generated_at: new Date().toISOString(), axe_version: (createRequire(import.meta.url)("axe-core/package.json") as { version: string }).version, pages: [] };
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    for (const p of site.pages) {
      const url = `${base}/preview/${jobId}${p.slug === "home" ? "" : `/${p.slug}`}`;
      try {
        const res = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
        if (!res || res.status() >= 400) continue;
        out.pages.push({ slug: p.slug, title: p.title, ...(await axeAudit(page)) });
      } catch (e) {
        console.warn(`[audit] ${url}:`, (e as Error).message);
      }
    }
  } finally {
    await browser.close();
  }
  await mkdir(join(jobDir, "assets"), { recursive: true });
  await writeFile(join(jobDir, "assets/wcag.json"), JSON.stringify(out, null, 2));
  return out;
}
