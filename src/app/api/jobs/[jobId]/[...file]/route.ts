import { readFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { JOBS_ROOT } from "@/lib/jobs";

const TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", json: "application/json", html: "text/html; charset=utf-8" };

export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string; file: string[] }> }) {
  const { jobId, file } = await ctx.params;
  const target = resolve(JOBS_ROOT, jobId, ...file);
  if (!target.startsWith(resolve(JOBS_ROOT, jobId) + sep)) return new Response("nope", { status: 400 });
  if (!/^(assets|shots)\//.test(file.join("/")) && file.join("/") !== "site.json") return new Response("not served", { status: 404 });
  try {
    // Screenshots are not restored at boot (see scripts/sync-jobs.ts): fetch from R2 on first use.
    let buf = await readFile(target).catch(() => null);
    if (!buf) {
      const { fetchToDisk } = await import("../../../../../../scripts/sync-jobs");
      if (await fetchToDisk(`${jobId}/${file.join("/")}`)) buf = await readFile(target);
    }
    if (!buf) throw new Error("missing");
    const ext = target.split(".").pop() ?? "";
    return new Response(new Uint8Array(buf), { headers: { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "no-cache" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
}
export const _unused = join;
