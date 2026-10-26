import { z } from "zod";

// Every field required and no optionals: Meta's strict json_schema mode needs it.
export const BlockItem = z.object({
  title: z.string(),
  description: z.string(),
  href: z.string().describe("link target if any, else empty"),
  meta: z.string().describe("date, position, phone, or other short secondary text; empty if none"),
});

export const Block = z.object({
  type: z.enum(["richtext", "list", "cards", "people", "contact", "faq", "table", "links", "timeline", "image", "callout", "steps"]),
  heading: z.string(),
  body_markdown: z.string().describe("prose for this block in Markdown; for tables, a GFM table; empty if items carry everything"),
  items: z.array(BlockItem),
});

export const PageModel = z.object({
  title: z.string().describe("clean page title without the site name suffix"),
  page_type: z.enum(["home", "about", "service", "news", "contact", "directory", "person", "legal", "faq", "generic"]),
  summary: z.string().describe("1-2 sentence plain-language summary for citizens"),
  section: z.string().describe("top-level section this page belongs to, e.g. About Us, Services"),
  hero: z.object({
    heading: z.string(),
    subheading: z.string(),
    primary_cta_label: z.string(),
    primary_cta_href: z.string(),
  }),
  blocks: z.array(Block).describe("ALL meaningful content of the page in reading order, nothing dropped"),
  language: z.enum(["en", "fil", "mixed"]),
  a11y_issues: z.array(z.string()).describe("accessibility or usability problems visible in the old page"),
  migration_notes: z.array(z.string()).describe("content that is image-only, outdated, broken, or needs a human"),
});
export type PageModel = z.infer<typeof PageModel>;

export const NavItem = z.object({
  label: z.string().describe("descriptive, 2-4 words, e.g. 'Memorandum circulars', 'Board of Directors', 'Chairman's corner'; never a single vague word"),
  slug: z.string().describe("page slug; empty only for a heading-only group"),
  group: z.string().describe("column heading inside the dropdown this link sits under, e.g. 'Register', 'Comply', 'Learn'; empty if the dropdown has no columns"),
});
export const SitePlan = z.object({
  agency: z.object({
    name: z.string(),
    short_name: z.string(),
    tagline: z.string().describe("one line, citizen-facing"),
    description: z.string().describe("2-3 sentences about the agency"),
    parent: z.string().describe("e.g. Republic of the Philippines, or parent department"),
  }),
  nav: z.array(z.object({
    label: z.string().describe("1-2 words, e.g. Services, Offices, Laws, About"),
    slug: z.string().describe("landing page slug for this section, or empty"),
    description: z.string().describe("one line shown in the dropdown explaining what citizens find here"),
    children: z.array(NavItem).describe("max 9; repetitive series (regions, years, issues) collapse into one hub link"),
  })).describe("Home plus 4-6 sections. Services and what citizens come for first; About/legal last"),
  hubs: z.array(z.object({ slug: z.string().describe("hub page slug"), heading: z.string(), slugs: z.array(z.string()) })).describe("pages not in nav, grouped under the hub page that lists them (e.g. all regional news pages under the extension offices page)"),
  popular_services: z.array(z.object({ title: z.string(), description: z.string(), slug: z.string() })).describe("4-6 things citizens most often come for"),
  home_sections: z.array(z.object({ heading: z.string(), description: z.string(), slugs: z.array(z.string()) })).describe("2-4 curated homepage sections pointing at page slugs"),
  footer: z.object({
    quick_links: z.array(NavItem),
    address: z.string(),
    email: z.string(),
    phone: z.string(),
    hours: z.string(),
  }),
  redirects: z.array(z.object({ from: z.string(), to: z.string() })).describe("old paths that should redirect to a new slug when pages were merged"),
  site_notes: z.array(z.string()).describe("site-wide migration findings"),
});
export type SitePlan = z.infer<typeof SitePlan>;

export interface SitePage extends PageModel {
  slug: string;
  source_url: string;
  source_screenshot: string;
}
export interface SiteModel extends SitePlan {
  jobId: string;
  origin: string;
  generated_at: string;
  pages: SitePage[];
  news: { title: string; date: string; excerpt: string; href: string }[];
  assets: { logo: string; logo_box: number[] };
  tokens?: number;
}

/** zod → strict JSON schema acceptable to the Responses API. */
export function strictSchema(schema: z.ZodType): Record<string, unknown> {
  const js = z.toJSONSchema(schema, { target: "draft-7", io: "output" }) as Record<string, unknown>;
  const walk = (n: unknown) => {
    if (!n || typeof n !== "object") return;
    const o = n as Record<string, unknown>;
    if (o.type === "object" && o.properties) {
      o.additionalProperties = false;
      o.required = Object.keys(o.properties as object);
    }
    for (const v of Object.values(o)) Array.isArray(v) ? v.forEach(walk) : walk(v);
  };
  walk(js);
  delete js.$schema;
  return js;
}
