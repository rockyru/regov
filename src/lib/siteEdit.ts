/**
 * Human review of a rebuild: the editor at /edit/<job> saves a corrected site.json here. The first
 * save keeps the agent's version as site.generated.json so it can be restored. Saved files are
 * validated against the published site model (src/pipeline/schema.ts) and mirrored to R2 when set up.
 */
import { copyFile, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT } from "./jobs";
import { SiteModel } from "@/pipeline/schema";

const dir = (jobId: string) => (/^[\w.-]+$/.test(jobId) ? join(JOBS_ROOT, jobId) : null);

/** site.json as stored, without the load-time fixes and additions loadSite makes. */
export async function loadStoredSite(jobId: string): Promise<{ site: SiteModel; hasGenerated: boolean } | null> {
  const d = dir(jobId);
  if (!d) return null;
  try {
    const site = JSON.parse(await readFile(join(d, "site.json"), "utf8")) as SiteModel;
    const hasGenerated = await stat(join(d, "site.generated.json")).then(() => true, () => false);
    return { site, hasGenerated };
  } catch { return null; }
}

async function write(d: string, jobId: string, site: SiteModel) {
  const json = JSON.stringify(site, null, 2);
  await writeFile(join(d, "site.json.tmp"), json);
  await rename(join(d, "site.json.tmp"), join(d, "site.json"));
  try { const { pushFile } = await import("../../scripts/sync-jobs"); await pushFile(`${jobId}/site.json`, json); } catch { /* R2 not set up */ }
}

export async function saveEditedSite(jobId: string, input: unknown): Promise<{ ok: true; edited_at: string } | { ok: false; error: string }> {
  const d = dir(jobId);
  const stored = d && (await loadStoredSite(jobId));
  if (!d || !stored) return { ok: false, error: "No such site." };
  const parsed = SiteModel.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.slice(0, 3).map((i) => `${i.path.join(".") || "site"}: ${i.message}`).join("; ") };
  // Identity and provenance are not editable; render-time additions are never stored.
  const { portraits: _p, lang: _l, ...site } = parsed.data;
  void _p; void _l;
  const edited_at = new Date().toISOString();
  const next: SiteModel = { ...site, jobId: stored.site.jobId, origin: stored.site.origin, generated_at: stored.site.generated_at, edited_at };
  if (!stored.hasGenerated) await copyFile(join(d, "site.json"), join(d, "site.generated.json"));
  await write(d, jobId, next);
  return { ok: true, edited_at };
}

/** Put the agent's original back. */
export async function revertSite(jobId: string): Promise<boolean> {
  const d = dir(jobId);
  if (!d) return false;
  try {
    const original = JSON.parse(await readFile(join(d, "site.generated.json"), "utf8")) as SiteModel;
    await write(d, jobId, original);
    return true;
  } catch { return false; }
}
