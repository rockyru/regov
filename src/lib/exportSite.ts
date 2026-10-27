/**
 * Handoff export: the rebuilt site as static HTML an agency can host anywhere, with its assets,
 * site.json, the old-URL → new-URL redirect map and a README. Pages are rendered by the running
 * app (English) in a headless browser, so streamed content is in place, then scripts are dropped
 * and every link is made relative. Cached per site version.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, posix } from "node:path";
import { JOBS_ROOT, loadSite } from "./jobs";
import { zip } from "./zip";
import { chromium } from "playwright";
import { auditBase } from "@/pipeline/audit";
import type { SiteModel } from "@/pipeline/schema";

const VERSION = "export-v1";
const inflight = new Map<string, Promise<Buffer>>();

export const exportName = (site: SiteModel) => `${new URL(site.origin).host.replace(/^www\./, "")}-regov-concept.zip`;

export async function exportSite(jobId: string): Promise<{ site: SiteModel; zip: Buffer } | null> {
  const site = await loadSite(jobId);
  if (!site) return null;
  const key = createHash("sha1").update(`${VERSION}|${site.generated_at}`).digest("hex").slice(0, 12);
  const file = join(JOBS_ROOT, jobId, "export", `${key}.zip`);
  const hit = await readFile(file).catch(() => null);
  if (hit) return { site, zip: hit };
  let run = inflight.get(file);
  if (!run) {
    run = build(site).then(async (buf) => { await mkdir(join(JOBS_ROOT, jobId, "export"), { recursive: true }); await writeFile(file, buf); return buf; }).finally(() => inflight.delete(file));
    inflight.set(file, run);
  }
  return { site, zip: await run };
}

async function build(site: SiteModel): Promise<Buffer> {
  const base = auditBase(), pub = process.env.PUBLIC_ORIGIN ?? "https://regov.app";
  const root = `/preview/${site.jobId}`;
  const files = new Map<string, Buffer>();
  const want = new Set<string>(); // root-absolute app paths to copy (stylesheets, images)
  const outPath = (slug: string) => (slug === "home" ? "index.html" : `${slug}/index.html`);
  const slugs = ["home", ...site.pages.map((p) => p.slug).filter((s) => s !== "home"), "hotlines", "public-projects"];

  const browser = await chromium.launch({ args: ["--disable-dev-shm-usage", "--disable-gpu", "--no-zygote"] });
  const tab = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
  for (const slug of slugs) {
    const res = await tab.goto(`${base}${root}${slug === "home" ? "" : `/${slug}`}?lang=en`, { waitUntil: "load", timeout: 60_000 }).catch(() => null);
    if (!res?.ok()) continue;
    await tab.waitForFunction(() => !document.querySelector("[hidden][id^='S:']"), null, { timeout: 30_000 }).catch(() => {});
    const up = "../".repeat(slug === "home" ? 0 : slug.split("/").length) || "./";
    const local = (abs: string) => {
      const [path, hash = ""] = abs.split("#");
      const clean = path.split("?")[0];
      if (clean === root || clean === `${root}/`) return `${up}index.html${hash ? `#${hash}` : ""}`;
      if (clean.startsWith(`${root}/`)) {
        const s = clean.slice(root.length + 1);
        return s === "search" ? `${pub}${abs}` : `${up}${s}/index.html${hash ? `#${hash}` : ""}`;
      }
      if (clean.startsWith(`/api/jobs/${site.jobId}/`)) { const f = clean.slice(`/api/jobs/${site.jobId}/`.length); want.add(clean); return `${up}${f}`; }
      if (/^\/(_next\/static|brand)\//.test(clean) || /^\/(icon\.svg|apple-icon\.png)$/.test(clean)) { want.add(clean); return `${up}${clean.slice(1)}`; }
      return `${pub}${abs}`; // RE:GOV pages (report, home) stay on regov.app
    };
    let html = "<!DOCTYPE html>\n" + (await tab.evaluate(() => document.documentElement.outerHTML));
    html = html
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<link[^>]+as="(script|font)"[^>]*>/gi, "")
      .replace(/<span[^>]*text-white\/70[^>]*>\|<\/span>\s*<a[^>]+href="\/api\/lang[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "") // the language switch needs the app
      .replace(/<form role="search"[\s\S]*?<\/form>/gi, "") // search and Ask need the app too
      .replace(/(href|src|action)="(\/(?!\/)[^"]*)"/g, (_m, attr, abs) => `${attr}="${local(abs.replace(/&amp;/g, "&"))}"`)
      .replace(/<template\b[^>]*><\/template>/gi, "")
      .replace(/<next-route-announcer[\s\S]*?<\/next-route-announcer>/gi, "");
    files.set(outPath(slug), Buffer.from(html));
  }
  } finally {
    await browser.close();
  }

  // Stylesheets, then the fonts and images they point at (relative to the stylesheet).
  for (const abs of [...want]) {
    const res = await fetch(`${base}${abs}`);
    if (!res.ok) continue;
    const out = abs.startsWith(`/api/jobs/${site.jobId}/`) ? abs.slice(`/api/jobs/${site.jobId}/`.length) : abs.slice(1);
    const buf = Buffer.from(await res.arrayBuffer());
    files.set(out, buf);
    if (out.endsWith(".css")) for (const m of buf.toString("utf8").matchAll(/url\(([^)"']+|"[^"]+"|'[^']+')\)/g)) {
      const ref = m[1].replace(/^["']|["']$/g, "");
      if (/^(data:|https?:|#)/.test(ref)) continue;
      const dep = posix.normalize(posix.join(posix.dirname(out), ref.split("?")[0]));
      if (files.has(dep)) continue;
      const r = await fetch(`${base}/${dep}`);
      if (r.ok) files.set(dep, Buffer.from(await r.arrayBuffer()));
    }
  }

  // Old address → new page, for the agency's web server when it switches over.
  const rows: [string, string][] = [];
  for (const p of site.pages) {
    try { const u = new URL(p.source_url); const from = (u.pathname + u.search).replace(/^\/web\/\d+(id_)?\/https?:\/\/[^/]+/, "") || "/"; rows.push([from, p.slug === "home" ? "/" : `/${p.slug}/`]); } catch { /* not a URL */ }
  }
  for (const r of site.redirects ?? []) if (r.from && r.to) rows.push([r.from, r.to === "home" ? "/" : `/${r.to.replace(/^\//, "")}/`.replace(/\/\/$/, "/")]);
  const redirects = [...new Map(rows.filter(([f, t]) => f.replace(/\/+$/, "") !== t.replace(/\/+$/, "")).map((r) => [r[0], r])).values()];
  files.set("_redirects", Buffer.from(redirects.map(([f, t]) => `${f} ${t} 301`).join("\n") + "\n"));
  files.set("redirects.csv", Buffer.from("old_path,new_path\n" + redirects.map(([f, t]) => `"${f.replace(/"/g, '""')}","${t}"`).join("\n") + "\n"));
  files.set("site.json", Buffer.from(JSON.stringify(site, null, 2)));
  files.set("README.md", Buffer.from(readme(site, files.size, redirects.length, pub)));

  return zip([...files].sort(([a], [b]) => (a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b))).map(([name, data]) => ({ name, data })));
}

