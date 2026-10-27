// Civic data shared by every reimagined site: emergency hotlines (BetterGov.ph dataset +
// national numbers), Open-Meteo weather for LGUs, and the BetterGov/government tool links
// that fit each kind of government body.
import type { SiteModel } from "@/pipeline/schema";
import dataset from "@/data/bettergov-hotlines.json";

export type Hotline = { name: string; number: string; alt?: string[]; category: Category; scope: "site" | "local" | "national"; area?: string };
export type Category = "emergency" | "police" | "fire" | "medical" | "government" | "utility" | "office";

export const CATEGORY_LABEL: Record<Category, string> = { emergency: "Emergency", police: "Police", fire: "Fire", medical: "Medical", government: "Government", utility: "Utilities", office: "Offices" };

/** Nationwide numbers every site should carry (BetterGov.ph "Critical Emergency Hotlines" set). */
export const NATIONAL_HOTLINES: Hotline[] = [
  { name: "National Emergency Hotline", number: "911", category: "emergency", scope: "national" },
  { name: "Philippine Red Cross", number: "143", alt: ["(02) 8790-2300"], category: "medical", scope: "national" },
  { name: "NDRRMC Operations Center", number: "(02) 8911-1406", alt: ["(02) 8912-2665"], category: "emergency", scope: "national" },
  { name: "Philippine National Police", number: "117", alt: ["0998-598-8898"], category: "police", scope: "national" },
  { name: "Bureau of Fire Protection", number: "(02) 8426-0219", alt: ["(02) 8426-3812"], category: "fire", scope: "national" },
  { name: "DOH Health Emergency", number: "(02) 8651-7800", category: "medical", scope: "national" },
  { name: "Philippine Coast Guard", number: "(02) 8527-8481", category: "emergency", scope: "national" },
  { name: "8888 Citizens' Complaint Hotline", number: "8888", category: "government", scope: "national" },
  { name: "Bantay Bata", number: "163", category: "government", scope: "national" },
  { name: "PAGASA Weather", number: "(02) 8284-0800", category: "government", scope: "national" },
];

type Row = { hotlineName: string; hotlineNumber: string; regionName: string; province: string; city: string; category: string; alternateNumbers: string[] };
const ROWS = (dataset as { hotlines: Row[] }).hotlines;
const CAT: Record<string, Category> = { police_hotlines: "police", fire_hotlines: "fire", medical_hotlines: "medical", government_hotlines: "government", utility_hotlines: "utility" };

