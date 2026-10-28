/** Wayback Machine helpers: find a snapshot and translate archive URLs. */
import { UA } from "./robots";
const ARCHIVE_RE = /^https?:\/\/web\.archive\.org\/web\/(\d{4,14})(?:[a-z]{2}_)?\/(.+)$/i;

export const BLOCKED_TITLE = /just a moment|security verification|attention required|access denied|verify you are human|checking your browser|403 forbidden|cloudflare/i;

export function isArchiveUrl(u: string) { return ARCHIVE_RE.test(u); }

/** https://web.archive.org/web/2019…if_/http://lupao.gov.ph/?page=x  →  http://lupao.gov.ph/?page=x */
export function fromArchive(u: string): string {
  const m = ARCHIVE_RE.exec(u);
  if (!m) return u;
  let orig = m[2];
  if (!/^https?:\/\//i.test(orig)) orig = "http://" + orig;
  return orig;
}

/** Original URL → archive URL. `if_` = rewritten links, no Wayback toolbar. */
export function toArchive(original: string, timestamp: string): string {
  return `https://web.archive.org/web/${timestamp}if_/${original}`;
}

export function hostKey(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

export interface Snapshot { timestamp: string; original: string; captures: number }

const PARKED = /administrative quarantine|account suspended|domain (is )?(parked|expired|for sale)|under construction|coming soon|default web page|index of \//i;
export const PARKED_TITLE = PARKED;

async function cdx(params: string, attempt = 0): Promise<string[][]> {
  try {
    const res = await fetch(`https://web.archive.org/cdx/search/cdx?${params}`, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(90_000) });
    if (res.status === 429 || res.status >= 500) throw new Error(`CDX ${res.status}`);
    if (!res.ok) throw new Error(`CDX ${res.status}`);
    const rows = (await res.json()) as string[][];
    return rows.slice(1);
  } catch (e) {
    if (attempt >= 3) throw e;
    await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
    return cdx(params, attempt + 1);
  }
}

/**
 * Pick the snapshot month where the archive holds the most distinct pages of the
 * real site, then use the latest homepage capture from that month. Parking and
 * suspension pages at the end of a domain's life are skipped that way.
 */
export async function findSnapshot(siteUrl: string): Promise<Snapshot | null> {
  const host = hostKey(siteUrl);
  try {
    const all = await cdx(`url=${host}/*&output=json&fl=timestamp,original,statuscode,mimetype&filter=statuscode:200&filter=mimetype:text/html&collapse=digest&limit=1500`);
    if (!all.length) return null;
    // distinct URL count per month
    const months = new Map<string, Set<string>>();
    for (const [ts, orig] of all) {
      const m = ts.slice(0, 6);
      const key = orig.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
      (months.get(m) ?? months.set(m, new Set()).get(m)!).add(key);
    }
    const ranked = [...months.entries()].sort((a, b) => b[1].size - a[1].size || b[0].localeCompare(a[0]));
    const bestMonth = ranked[0][0];
    const captures = ranked[0][1].size;
    // latest homepage capture in the best month (or nearest after/before)
    const homes = all.filter(([, orig]) => /^https?:\/\/(www\.)?[^/]+\/?(\?.*)?$/.test(orig) && !/\?./.test(orig)).sort((a, b) => a[0].localeCompare(b[0]));
    const inMonth = homes.filter(([ts]) => ts.startsWith(bestMonth));
    const pick = inMonth.at(-1) ?? homes.filter(([ts]) => ts >= bestMonth).at(0) ?? homes.at(-1) ?? all.find(([ts]) => ts.startsWith(bestMonth))!;
    return { timestamp: pick[0], original: pick[1], captures };
  } catch (e) {
    console.warn("[archive] snapshot lookup failed:", (e as Error).message);
    return null;
  }
}
