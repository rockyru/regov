import { cleanFeedback, feedbackRateLimited, saveFeedback } from "@/lib/feedback";

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

/** A comment from the feedback box. JSON: { message, email?, page?, website? (honeypot) }. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });
  if (body.website) return Response.json({ ok: true }); // bots fill every field
  const fb = cleanFeedback(body);
  if (typeof fb === "string") return Response.json({ error: fb }, { status: 400 });
  if (feedbackRateLimited(clientIp(req))) return Response.json({ error: "Thanks, that's plenty for now. Please try again in an hour." }, { status: 429 });
  await saveFeedback(fb);
  return Response.json({ ok: true });
}
