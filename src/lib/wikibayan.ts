// WikiBayan (wikibayan.vercel.app): a community-sourced, source-backed record of Philippine
// government projects. Read server-side from its public API, cached in memory for an hour, and
// matched to a site by locality (LGUs) or by implementing agency (everyone else).
import type { SiteModel } from "@/pipeline/schema";
import { isLgu, norm } from "@/lib/civic";

export const WIKIBAYAN = (process.env.WIKIBAYAN_ORIGIN ?? "https://wikibayan.vercel.app").replace(/\/$/, "");
export const projectUrl = (id: string) => `${WIKIBAYAN}/projects/${id}`;

export type WbProject = {
  id: string; name: string; description: string | null; budget_approved: string | null; status: string; implementing_agency: string | null;
  sector: string | null; funding_source: string | null; region: string | null; province: string | null; city: string | null; source_count: number; updated_at: string;
};
export type WbDetail = { progress?: { report_date: string; physical_accomplishment_pct: number | null }[]; contractors?: { name?: string }[] };
/** local: the site's own city, town or province · province: elsewhere in its province · metro: elsewhere in Metro Manila · agency: implemented by it. */
export type Scope = "local" | "province" | "metro" | "agency";
export type Matched = WbProject & { scope: Scope; budget: number; pct: number | null };

const TTL = 3600_000;
const cache = new Map<string, { at: number; value: unknown }>();
/** Fetch JSON with a timeout; keep the last good copy for an hour and serve it if WikiBayan is down. */
async function cached<T>(path: string): Promise<T | null> {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL) return hit.value as T;
  try {
    const r = await fetch(`${WIKIBAYAN}/api${path}`, { cache: "no-store", headers: { accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const value = (await r.json()) as T;
    cache.set(path, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.warn("[wikibayan]", path, (e as Error).message);
    return (hit?.value as T) ?? null;
  }
}

/** Every project on WikiBayan (24 per page, the API maximum). */
export async function allProjects(): Promise<WbProject[]> {
  const out: WbProject[] = [];
  for (let page = 1; page <= 40; page++) {
    const r = await cached<{ items: WbProject[]; total: number }>(`/projects?page=${page}&limit=24`);
    if (!r?.items.length) break;
    out.push(...r.items);
    if (out.length >= r.total) break;
  }
  return out;
}

// Region names differ between sources ("Region III - Central Luzon" vs "Central Luzon (Region III)").
const REGIONS: [string, RegExp][] = [
  ["NCR", /\bncr\b|national capital|metro manila/i], ["CAR", /\bcar\b|cordillera/i], ["BARMM", /barmm|bangsamoro|\barmm\b|muslim mindanao/i], ["NIR", /negros island/i],
  ["IV-A", /calabarzon|region\s*(iv-?a|4-?a)\b/i], ["IV-B", /mimaropa|region\s*(iv-?b|4-?b)\b/i], ["I", /ilocos|region\s*(i|1)\b/i], ["II", /cagayan valley|region\s*(ii|2)\b/i],
  ["III", /central luzon|region\s*(iii|3)\b/i], ["V", /bicol|region\s*(v|5)\b/i], ["VI", /western visayas|region\s*(vi|6)\b/i], ["VII", /central visayas|region\s*(vii|7)\b/i],
  ["VIII", /eastern visayas|region\s*(viii|8)\b/i], ["IX", /zamboanga peninsula|region\s*(ix|9)\b/i], ["X", /northern mindanao|region\s*(x|10)\b/i], ["XI", /davao region|region\s*(xi|11)\b/i],
  ["XII", /soccsksargen|region\s*(xii|12)\b/i], ["XIII", /caraga|region\s*(xiii|13)\b/i],
];
const regionKey = (s?: string | null) => (s ? REGIONS.find(([, re]) => re.test(s))?.[0] ?? norm(s) : "");
const same = (a?: string | null, b?: string | null) => !!a && !!b && norm(a) === norm(b) && norm(a) !== "";

/** WikiBayan projects for this site, closest first. LGUs by place; agencies by implementing agency. */
export function matchProjects(site: SiteModel, all: WbProject[]): (WbProject & { scope: Scope })[] {
  const loc = site.locality ?? { province: "", region: "", city: "" };
  const out: (WbProject & { scope: Scope })[] = [];
  if (isLgu(site)) {
    // Region-wide matches would put Bulacan projects on a Nueva Ecija town, so stop at the province;
    // Metro Manila is the exception, since WikiBayan often records NCR projects with no city.
    const ncr = regionKey(loc.region) === "NCR" || /metro manila/i.test(loc.province);
    for (const p of all) {
      const provOk = !loc.province || !p.province || same(p.province, loc.province) || ncr;
      if (site.site_kind === "province" ? same(p.province, loc.province) : loc.city && same(p.city, loc.city) && provOk) out.push({ ...p, scope: "local" });
      else if (site.site_kind !== "province" && loc.province && !ncr && same(p.province, loc.province)) out.push({ ...p, scope: "province" });
      else if (ncr && regionKey(p.region) === "NCR") out.push({ ...p, scope: "metro" });
    }
  } else {
    const name = norm(site.agency.name), short = site.agency.short_name?.trim();
    const shortRe = short && short.length >= 3 && short.length <= 12 ? new RegExp(`\\b${short.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`) : null;
    // A regional office only gets its own region's projects, not the whole department's.
    const reg = site.site_kind === "regional_office" ? regionKey(loc.region) : "";
    for (const p of all) {
      const impl = p.implementing_agency ?? "";
      if (reg && regionKey(p.region) !== reg) continue;
      if ((name.length >= 8 && norm(impl).includes(name)) || (shortRe && shortRe.test(impl))) out.push({ ...p, scope: "agency" });
    }
  }
  return out;
}

const RANK: Record<Scope, number> = { agency: 0, local: 0, province: 1, metro: 1 };

/** Matched projects with budget as a number and the latest physical accomplishment from each project's detail. */
export async function projectsFor(site: SiteModel): Promise<Matched[]> {
  const matched = matchProjects(site, await allProjects());
  matched.sort((a, b) => RANK[a.scope] - RANK[b.scope] || Number(b.budget_approved ?? 0) - Number(a.budget_approved ?? 0));
  const top = matched.slice(0, 60);
  const details = await Promise.all(top.map((p) => cached<WbDetail>(`/projects/${p.id}`)));
  return top.map((p, i) => {
    const prog = [...(details[i]?.progress ?? [])].filter((r) => r.physical_accomplishment_pct != null).sort((a, b) => b.report_date.localeCompare(a.report_date))[0];
    return { ...p, budget: Number(p.budget_approved ?? 0) || 0, pct: prog?.physical_accomplishment_pct ?? (p.status === "completed" ? 100 : null) };
  });
}

export const peso = (v: number) => (v >= 1e9 ? `₱${(v / 1e9).toFixed(2)}B` : v >= 1e6 ? `₱${(v / 1e6).toFixed(1)}M` : v > 0 ? `₱${Math.round(v).toLocaleString("en-PH")}` : "–");
export const statusLabel = (s: string) => s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
