/**
 * Comments from the feedback box (src/components/FeedbackBox.tsx). Each one is appended to
 * jobs/.feedback/<month>.jsonl, shown on /admin, and, when Cloudflare Email Sending is configured,
 * emailed to the maintainer. No IP address is stored.
 * Abuse limits (src/app/api/feedback/route.ts checks same-origin, size and the honeypot first):
 * per visitor 1 comment every 30 seconds, 5 an hour and 20 a day; FEEDBACK_DAILY_MAX (200) comments
 * a day in all, of which FEEDBACK_EMAIL_DAILY_MAX (50) are emailed and the rest only stored;
 * repeats of the same message within a day and messages with more than 3 links are dropped.
 *   FEEDBACK_TO               where to email comments (empty: stored only)
 *   FEEDBACK_FROM             sender on a domain onboarded to Cloudflare Email Sending, e.g. hello@regov.app
 *   CLOUDFLARE_EMAIL_TOKEN    API token with Email Sending permission
 *   CLOUDFLARE_ACCOUNT_ID     the account that owns the sending domain
 */
import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT } from "./jobs";
import { FEEDBACK_TOPICS, MAX_MESSAGE, topicLabel, type FeedbackTopic } from "./feedbackTopics";

export type Feedback = { id: string; at: string; topic?: FeedbackTopic; message: string; email: string; page: string; emailed: boolean };
export { MAX_MESSAGE };

const DIR = join(JOBS_ROOT, ".feedback");
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

const num = (k: string, d: number) => { const n = Number(process.env[k]); return Number.isFinite(n) && n > 0 ? n : d; };
const DAY = 86_400_000;
/** Per-visitor windows: [ms, max]. */
const WINDOWS: [number, number][] = [[30_000, 1], [3_600_000, 5], [DAY, 20]];
const hits = new Map<string, number[]>();
let day = { key: "", stored: 0, emailed: 0, seen: new Set<string>() };
const today = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

/** Seconds until this visitor may send again, or 0 (and the attempt is counted). */
export function feedbackRateLimit(ip: string, now = Date.now()): number {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < DAY);
  for (const [ms, max] of WINDOWS) {
    const inWindow = recent.filter((t) => now - t < ms);
    if (inWindow.length >= max) return Math.ceil((inWindow[0] + ms - now) / 1000);
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v[v.length - 1] > DAY) hits.delete(k);
  return 0;
}

/** Strip control characters other than newline and tab. */
const plain = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u2028\u2029\u202a-\u202e]/g, "");

export function cleanFeedback(body: { topic?: unknown; message?: unknown; email?: unknown; page?: unknown }): { topic: FeedbackTopic; message: string; email: string; page: string } | string {
  const topic = FEEDBACK_TOPICS.find((t) => t.id === body.topic)?.id ?? "idea";
  const message = plain(String(body.message ?? "").replace(/\r\n?/g, "\n")).replace(/\n{4,}/g, "\n\n\n").trim();
  const email = plain(String(body.email ?? "")).trim();
  const rawPage = String(body.page ?? "");
  const page = rawPage.startsWith("/") && !rawPage.startsWith("//") ? plain(rawPage).slice(0, 300) : "";
  if (message.length < 3) return "Write a few words first.";
  if (message.length > MAX_MESSAGE) return `Keep it under ${MAX_MESSAGE.toLocaleString("en-PH")} characters.`;
  if ((message.match(/https?:\/\/|www\./gi) ?? []).length > 3) return "Please include at most three links.";
  if (email && (email.length > 200 || !EMAIL.test(email))) return "That email address doesn't look right. Leave it empty to stay anonymous.";
  return { topic, message, email, page };
}

/** Today's budget and duplicate check. "drop": a repeat, accepted silently; "full": the daily cap is reached. */
export function feedbackAdmit(message: string): "ok" | "drop" | "full" {
  if (day.key !== today()) day = { key: today(), stored: 0, emailed: 0, seen: new Set() };
  const key = message.toLowerCase().replace(/\s+/g, " ");
  if (day.seen.has(key)) return "drop";
  if (day.stored >= num("FEEDBACK_DAILY_MAX", 200)) return "full";
  day.seen.add(key);
  day.stored++;
  return "ok";
}

export async function saveFeedback(input: { topic: FeedbackTopic; message: string; email: string; page: string }): Promise<Feedback> {
  const at = new Date().toISOString();
  const fb: Feedback = { id: randomUUID(), at, ...input, emailed: false };
  const mayEmail = day.emailed < num("FEEDBACK_EMAIL_DAILY_MAX", 50);
  if (mayEmail) day.emailed++;
  fb.emailed = mayEmail && await emailFeedback(fb).catch((e: Error) => { console.warn("[feedback] email failed:", e.message); return false; });
  await mkdir(DIR, { recursive: true });
  await appendFile(join(DIR, `${at.slice(0, 7)}.jsonl`), JSON.stringify(fb) + "\n");
  return fb;
}

/** Cloudflare Email Sending REST API. False when it is not configured. */
async function emailFeedback(fb: Feedback): Promise<boolean> {
  const { FEEDBACK_TO: to, FEEDBACK_FROM: from, CLOUDFLARE_EMAIL_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account } = process.env;
  if (!to || !from || !token || !account) return false;
  const pub = process.env.PUBLIC_ORIGIN ?? "https://regov.app";
  const text = `${topicLabel(fb.topic ?? "idea")}\n\n${fb.message}\n\n— ${fb.email || "anonymous"}${fb.page ? `, on ${pub}${fb.page}` : ""}\n${fb.at}`;
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/email/sending/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: { address: from, name: "RE:GOV feedback" },
      to: [to],
      ...(fb.email ? { reply_to: fb.email } : {}),
      subject: `RE:GOV feedback (${topicLabel(fb.topic ?? "idea").toLowerCase()}): ${fb.message.replace(/\s+/g, " ").slice(0, 60)}${fb.message.length > 60 ? "…" : ""}`, // one line: no header injection
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
