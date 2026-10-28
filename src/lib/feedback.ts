/**
 * Comments from the feedback box (src/components/FeedbackBox.tsx). Each one is appended to
 * jobs/.feedback/<month>.jsonl, shown on /admin, and, when Cloudflare Email Sending is configured,
 * emailed to the maintainer. No IP address is stored.
 *   FEEDBACK_TO               where to email comments (empty: stored only)
 *   FEEDBACK_FROM             sender on a domain onboarded to Cloudflare Email Sending, e.g. hello@regov.app
 *   CLOUDFLARE_EMAIL_TOKEN    API token with Email Sending permission
 *   CLOUDFLARE_ACCOUNT_ID     the account that owns the sending domain
 */
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT } from "./jobs";

export type Feedback = { id: string; at: string; message: string; email: string; page: string; emailed: boolean };

const DIR = join(JOBS_ROOT, ".feedback");
export const MAX_MESSAGE = 4000;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/** Sliding window per visitor: 5 comments an hour. */
const hits = new Map<string, number[]>();
export function feedbackRateLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 5) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export function cleanFeedback(body: { message?: unknown; email?: unknown; page?: unknown }): { message: string; email: string; page: string } | string {
  const message = String(body.message ?? "").replace(/\r\n/g, "\n").trim();
  const email = String(body.email ?? "").trim();
  const page = String(body.page ?? "").slice(0, 300);
  if (message.length < 3) return "Write a few words first.";
  if (message.length > MAX_MESSAGE) return `Keep it under ${MAX_MESSAGE.toLocaleString("en-PH")} characters.`;
  if (email && (email.length > 200 || !EMAIL.test(email))) return "That email address doesn't look right. Leave it empty to stay anonymous.";
  return { message, email, page };
}

export async function saveFeedback(input: { message: string; email: string; page: string }): Promise<Feedback> {
  const at = new Date().toISOString();
  const fb: Feedback = { id: randomUUID(), at, ...input, emailed: false };
  fb.emailed = await emailFeedback(fb).catch((e: Error) => { console.warn("[feedback] email failed:", e.message); return false; });
  await mkdir(DIR, { recursive: true });
  await appendFile(join(DIR, `${at.slice(0, 7)}.jsonl`), JSON.stringify(fb) + "\n");
  return fb;
}

/** Cloudflare Email Sending REST API. False when it is not configured. */
async function emailFeedback(fb: Feedback): Promise<boolean> {
  const { FEEDBACK_TO: to, FEEDBACK_FROM: from, CLOUDFLARE_EMAIL_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  if (!to || !from || !token || !account) return false;
  const pub = process.env.PUBLIC_ORIGIN ?? "https://regov.app";
  const text = `${fb.message}\n\n— ${fb.email || "anonymous"}${fb.page ? `, on ${pub}${fb.page}` : ""}\n${fb.at}`;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: { address: from, name: "RE:GOV feedback" },
      to: [to],
      ...(fb.email ? { reply_to: fb.email } : {}),
      subject: `RE:GOV feedback: ${fb.message.replace(/\s+/g, " ").slice(0, 60)}${fb.message.length > 60 ? "…" : ""}`,
      text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const out = (await res.json().catch(() => null)) as { success?: boolean; errors?: { code: number; message: string }[] } | null;
  if (!res.ok || !out?.success) throw new Error(`${res.status} ${out?.errors?.map((e) => `${e.code} ${e.message}`).join("; ") ?? ""}`);
  return true;
}

/** Newest first, for /admin. */
export async function listFeedback(limit = 100): Promise<Feedback[]> {
  const files = (await readdir(DIR).catch(() => [] as string[])).filter((f) => f.endsWith(".jsonl")).sort().reverse();
  const out: Feedback[] = [];
  for (const f of files) {
    const lines = (await readFile(join(DIR, f), "utf8")).split("\n").filter(Boolean).reverse();
    for (const l of lines) { try { out.push(JSON.parse(l)); } catch { /* torn line */ } if (out.length >= limit) return out; }
  }
  return out;
}
