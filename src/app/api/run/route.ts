import { isGovernmentHost, normalizeSiteUrl } from "@/lib/govdomain";
import { runQueue } from "@/lib/runQueue";
import { optedOut } from "@/lib/optout";
import { loadRobots } from "@/pipeline/robots";
import { verifyTurnstile } from "@/lib/turnstile";

function clientIp(req: Request) {
  return req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip") || req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
}

export async function POST(req: Request) {
  const form = await req.formData();
  const raw = String(form.get("url") ?? "");
  const max = String(Math.min(Math.max(Number(form.get("max")) || 20, 1), 40));
  const parsed = normalizeSiteUrl(raw);
  // Behind the Worker the container sees 0.0.0.0:3000 as its own host, so build redirects from the public origin.
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  const origin = process.env.PUBLIC_ORIGIN || (fwdHost ? `${fwdProto}://${fwdHost}` : new URL(req.url).origin);
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: new URL(path, origin).toString() } });
  if (!parsed) return go(`/?error=invalid&url=${encodeURIComponent(raw)}`);
  if (!isGovernmentHost(parsed.hostname)) return go(`/?error=notgov&url=${encodeURIComponent(parsed.hostname)}`);
  const url = parsed.toString();
  const host = parsed.hostname;

  if (process.env.SUBMISSIONS === "paused") return go(`/?error=paused&url=${encodeURIComponent(host)}`);
  if (optedOut(host)) return go(`/?error=optout&url=${encodeURIComponent(host)}`);

  // Same site already in flight, waiting, or rebuilt recently: show that run instead of starting another.
  const existing = runQueue.existing(host);
  if (existing) return go(`/jobs/${existing.jobId}?existing=${existing.state}`);

  // Daily budget (Meta credits), then per-visitor limit, then overall capacity.
  if (runQueue.quotaLeft === 0) return go(`/?error=quota&url=${encodeURIComponent(host)}`);

  // Per-visitor limit, then overall capacity. Both are cheap to hit and cheap to recover from.
  const wait = runQueue.rateLimit(clientIp(req));
  if (wait > 0) return go(`/?error=ratelimit&wait=${wait}&url=${encodeURIComponent(host)}`);
  if (runQueue.full) return go(`/?error=busy&url=${encodeURIComponent(host)}`);
  // A person, not a script: each run spends model credit (src/lib/turnstile.ts).
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), "reimagine", clientIp(req)))) return go(`/?error=verify&url=${encodeURIComponent(host)}`);
  // A site whose robots.txt shuts REGOVBot out is refused here; the pipeline checks again (and checks the terms) before crawling.
  if ((await loadRobots(parsed.origin)).blocksSite) return go(`/?error=robots&url=${encodeURIComponent(host)}`);

  const jobId = `${host.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`;
  runQueue.enqueue({ jobId, url, host, max, ip: clientIp(req) });
  return go(`/jobs/${jobId}`);
}

/** Capacity readout for the UI and for operators. */
export async function GET() {
  return Response.json(runQueue.snapshot(), { headers: { "cache-control": "no-store" } });
}
