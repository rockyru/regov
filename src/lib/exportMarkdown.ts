/**
 * Content export: every page as a Markdown file with YAML front matter, ready for any static site
 * generator (Astro, Hugo, Eleventy, Jekyll) or CMS importer, plus site.json and the redirect map.
 * Unlike the static HTML export it needs no browser, so it is built on request.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT, loadSite } from "./jobs";
import { redirectMap, redirectsCsv } from "./exportSite";
import { zip } from "./zip";
import { SITE_MODEL_VERSION, type SiteModel, type SitePage } from "@/pipeline/schema";

/** JSON strings are valid YAML double-quoted scalars. */
const yaml = (o: Record<string, unknown>) => Object.entries(o).filter(([, v]) => v !== "" && v !== undefined).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join("\n");

export function pageMarkdown(site: SiteModel, p: SitePage): string {
  const front = yaml({
    title: p.title, slug: p.slug, page_type: p.page_type, section: p.section, summary: p.summary,
    hero_heading: p.hero.heading, hero_subheading: p.hero.subheading,
    cta_label: p.hero.primary_cta_label, cta_href: p.hero.primary_cta_href,
    source_url: p.source_url, language: p.language,
    reviewed_at: site.reviewed?.[p.slug],
    unofficial_concept: true,
  });
  const body: string[] = [];
  for (const b of p.blocks) {
    if (b.heading) body.push(`## ${b.heading}`);
    if (b.body_markdown.trim()) body.push(b.body_markdown.trim());
    if (b.items.length) {
      const numbered = b.type === "steps" || b.type === "timeline";
      body.push(b.items.map((it, i) => {
        const title = it.href ? `[${it.title || it.href}](${it.href})` : it.title;
        const head = [title && `**${title}**`, it.meta && (b.type === "timeline" ? it.meta : `(${it.meta})`)].filter(Boolean).join(" ");
        return `${numbered ? `${i + 1}.` : "-"} ${[head, it.description].filter(Boolean).join(": ")}`;
      }).join("\n"));
    }
  }
  return `---\n${front}\n---\n\n${body.join("\n\n")}\n`;
}

export function markdownFiles(site: SiteModel): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const p of site.pages) files.set(`content/${p.slug === "home" ? "index" : p.slug}.md`, Buffer.from(pageMarkdown(site, p)));
  const redirects = redirectMap(site);
  files.set("redirects.csv", Buffer.from(redirectsCsv(redirects)));
  const { portraits: _p, lang: _l, ...stored } = site;
  void _p; void _l;
  files.set("site.json", Buffer.from(JSON.stringify({ $schema: `https://regov.app/schema/site-model.v${SITE_MODEL_VERSION}.json`, ...stored }, null, 2)));
  files.set("README.md", Buffer.from(`# ${site.agency.name}: RE:GOV content export

**Unofficial, AI-generated concept.** The content of ${site.origin}, restructured by RE:GOV. It is
not operated by, endorsed by, or affiliated with ${site.agency.name} or any government body. It
may be incomplete or out of date; the agency must review every page before any of it is published.

| Path | What it is |
| --- | --- |
| \`content/*.md\` | One Markdown file per page. Front matter carries the title, summary, hero and the original address. |
| \`assets/\` | The seal and header artwork |
| \`site.json\` | Navigation, people, hotlines, footer and every page as typed blocks (schema: https://regov.app/schema/site-model.v${SITE_MODEL_VERSION}.json) |
| \`redirects.csv\` | ${redirects.length} old addresses mapped to their new pages |

Navigation, officials and hotlines live in \`site.json\`, not in the Markdown, so a theme can render them its own way.
${site.reviewed ? `\n${Object.keys(site.reviewed).length} of ${site.pages.length} pages were marked as checked against the original by a person.\n` : ""}`));
  return files;
}

export async function exportMarkdown(jobId: string): Promise<{ site: SiteModel; zip: Buffer } | null> {
  const site = await loadSite(jobId);
  if (!site) return null;
  const files = markdownFiles(site);
  for (const f of [site.assets.logo, site.assets.band, site.assets.cover]) {
    if (!f || !/^assets\/[\w.-]+$/.test(f)) continue;
    const buf = await readFile(join(JOBS_ROOT, jobId, f)).catch(() => null);
    if (buf) files.set(f, buf);
  }
  return { site, zip: zip([...files].sort(([a], [b]) => (a === "README.md" ? -1 : b === "README.md" ? 1 : a.localeCompare(b))).map(([name, data]) => ({ name, data }))) };
}
