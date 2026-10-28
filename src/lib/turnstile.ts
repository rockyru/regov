/**
 * Cloudflare Turnstile, server side: every protected form sends its widget token, and siteverify
 * must confirm it was issued for this action on an approved hostname before the handler runs.
 * Tokens are single-use: siteverify is meant to refuse a second redemption, but it answered success
 * twice for one token in testing (Oct 2026), so each token is also remembered here until it expires.
 *   TURNSTILE_SITEKEY     public key, passed to the widget (src/components/Turnstile.tsx)
 *   TURNSTILE_SECRET      private key
 *   TURNSTILE_HOSTNAMES   comma-separated frontend hosts, e.g. regov.app (never localhost in production)
 * With no sitekey and secret set (local development, CI, self-hosters who skip it), forms are not gated.
 */
import { createHash } from "node:crypto";

export type TurnstileAction = "feedback" | "reimagine";

/** Tokens already redeemed, by hash, until they would have expired (Turnstile tokens last 300 s). */
const TOKEN_TTL_MS = 5 * 60_000;
const used = new Map<string, number>();
function firstUse(token: string, now = Date.now()): boolean {
  if (used.size > 10_000) for (const [k, until] of used) if (until < now) used.delete(k);
  const key = createHash("sha256").update(token).digest("hex");
  if ((used.get(key) ?? 0) > now) return false;
  used.set(key, now + TOKEN_TTL_MS);
  return true;
}

export const turnstileSitekey = () => (process.env.TURNSTILE_SITEKEY && process.env.TURNSTILE_SECRET ? process.env.TURNSTILE_SITEKEY : "");

export async function verifyTurnstile(token: unknown, action: TurnstileAction, remoteip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET;
  if (!turnstileSitekey() || !secret) return true;
  const hostnames = new Set((process.env.TURNSTILE_HOSTNAMES ?? "").split(",").map((h) => h.trim()).filter(Boolean));
  if (typeof token !== "string" || !token || token.length > 2048 || !hostnames.size) return false;
  if (!firstUse(token)) { console.warn(`[turnstile] ${action} refused: token already used`); return false; }
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(remoteip && remoteip !== "local" ? { remoteip } : {}) }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!r.ok) throw new Error(`siteverify ${r.status}`);
    const result = (await r.json()) as { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
    const ok = result.success === true && result.action === action && !!result.hostname && hostnames.has(result.hostname);
    if (!ok) console.warn(`[turnstile] ${action} refused:`, result["error-codes"]?.join(",") || `action=${result.action} host=${result.hostname}`);
    return ok;
  } catch (e) {
    console.warn(`[turnstile] ${action} siteverify failed:`, (e as Error).message);
    return false; // fail closed
  }
}
