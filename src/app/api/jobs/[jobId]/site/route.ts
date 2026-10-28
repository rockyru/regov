import { isAdmin } from "@/lib/admin";
import { loadStoredSite, revertSite, saveEditedSite } from "@/lib/siteEdit";

type Ctx = { params: Promise<{ jobId: string }> };
const denied = () => Response.json({ error: "Not allowed." }, { status: 403 });

/** The stored site.json, for the review editor and other tools. Operator only. */
export async function GET(req: Request, ctx: Ctx) {
  if (!isAdmin(req.headers.get("x-admin-token"))) return denied();
  const out = await loadStoredSite((await ctx.params).jobId);
  return out ? Response.json(out.site) : Response.json({ error: "No such site." }, { status: 404 });
}

/** Save an edited site.json (body: the site model), or { "revert": true } to restore the agent's version. Operator only. */
export async function PUT(req: Request, ctx: Ctx) {
  if (!isAdmin(req.headers.get("x-admin-token"))) return denied();
  const { jobId } = await ctx.params;
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return Response.json({ error: "Send JSON." }, { status: 400 });
  if (body.revert === true) return (await revertSite(jobId)) ? Response.json({ ok: true }) : Response.json({ error: "There is no generated version to restore." }, { status: 409 });
  const r = await saveEditedSite(jobId, body);
  return r.ok ? Response.json(r) : Response.json({ error: r.error }, { status: 400 });
}
