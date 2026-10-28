import { exportSite, exportName } from "@/lib/exportSite";
import { exportMarkdown } from "@/lib/exportMarkdown";

/**
 * Download the rebuilt site as a .zip. Default: static HTML (built once per site version, then served
 * from disk). ?format=markdown: the content as Markdown files with front matter, plus site.json.
 */
export async function GET(req: Request, ctx: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await ctx.params;
  const markdown = new URL(req.url).searchParams.get("format") === "markdown";
  const out = await (markdown ? exportMarkdown(jobId) : exportSite(jobId)).catch((e: Error) => { console.warn("[export]", jobId, e.message); return undefined; });
  if (out === null) return new Response("not found", { status: 404 });
  if (!out) return new Response("The export could not be built just now. Please try again.", { status: 503 });
  const name = markdown ? exportName(out.site).replace(/\.zip$/, "-content.zip") : exportName(out.site);
  return new Response(new Uint8Array(out.zip), { headers: { "content-type": "application/zip", "content-disposition": `attachment; filename="${name}"`, "cache-control": "no-store" } });
}