function readme(site: SiteModel, count: number, redirects: number, pub: string) {
  const host = new URL(site.origin).host;
  return `# ${site.agency.name}: RE:GOV concept export

**Unofficial, AI-generated concept.** This is a reimagining of ${site.origin} produced by RE:GOV
(${pub}) for demonstration. It is not operated by, endorsed by, or affiliated with
${site.agency.name} or any government body. Content was migrated automatically and may be
incomplete or out of date; every page needs review by the agency before any of it is published.

Generated ${site.generated_at.slice(0, 10)} · ${site.pages.length} pages · migration report: ${pub}/report/${site.jobId}

## What is inside

| Path | What it is |
| --- | --- |
| \`index.html\`, \`<page>/index.html\` | Every rebuilt page as static HTML (no JavaScript needed) |
| \`_next/static/\`, \`assets/\`, \`brand/\` | Stylesheets, fonts, the seal and header artwork |
| \`site.json\` | The structured content model: pages, blocks, navigation, contacts. Import it into any CMS. |
| \`_redirects\` | ${redirects} old ${host} addresses mapped to their new pages (Cloudflare Pages / Netlify format) |
| \`redirects.csv\` | The same map as a spreadsheet, for Apache, Nginx or IIS rules |

## Host it

Any static host works: upload the folder to Cloudflare Pages, Netlify, GitHub Pages, an S3
bucket or a plain web server. Open \`index.html\` locally to review it first.

## Not included in the static copy

- Search and "Ask this site" (they need the RE:GOV server)
- The Filipino edition and the language switch
- The phone menu drawer ("More"); every section is still reachable from the page links and footer

## Before publishing

1. Check every item in the migration report's "Items for human review".
2. Replace the "Unofficial concept" bar and footer notice only once the agency owns and has approved the content.
3. Have the pages tested with a keyboard and a screen reader (automated WCAG checks catch about a third of issues).

Files in this export: ${count + 1}.
`;
}
