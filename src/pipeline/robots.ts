/**
 * robots.txt for REGOVBot, per RFC 9309: the group naming REGOVBot (else `*`), Allow and Disallow
 * with the longest match winning (Allow on a tie), `*` and `$` patterns, and Crawl-delay. A missing
 * file (4xx) allows everything; a server error or no answer means stay out, as the RFC asks.
 * In archive mode the rules come from the Wayback Machine's capture of the site's own robots.txt.
 */
import { request } from "playwright";
import { toArchive } from "./archive";

export const BOT = "REGOVBot";
export const BOT_INFO = "https://regov.app/bot";
export const UA = `Mozilla/5.0 (compatible; ${BOT}/1.0; +${BOT_INFO}) Chrome/120`;

type Rule = { allow: boolean; pattern: string; re: RegExp };
export type Robots = {
  /** Whether REGOVBot may fetch this URL (path and query). */
  allows(url: string): boolean;
  /** Crawl-delay for REGOVBot in ms, 0 when none is set. */
  delayMs: number;
  /** 2xx: rules read; 4xx: no file, everything allowed; "unreachable": 5xx or no answer, nothing allowed. */
  state: "rules" | "none" | "unreachable";
  /** The site asks REGOVBot (or every crawler) to stay away entirely. */
  blocksSite: boolean;
};

const toRe = (p: string) => {
  const end = p.endsWith("$");
  return new RegExp("^" + (end ? p.slice(0, -1) : p).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + (end ? "$" : ""));
};

export function parseRobots(txt: string, agent = BOT): { rules: Rule[]; delay: number } {
  type Group = { agents: string[]; rules: Rule[]; delay: number };
  const groups: Group[] = [];
  let cur: Group | null = null, lastWasAgent = false;
  for (const raw of txt.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    const i = line.indexOf(":");
    if (i < 0) continue;
    const key = line.slice(0, i).trim().toLowerCase(), val = line.slice(i + 1).trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) groups.push((cur = { agents: [], rules: [], delay: 0 }));
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if ((key === "allow" || key === "disallow") && val) cur.rules.push({ allow: key === "allow", pattern: val, re: toRe(val) });
    else if (key === "crawl-delay" && Number(val) > 0) cur.delay = Number(val);
  }
  const mine = groups.filter((g) => g.agents.some((a) => a !== "*" && agent.toLowerCase().includes(a)));
  const use = mine.length ? mine : groups.filter((g) => g.agents.includes("*"));
  return { rules: use.flatMap((g) => g.rules), delay: Math.max(0, ...use.map((g) => g.delay)) };
}

export function robotsFrom(state: Robots["state"], txt = ""): Robots {
  const { rules, delay } = state === "rules" ? parseRobots(txt) : { rules: [], delay: 0 };
  const allows = (url: string) => {
    if (state === "none") return true;
    if (state === "unreachable") return false;
    const u = new URL(url);
    let path = u.pathname + u.search;
    try { path = decodeURI(u.pathname) + u.search; } catch { /* keep the encoded form */ }
    if (u.pathname === "/robots.txt") return true;
    let best: Rule | undefined;
    for (const r of rules) {
      if (!r.re.test(path)) continue;
      if (!best || r.pattern.length > best.pattern.length || (r.pattern.length === best.pattern.length && r.allow)) best = r;
    }
    return best ? best.allow : true;
  };
  return { allows, delayMs: Math.min(delay * 1000, 30_000), state, blocksSite: state === "rules" && !allows("https://x/") };
}

/** GET as REGOVBot, tolerating the broken certificate chains many government sites have (as the crawler's browser does). */
export async function fetchAsBot(url: string, timeout = 15_000): Promise<{ status: number; type: string; body: string }> {
  const ctx = await request.newContext({ userAgent: UA, ignoreHTTPSErrors: true });
  try {
    const r = await ctx.get(url, { maxRedirects: 5, timeout });
    return { status: r.status(), type: r.headers()["content-type"] ?? "", body: await r.text() };
  } finally {
    await ctx.dispose();
  }
}

/** Fetch and parse robots.txt for an origin, live or from a Wayback Machine capture. */
export async function loadRobots(origin: string, archiveTimestamp?: string): Promise<Robots> {
  const url = archiveTimestamp ? toArchive(`${origin}/robots.txt`, archiveTimestamp).replace("if_/", "id_/") : `${origin}/robots.txt`;
  try {
    const res = await fetchAsBot(url);
    if (res.status >= 500) return robotsFrom("unreachable");
    if (res.status >= 400) return robotsFrom("none");
    // A login page or soft-404 served as HTML is not a robots file.
    if (/text\/html/i.test(res.type)) return robotsFrom("none");
    return robotsFrom("rules", res.body);
  } catch {
    return robotsFrom("unreachable");
  }
}
