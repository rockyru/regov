import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { isGovernmentHost, normalizeSiteUrl } from "@/lib/govdomain";

export async function POST(req: Request) {
  const form = await req.formData();
  const raw = String(form.get("url") ?? "");
  const max = String(form.get("max") ?? "20");
  const parsed = normalizeSiteUrl(raw);
  if (!parsed) return Response.redirect(new URL(`/?error=invalid&url=${encodeURIComponent(raw)}`, req.url), 303);
  if (!isGovernmentHost(parsed.hostname)) return Response.redirect(new URL(`/?error=notgov&url=${encodeURIComponent(parsed.hostname)}`, req.url), 303);
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
  return Response.redirect(new URL(`/jobs/${jobId}`, req.url), 303);
}
