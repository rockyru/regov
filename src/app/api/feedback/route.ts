import { cleanFeedback, feedbackAdmit, feedbackRateLimit, saveFeedback } from "@/lib/feedback";
import { verifyTurnstile } from "@/lib/turnstile";

const MAX_BODY = 16_000;
/** Faster than a person can open the box and type. */
const MIN_ELAPSED_MS = 2_500;

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

/** Only the RE:GOV pages themselves may post: browsers always send Origin on a fetch POST. */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try { return new URL(origin).host === host; } catch { return false; }
}

const ok = () => Response.json({ ok: true });
const no = (error: string, status: number, headers?: HeadersInit) => Response.json({ error }, { status, headers });

/**
 * A comment from the feedback box. JSON: { topic, message, email?, page?, elapsed (ms the box was open), website (honeypot), turnstile (token) }.
 * Bots that trip the honeypot or the timer, and repeats, get a normal "ok" so they learn nothing.
 */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return no("Not allowed.", 403);
  if (!(req.headers.get("content-type") ?? "").startsWith("application/json")) return no("Send JSON.", 415);
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return no("That is too long.", 413);
  const raw = await req.text();
  if (raw.length > MAX_BODY) return no("That is too long.", 413);
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return no("Send JSON.", 400); }
  if (!body || typeof body !== "object") return no("Send JSON.", 400);

  if (body.website || Number(body.elapsed ?? 0) < MIN_ELAPSED_MS) return ok();
  const fb = cleanFeedback(body);
  if (typeof fb === "string") return no(fb, 400);
  const wait = feedbackRateLimit(clientIp(req));
  if (wait) return no(wait > 120 ? "Thanks, that's plenty for now. Please try again later." : `Please wait ${wait} seconds before sending another.`, 429, { "retry-after": String(wait) });
  if (!(await verifyTurnstile(body.turnstile, "feedback", clientIp(req)))) return no("We couldn't confirm you're a person. Please try again.", 403);
  const admit = feedbackAdmit(fb.message);
  if (admit === "drop") return ok();
  if (admit === "full") return no("The comment box is full for today. Please write to hello@regov.app instead.", 503);
  await saveFeedback(fb);
  return ok();
}
