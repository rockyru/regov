// Page titles that are really an address. The model copies them from pages whose only
// heading is an email or a URL; on a phone they cannot wrap and blow the layout open.
import type { SiteModel, SitePage } from "./schema";

const EMAIL = /^[\w.+-]+@[\w-]+(\.[\w-]+)+$/i;
const URL_LIKE = /^(https?:\/\/|www\.)\S+$|^[\w-]+(\.[\w-]+)+(\/\S*)?$/i;
const LONG_TOKEN = /\S{32,}/;

export function isBareAddress(t: string): boolean {
  const s = (t ?? "").trim();
  return s.length > 0 && (EMAIL.test(s) || URL_LIKE.test(s));
}

export function humanizeSlug(slug: string): string {
  const last = slug.split("/").filter(Boolean).pop() ?? "";
  const words = last.replace(/^(page|post)-/, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  return words && !/^\d+$/.test(words) ? words : "";
}

/** Replace an address-only or unbreakable title with something a human would write. */
export function fixPage<T extends Pick<SitePage, "title" | "slug" | "page_type" | "hero" | "section">>(p: T): T {
  const bad = (t?: string) => !t || isBareAddress(t) || LONG_TOKEN.test(t);
  if (!bad(p.title) && !bad(p.hero?.heading)) return p;
  const fallback = humanizeSlug(p.slug) || (isBareAddress(p.title) && EMAIL.test(p.title.trim()) ? "Contact" : p.section || (p.page_type === "contact" ? "Contact" : "Page"));
  const title = bad(p.title) ? fallback : p.title;
  const hero = p.hero && bad(p.hero.heading) ? { ...p.hero, heading: title } : p.hero;
  return { ...p, title, hero };
}

export function fixPageTitles(site: SiteModel): SiteModel {
  site.pages = site.pages.map((p) => fixPage(p));
  return site;
}
