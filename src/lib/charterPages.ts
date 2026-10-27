/** Citizen's Charter services (assets/charter.json, from src/pipeline/charter.ts) as pages of the rebuilt site. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SiteModel, SitePage } from "@/pipeline/schema";
import type { CharterFile, Service } from "@/pipeline/charter";

export const CHARTER_SLUG = "charter";
const SMALL = new Set("a an and as at by for from in into of on or the to with per".split(" "));

/** "ISSUANCE OF BIRTH CERTIFICATE (PSA)" → "Issuance of birth certificate (PSA)"; mixed-case text is left alone. */
export function unshout(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  const letters = t.replace(/[^A-Za-z]/g, "");
  if (!letters || letters.replace(/[^A-Z]/g, "").length / letters.length < 0.7) return t;
  return t.split(" ").map((w, i) => {
    const bare = w.replace(/[^A-Za-z]/g, "");
    if (/\d/.test(w) || (bare.length > 1 && bare.length <= 4 && !SMALL.has(bare.toLowerCase()))) return w; // codes and acronyms
    const lower = w.toLowerCase();
    return i === 0 ? lower.replace(/[a-z]/, (c) => c.toUpperCase()) : lower;
  }).join(" ");
}

const slugify = (s: string, max = 60) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, max).replace(/-$/, "") || "service";
const cell = (s: string) => s.replace(/\|/g, "/").replace(/\s*\n\s*/g, " ").replace(/^[-•]\s*/, "").trim() || "–";
const step = (s: string) => unshout(s.replace(/^\s*(step\s*)?\d+(\.\d+)*[.:)]?\s*/i, "").trim());

function servicePage(slug: string, office: string, s: Service, url: string): SitePage {
  const title = unshout(s.title);
  const facts = [["Office", office], ["Classification", s.classification], ["Who may apply", s.who_may_avail], ["Total fees", s.total_fees], ["Total processing time", s.total_time]].filter(([, v]) => v.trim());
  const blocks: SitePage["blocks"] = [
    { type: "callout", heading: "At a glance", body_markdown: facts.map(([k, v]) => `- **${k}:** ${v.replace(/\s*\n\s*/g, " ")}`).join("\n"), items: [] },
  ];
  if (s.requirements.length) blocks.push({ type: "table", heading: "Requirements", items: [], body_markdown: `| Requirement | Where to get it |\n| --- | --- |\n${s.requirements.map((r) => `| ${cell(r.item)} | ${cell(r.where_to_secure)} |`).join("\n")}` });
  // A client step often spans several office actions: name it once, on its first row.
  const rows = s.steps.map((x, i) => {
    const mine = step(x.client_step), prev = i ? step(s.steps[i - 1].client_step) : "";
    const who = x.person_responsible.trim() ? ` *(${cell(x.person_responsible)})*` : "";
    return `| ${mine && mine !== prev ? cell(mine) : " "} | ${cell(step(x.agency_action))}${who} | ${cell(x.fees)} | ${cell(x.processing_time)} |`;
  });
  if (s.steps.length) blocks.push({ type: "table", heading: "Steps", items: [], body_markdown: `| What you do | What the office does | Fee | Time |\n| --- | --- | --- | --- |\n${rows.join("\n")}` });
  blocks.push({ type: "links", heading: "Source", body_markdown: "Read from the office's Citizen's Charter by Muse Spark. Fees and steps change: check the PDF and the office before you go.", items: [{ title: `Citizen's Charter: ${office}`, description: "", href: url, meta: "" }] });
  return {
    slug, title, page_type: "service", summary: s.summary, section: "Citizen's Charter",
    hero: { heading: title, subheading: s.summary, primary_cta_label: "", primary_cta_href: "" },
    blocks, language: "en", a11y_issues: [], migration_notes: [], source_url: url, source_screenshot: "", document: url,
  };
}

/** Add the charter's services, a hub page, a navigation link and a homepage section. Returns the site unchanged without a charter. */
export async function withCharter(site: SiteModel, jobDir: string): Promise<SiteModel> {
  let file: CharterFile;
  try { file = JSON.parse(await readFile(join(jobDir, "assets/charter.json"), "utf8")); } catch { return site; }
  // Offices with the services people come for most (permits, certificates, registry) first.
  const common = /permit|certificat|clearance|licen|registr|birth|marriage|business|tax|id\b|assistance/i;
  const weight = (d: CharterFile["docs"][number]) => d.services.filter((s) => common.test(s.title)).length;
  const docs = file.docs.filter((d) => d.services.length).sort((a, b) => weight(b) - weight(a) || b.services.length - a.services.length);
  if (!docs.length || site.pages.some((p) => p.slug === CHARTER_SLUG)) return site;
  const used = new Set(site.pages.map((p) => p.slug));
  const pages: SitePage[] = [];
  const groups: SitePage["blocks"] = [];
  for (const d of docs) {
    const office = unshout(d.office);
    const items: SitePage["blocks"][number]["items"] = [];
    for (const s of d.services) {
      let slug = `${CHARTER_SLUG}/${slugify(office, 40)}/${slugify(unshout(s.title))}`;
      for (let n = 2; used.has(slug); n++) slug = slug.replace(/(-\d+)?$/, `-${n}`);
      used.add(slug);
      const p = servicePage(slug, office, s, d.url);
      pages.push(p);
      items.push({ title: p.title, description: s.summary, href: `/${slug}`, meta: [s.classification, s.total_time].filter((x) => x.trim()).join(" · ") });
    }
    groups.push({ type: "cards", heading: office, body_markdown: "", items });
  }
  const summary = `${pages.length} services from ${docs.length} ${docs.length === 1 ? "office" : "offices"}: requirements, steps, fees and processing time, read from the Citizen's Charter documents.`;
  const hub: SitePage = {
    slug: CHARTER_SLUG, title: "Services and requirements", page_type: "service", summary, section: "Citizen's Charter",
    hero: { heading: "Services and requirements", subheading: summary, primary_cta_label: "", primary_cta_href: "" },
    blocks: groups, language: "en", a11y_issues: [], migration_notes: [], source_url: docs[0].url, source_screenshot: "", document: docs[0].url,
  };
  // Surface it: under the services section of the menu, and first on the homepage's curated sections.
  const nav = structuredClone(site.nav);
  const home = nav.find((n) => /service/i.test(`${n.label} ${n.slug}`)) ?? nav.find((n) => n.slug !== "home" && n.children.length);
  home?.children.unshift({ label: "Services and requirements", slug: CHARTER_SLUG, group: home.children[0]?.group ?? "" });
  const featured = [...pages].sort((a, b) => Number(common.test(b.title)) - Number(common.test(a.title))).slice(0, 5).map((p) => p.slug);
  return {
    ...site,
    nav,
    pages: [...site.pages, hub, ...pages],
    home_sections: [{ heading: "Services and requirements", description: `From the Citizen's Charter: what to bring, what to pay and how long it takes, for ${pages.length} services.`, slugs: [CHARTER_SLUG, ...featured] }, ...site.home_sections],
  };
}
