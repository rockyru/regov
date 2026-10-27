import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { isGovernmentHost, normalizeSiteUrl } from "@/lib/govdomain";
import { runQueue } from "@/lib/runQueue";
import { isAdmin } from "@/lib/admin";
import { JOBS_ROOT } from "@/lib/jobs";
import { assessing, applyDesignCheck } from "@/lib/designCheck";

/**
 * Operator actions on existing runs (token required).
 * - rerun: full pipeline again. Skips the daily quota, per-visitor limit, queue cap and 24-hour
 *   dedupe that /api/run applies. Sites already running or waiting are left alone.
 * - assess: run only the design check on a finished build and patch its site.json (cheap).
 */
export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  if (!isAdmin(token)) return new Response("Forbidden", { status: 403 });
  const fwdHost = req.headers.get("x-forwarded-host");
  const origin = process.env.PUBLIC_ORIGIN || (fwdHost ? `${req.headers.get("x-forwarded-proto") ?? "https"}://${fwdHost}` : new URL(req.url).origin);
  const action = form.get("action") === "assess" ? "assess" : "rerun";
  const ids = form.getAll("job").map(String).filter((id) => /^[\w.-]+$/.test(id));
  let n = 0;
  if (action === "assess") {
    for (const id of ids) if (!assessing.has(id)) { applyDesignCheck(id); n++; }
  } else {
    for (const id of ids) {
      const status = await readFile(join(JOBS_ROOT, id, "status.json"), "utf8").then(JSON.parse).catch(() => null) as { url?: string } | null;
      const site = status?.url ? null : await readFile(join(JOBS_ROOT, id, "site.json"), "utf8").then(JSON.parse).catch(() => null) as { origin?: string } | null;
      const parsed = normalizeSiteUrl(status?.url ?? site?.origin ?? "");
      if (!parsed || !isGovernmentHost(parsed.hostname)) continue;
      const busy = runQueue.existing(parsed.hostname);
      if (busy && busy.state !== "done") continue;
      const host = parsed.hostname;
      runQueue.enqueue({ jobId: `${host.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}${n}`, url: parsed.toString(), host, max: "20", ip: "admin" });
      n++;
    }
  }
  return new Response(null, { status: 303, headers: { Location: new URL(`/admin?token=${encodeURIComponent(token)}&${action}=${n}`, origin).toString() } });
}
