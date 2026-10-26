import { spawn } from "node:child_process";
import { resolve } from "node:path";

export async function POST(req: Request) {
  const form = await req.formData();
  let url = String(form.get("url") ?? "").trim();
  const max = String(form.get("max") ?? "20");
  if (!/^https?:\/\//i.test(url)) url = "https://" + url;
  let host: string;
  try { host = new URL(url).hostname; } catch { return new Response("bad url", { status: 400 }); }
  const jobId = `${host.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`;
  const root = process.cwd();
  const child = spawn(process.execPath, ["--env-file=.env", resolve(root, "node_modules/tsx/dist/cli.mjs"), "scripts/pipeline.ts", url, jobId, max], {
    cwd: root, detached: true, stdio: "ignore", env: { ...process.env },
  });
  child.unref();
  return Response.redirect(new URL(`/jobs/${jobId}`, req.url), 303);
}
