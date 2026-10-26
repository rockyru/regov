import { meta, MUSE } from "../lib/meta";
import { SitePlan, strictSchema, type SitePage } from "./schema";
import { cached } from "./cache";
import type { CrawlResult } from "./types";

const SYSTEM = `You are the information architect for a Philippine government website being rebuilt on the BetterGov.ph standard.
First classify the site (site_kind), then build the information architecture for ITS audience:
- Local government (province, city/municipality, barangay): residents. Services (permits, civil registry, business, social welfare, health), Government (officials, Sangguniang, departments), Barangays, Tourism & culture, Transparency (budget, bids, citizen's charter), News. Hotlines matter.
- University, college, school: students and applicants first. Admissions, Academics (colleges, programs), Student life & services, Research & extension, Campuses, About & administration. Programs and colleges are entities.
- Hospital, health facility: patients and visitors. Patient services, Doctors & departments, Appointments & admission, Visiting info, Careers, About. Facilities and units are entities.
- National agency, bureau, attached agency, regional office, research institute: its mandate. Services, Programs, Issuances & laws, Offices, Transparency, About.
- Government corporation (GOCC): customers/members. Products & services, Members/customers, Transparency, Corporate.
- Constitutional body, legislature, judiciary: the public record. Decisions/issuances, Proceedings, Services, Offices, About.
- Embassy/consulate: Filipinos abroad and visa applicants. Consular services, Visas, Appointments, Advisories, About.
Extract "entities" from the pages (officials, hotlines, barangays, programs, campuses, units, service windows, facilities) - never invent names, numbers or programs.
Navigation rules (strict):
- Home plus 4-6 top-level sections, 1-2 word labels (e.g. Services, Cooperatives, News, Laws, Offices, About). Child labels are descriptive, 2-4 words (e.g. "Memorandum circulars", "Board of Directors"), never one vague word.
- Each section has at most 9 children. When children are many, assign each a short "group" (column heading) so the dropdown reads as 2-3 columns of 3-5 links.
- Repetitive series (regional news, yearly reports, numbered issuances) NEVER go in nav one by one: put ONE child that links to their hub page, and list the series under "hubs" with that hub slug.
- Every page slug must appear exactly once: in nav (top level or child) or in a hub's slugs. Only use slugs that exist.
- popular_services and home_sections must reference existing slugs. Write for citizens, not bureaucrats.
Agency identity must come from the pages (name, address, email, phone); never invent contact details - leave empty strings if unknown.`;

export async function planSite(jobDir: string, crawl: CrawlResult, pages: SitePage[]) {
  const home = crawl.pages[0];
  const oldNav = home?.navLinks.map((l) => new URL(l).pathname).join(", ") ?? "";
  const listing = pages.map((p) => `- slug: ${p.slug} | ${p.page_type} | section: ${p.section} | ${p.title} — ${p.summary}`).join("\n");
  const contact = pages.flatMap((p) => p.blocks.filter((b) => b.type === "contact")).map((b) => b.body_markdown + " " + b.items.map((i) => `${i.title}: ${i.description} ${i.meta}`).join("; ")).join("\n").slice(0, 2000);
  const prompt = `Site: ${crawl.origin}\nOld navigation order: ${oldNav}\n\nPages (${pages.length}):\n${listing}\n\nContact details found:\n${contact || "none"}\n\nValid slugs: ${pages.map((p) => p.slug).join(", ")}`;

  return cached(jobDir, ["plan-v5", MUSE, prompt], async () => {
    const r = await meta.responses.create({
      model: MUSE,
      instructions: SYSTEM,
      input: prompt,
      text: { format: { type: "json_schema", name: "site_plan", strict: true, schema: strictSchema(SitePlan) } },
      reasoning: { effort: "medium" } as never,
    });
    return { plan: SitePlan.parse(JSON.parse(r.output_text)), usage: r.usage?.total_tokens ?? 0 };
  });
}
