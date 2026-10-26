import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { isGovernmentHost, normalizeSiteUrl } from "@/lib/govdomain";

export async function POST(req: Request) {
  const form = await req.formData();
  const raw = String(form.get("url") ?? "");
  const max = String(form.get("max") ?? "20");
  const parsed = normalizeSiteUrl(raw);
  // Relative redirects: behind the Worker the container sees 0.0.0.0:3000 as its own host.
  const go = (path: string) => new Response(null, { status: 303, headers: { Location: path } });
  if (!parsed) return go(`/?error=invalid&url=${encodeURIComponent(raw)}`);
  if (!isGovernmentHost(parsed.hostname)) return go(`/?error=notgov&url=${encodeURIComponent(parsed.hostname)}`);
  const url = parsed.toString();
  const host = parsed.hostname;
  const jobId = `${host.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`;
  const root = process.cwd();
  const args = [resolve(root, "node_modules/tsx/dist/cli.mjs"), "scripts/pipeline.ts", url, jobId, max];
  if (existsSync(resolve(root, ".env"))) args.unshift("--env-file=.env");
  const child = spawn(process.execPath, args, {
    cwd: root, detached: true, stdio: "ignore", env: { ...process.env },
  });
  child.unref();
  return go(`/jobs/${jobId}`);
}