export const norm = (s: string) => s.toLowerCase().replace(/\b(city|municipality|province|of|the|region)\b/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
const roman = (s: string) => (s.match(/region\s+([ivx]+)(?:-?[ab])?/i)?.[1] ?? "").toUpperCase();

/** Dataset hotlines for the site's locality: same city first, then province, then region. */
export function localHotlines(site: SiteModel): { city: Hotline[]; province: Hotline[]; region: Hotline[] } {
  const loc = site.locality ?? { province: "", region: "", city: "" };
  const city = norm(loc.city), prov = norm(loc.province), reg = roman(loc.region), regName = norm(loc.region);
  const toH = (r: Row): Hotline => ({ name: r.hotlineName, number: r.hotlineNumber, alt: r.alternateNumbers?.filter(Boolean), category: CAT[r.category] ?? "government", scope: "local", area: r.city || r.province });
  const out = { city: [] as Hotline[], province: [] as Hotline[], region: [] as Hotline[] };
  if (!city && !prov && !reg) return out;
  for (const r of ROWS) {
    const rc = norm(r.city), rp = norm(r.province), rr = roman(r.regionName), rn = norm(r.regionName);
    if (city && rc && (rc === city || rc.includes(city) || city.includes(rc))) out.city.push(toH(r));
    else if (prov && rp && (rp === prov || rp.includes(prov) || prov.includes(rp))) out.province.push(toH(r));
    else if ((reg && rr === reg) || (regName && rn && (rn.includes(regName) || regName.includes(rn)))) out.region.push(toH(r));
  }
  return out;
}

const PHONE = /(\+?63|\(0?\d{1,3}\)|0)?\s?[\d(][\d\s().-]{6,}\d/;
/** Hotline entities Muse Spark extracted from the site itself, with the name/number columns untangled. */
export function siteHotlines(site: SiteModel): Hotline[] {
  const seen = new Set<string>();
  const out: Hotline[] = [];
  for (const e of site.entities ?? []) {
    if (e.type !== "hotline") continue;
    const a = (e.name ?? "").trim(), b = (e.detail ?? "").trim();
    const aNum = PHONE.test(a) && !/[a-z]{4,}/i.test(a.replace(/cp no\.?|tel\.?|mobile|landline/gi, ""));
    let name = aNum ? b : a, number = aNum ? a : b;
    name = name.replace(/\b(contact( number| no\.?)?|hotline|cp no\.?|tel(ephone)?( no\.?)?)\b\.?/gi, "").replace(/\s{2,}/g, " ").replace(/[\s:–-]+$/, "").trim() || "Hotline";
    const m = number.match(PHONE);
    if (!m) continue;
    number = m[0].trim();
    const key = number.replace(/\D/g, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, number, category: /police|pnp/i.test(name) ? "police" : /fire|bfp/i.test(name) ? "fire" : /health|hospital|rhu|medical|ambulance/i.test(name) ? "medical" : /rescue|drrm|disaster|emergency/i.test(name) ? "emergency" : "office", scope: "site" });
  }
  return out;
}

export const telHref = (n: string) => `tel:${n.replace(/[^+\d]/g, "")}`;

/* ---------- Weather (Open-Meteo, no key) ---------- */

export type Weather = { place: string; lat: number; lon: number; current: { temp: number; feels: number; humidity: number; wind: number; code: number; time: string }; daily: { date: string; code: number; max: number; min: number; rain: number }[] };

const WMO: [number[], string][] = [[[0], "Clear"], [[1], "Mostly clear"], [[2], "Partly cloudy"], [[3], "Overcast"], [[45, 48], "Fog"], [[51, 53, 55, 56, 57], "Drizzle"], [[61, 63, 65, 66, 67], "Rain"], [[71, 73, 75, 77], "Snow"], [[80, 81, 82], "Rain showers"], [[85, 86], "Snow showers"], [[95], "Thunderstorm"], [[96, 99], "Thunderstorm with hail"]];
export const wmoLabel = (c: number) => WMO.find(([codes]) => codes.includes(c))?.[1] ?? "Unsettled";
export const wmoGlyph = (c: number) => (c === 0 ? "☀" : c <= 2 ? "⛅" : c === 3 ? "☁" : c < 50 ? "🌫" : c < 70 ? "🌧" : c < 80 ? "🌨" : c < 90 ? "🌦" : "⛈");

const LGU = ["province", "city_municipality", "barangay"];
export const isLgu = (site: SiteModel) => LGU.includes(site.site_kind ?? "");

export async function getWeather(site: SiteModel): Promise<Weather | null> {
  const loc = site.locality ?? { province: "", region: "", city: "" };
  const query = loc.city || (site.site_kind === "province" ? loc.province : "");
  if (!query) return null;
  try {
    const g = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&country=PH&language=en`, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(6000) });
    const gj = (await g.json()) as { results?: { name: string; latitude: number; longitude: number; admin1?: string; admin2?: string }[] };
    const hit = gj.results?.find((r) => !loc.province || norm(r.admin2 ?? "").includes(norm(loc.province)) || norm(r.admin1 ?? "").includes(norm(loc.province))) ?? gj.results?.[0];
    if (!hit) return null;
    const u = `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FManila&forecast_days=4`;
    const f = await fetch(u, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(6000) });
    const j = (await f.json()) as { current: { time: string; temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number }; daily: { time: string[]; weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[]; precipitation_probability_max: number[] } };
    if (!j.current || !j.daily) return null;
    return {
      place: [hit.name, hit.admin2?.replace(/^Province of /, "")].filter(Boolean).join(", "), lat: hit.latitude, lon: hit.longitude,
      current: { temp: j.current.temperature_2m, feels: j.current.apparent_temperature, humidity: j.current.relative_humidity_2m, wind: j.current.wind_speed_10m, code: j.current.weather_code, time: j.current.time },
      daily: j.daily.time.map((date, i) => ({ date, code: j.daily.weather_code[i], max: j.daily.temperature_2m_max[i], min: j.daily.temperature_2m_min[i], rain: j.daily.precipitation_probability_max[i] ?? 0 })),
    };
  } catch (e) {
    console.warn("[weather]", (e as Error).message);
    return null;
  }
}

/* ---------- Links: BetterGov.ph tools and per-kind government resources ---------- */

export type CivicLink = { label: string; href: string; note?: string };

export const BETTERGOV_TOOLS: CivicLink[] = [
  { label: "Service Directory", href: "https://bettergov.ph/services", note: "Every government service, searchable" },
  { label: "Government Directory", href: "https://bettergov.ph/government", note: "Executive, legislative, judicial" },
  { label: "2026 Budget Tracker", href: "https://bettergov.ph/budget", note: "Where the national budget goes" },
  { label: "Flood Control Projects", href: "https://bettergov.ph/flood-control-projects", note: "DPWH projects by location and contractor" },
  { label: "Philippine Holidays", href: "https://bettergov.ph/philippines/holidays" },
  { label: "Emergency Hotlines", href: "https://bettergov.ph/data/hotlines" },
  { label: "Weather", href: "https://bettergov.ph/data/weather" },
  { label: "Forex Rates", href: "https://bettergov.ph/data/forex" },
];

export const TRANSPARENCY_EXTERNAL: CivicLink[] = [
  { label: "PhilGEPS", href: "https://www.philgeps.gov.ph", note: "Government procurement notices and awards" },
  { label: "Freedom of Information", href: "https://www.foi.gov.ph", note: "Request records from any agency" },
  { label: "Open Data Philippines", href: "https://data.gov.ph", note: "Datasets published by government" },
  { label: "Commission on Audit", href: "https://www.coa.gov.ph", note: "Audit reports" },
  { label: "2026 Budget Tracker", href: "https://bettergov.ph/budget", note: "BetterGov.ph" },
];

export function kindLinks(site: SiteModel): CivicLink[] {
  const k = site.site_kind ?? "national_agency";
  if (LGU.includes(k)) return [
    { label: "Full Disclosure Policy Portal", href: "https://fdpp.dilg.gov.ph", note: "LGU budgets, plans and reports (DILG)" },
    { label: "Better LGU", href: "https://bettergov.ph/lgu", note: "Compare local governments on BetterGov.ph" },
    { label: "PhilSys National ID", href: "https://philsys.gov.ph", note: "Register or track your national ID" },
    { label: "Flood Control Projects", href: "https://bettergov.ph/flood-control-projects", note: "DPWH projects near you" },
    { label: "Seal of Good Local Governance", href: "https://www.dilg.gov.ph", note: "DILG" },
  ];
  if (k === "university" || k === "school") return [
    { label: "CHED", href: "https://ched.gov.ph", note: "Commission on Higher Education" },
    { label: "UniFAST", href: "https://unifast.gov.ph", note: "Free tuition and student financial assistance" },
    { label: "DepEd", href: "https://www.deped.gov.ph" },
    { label: "TESDA", href: "https://www.tesda.gov.ph", note: "Technical and vocational training" },
    { label: "PRC", href: "https://www.prc.gov.ph", note: "Board exams and licenses" },
  ];
  if (k === "hospital") return [
    { label: "PhilHealth", href: "https://www.philhealth.gov.ph", note: "Benefits, membership, claims" },
    { label: "Department of Health", href: "https://doh.gov.ph" },
    { label: "Malasakit Centers", href: "https://doh.gov.ph/malasakit-centers", note: "Medical assistance one-stop shops" },
    { label: "DOH Health Emergency", href: "tel:+63286517800", note: "(02) 8651-7800" },
  ];
  if (k === "embassy") return [
    { label: "Department of Foreign Affairs", href: "https://dfa.gov.ph" },
    { label: "Passport Appointments", href: "https://www.passport.gov.ph" },
    { label: "OWWA", href: "https://owwa.gov.ph", note: "Overseas Workers Welfare Administration" },
    { label: "DMW", href: "https://dmw.gov.ph", note: "Department of Migrant Workers" },
  ];
  return [
    { label: "Anti-Red Tape Authority", href: "https://arta.gov.ph", note: "Citizen's Charter compliance" },
    { label: "8888 Citizens' Complaint Center", href: "https://8888.gov.ph" },
    { label: "Civil Service Commission", href: "https://www.csc.gov.ph", note: "Jobs and public servants" },
    { label: "Official Gazette", href: "https://www.officialgazette.gov.ph", note: "Laws and issuances" },
    { label: "Government Directory", href: "https://bettergov.ph/government", note: "BetterGov.ph" },
  ];
}

/** Transparency pages the agent found on the original site. */
export function transparencyPages(site: SiteModel): { label: string; slug: string }[] {
  const want: [RegExp, string][] = [
    [/transparen/i, "Transparency Seal"], [/citizen.?s?.charter/i, "Citizen's Charter"], [/bids?|procure|awards/i, "Bids and Awards"],
    [/annual.?report|accomplishment/i, "Annual Reports"], [/budget|investment|appropriation|financial/i, "Budget and Finance"],
    [/\bfoi\b|freedom.of.information/i, "Freedom of Information"], [/saln/i, "SALN"], [/audit|coa\b/i, "Audit Reports"],
    [/privacy/i, "Privacy Notice"], [/plan\b|development.plan|cdp|clup/i, "Plans and Reports"],
  ];
  const out: { label: string; slug: string }[] = [];
  for (const [re, label] of want) {
    const p = site.pages.find((pg) => re.test(pg.slug) || re.test(pg.title));
    if (p && !out.some((o) => o.slug === p.slug)) out.push({ label: label === "Plans and Reports" || label === "Budget and Finance" ? p.title : label, slug: p.slug });
  }
  return out;
}

/** Well-known government sites, so GWT-era footer links whose hrefs were lost in the archive still go somewhere. */
const KNOWN_GOV: [RegExp, string][] = [
  [/^official gazette$/i, "https://www.officialgazette.gov.ph"], [/^office of the president$/i, "https://op-proper.gov.ph"], [/^official directory$/i, "https://www.gov.ph/directory"],
  [/^official calendar$/i, "https://www.officialgazette.gov.ph/nationwide-holidays"], [/^project noah$/i, "https://noah.up.edu.ph"], [/^office of the vice president$/i, "https://ovp.gov.ph"],
  [/^senate/i, "https://legacy.senate.gov.ph"], [/^house of representatives$/i, "https://www.congress.gov.ph"], [/^supreme court$/i, "https://sc.judiciary.gov.ph"],
  [/^court of appeals$/i, "https://ca.judiciary.gov.ph"], [/^sandiganbayan$/i, "https://sb.judiciary.gov.ph"], [/^court of tax appeals$/i, "https://cta.judiciary.gov.ph"],
  [/^judicial (and )?bar (and )?council$/i, "https://jbc.judiciary.gov.ph"], [/^department of education$/i, "https://www.deped.gov.ph"], [/^department of (the )?interior and local government$/i, "https://www.dilg.gov.ph"],
  [/^department of finance$/i, "https://www.dof.gov.ph"], [/^department of health$/i, "https://doh.gov.ph"], [/^department of science and technology$/i, "https://www.dost.gov.ph"],
  [/^department of trade and industry$/i, "https://www.dti.gov.ph"], [/^department of agriculture$/i, "https://www.da.gov.ph"], [/^department of public works and highways$/i, "https://www.dpwh.gov.ph"],
  [/^department of social welfare and development$/i, "https://www.dswd.gov.ph"], [/^department of tourism$/i, "https://www.tourism.gov.ph"], [/^department of labor and employment$/i, "https://www.dole.gov.ph"],
  [/^department of budget and management$/i, "https://www.dbm.gov.ph"], [/^department of justice$/i, "https://www.doj.gov.ph"], [/^department of foreign affairs$/i, "https://dfa.gov.ph"],
  [/^department of national defense$/i, "https://www.dnd.gov.ph"], [/^department of energy$/i, "https://www.doe.gov.ph"], [/^department of environment and natural resources$/i, "https://www.denr.gov.ph"],
  [/^department of transportation$/i, "https://dotr.gov.ph"], [/^department of agrarian reform$/i, "https://www.dar.gov.ph"], [/^philhealth$/i, "https://www.philhealth.gov.ph"],
  [/^gov\.?ph$/i, "https://www.gov.ph"], [/^open data/i, "https://data.gov.ph"], [/^freedom of information|^foi$/i, "https://www.foi.gov.ph"], [/^philgeps$/i, "https://www.philgeps.gov.ph"],
  [/^civil service commission$/i, "https://www.csc.gov.ph"], [/^commission on audit$/i, "https://www.coa.gov.ph"], [/^pagasa$/i, "https://www.pagasa.dost.gov.ph"], [/^phivolcs$/i, "https://www.phivolcs.dost.gov.ph"],
];
export function knownGovUrl(label: string): string | undefined {
  const t = label.trim().replace(/\s+/g, " ");
  return KNOWN_GOV.find(([re]) => re.test(t))?.[1];
}
