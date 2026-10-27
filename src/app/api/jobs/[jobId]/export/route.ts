import { exportSite, exportName } from "@/lib/exportSite";

/** Download the rebuilt site as a static .zip (built once per site version, then served from disk). */
export async function GET(_req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const out = await exportSite(jobId).catch((e: Error) => { console.warn("[export]", jobId, e.message); return undefined; });
  if (out === null) return new Response("not found", { status: 404 });
  if (!out) return new Response("The export could not be built just now. Please try again.", { status: 503 });
  return new Response(new Uint8Array(out.zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${exportName(out.site)}"`, "cache-control": "no-store" } });
}
