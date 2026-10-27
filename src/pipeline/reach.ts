// Pick a start URL that actually answers. Many PH government domains have no DNS record at the
// bare name (bir.gov.ph, gov.ph) and only work as www., or the other way round; container DNS
// also misses now and then. Resolve first, retry a miss once, then ask the server for a header.
import { lookup } from "node:dns/promises";

export interface Reach { url: string; note?: string; resolvable: boolean; answered: boolean }

async function resolves(host: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { await lookup(host); return true; } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== "ENOTFOUND" && code !== "EAI_AGAIN" && code !== "ESERVFAIL") return false;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  return false;
}

async function answers(url: string): Promise<boolean> {
  // Any HTTP response counts, even 403: the crawler's bot-protection path handles those.
  try { await fetch(url, { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(12_000), headers: { "user-agent": "Mozilla/5.0 (compatible; RE:GOV crawler)" } }); return true; } catch { return false; }
}

export async function pickReachable(startUrl: string): Promise<Reach> {
  const u = new URL(startUrl);
  const host = u.hostname.toLowerCase();
  const alt = host.startsWith("www.") ? host.slice(4) : `www.${host}`;
  const candidates = [host, alt];
  let fallback: Reach | null = null;
  for (const h of candidates) {
    if (!(await resolves(h))) continue;
    const url = new URL(u.toString()); url.hostname = h;
    const ok = await answers(url.toString());
    const note = h === host ? undefined : `${host} does not resolve, using ${h}`;
    if (ok) return { url: url.toString(), note, resolvable: true, answered: true };
    fallback ??= { url: url.toString(), note, resolvable: true, answered: false };
  }
  return fallback ?? { url: startUrl, resolvable: false, answered: false };
}
