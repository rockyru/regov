import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { JOBS_ROOT } from "@/lib/jobs";
import { assessDesign } from "@/pipeline/assess";

const g = globalThis as unknown as { __regovAssessing?: Set<string> };
/** Job ids whose design check is in progress in this process. */
export const assessing = (g.__regovAssessing ??= new Set<string>());
let chain: Promise<void> = Promise.resolve();

/** Queue the design check for a finished build: patch site.json, then mirror the changed files to R2. One at a time. */
export function applyDesignCheck(jobId: string) {
  assessing.add(jobId);
  chain = chain.then(async () => {
    try {
      const dir = join(JOBS_ROOT, jobId);
      const crawl = JSON.parse(await readFile(join(dir, "crawl.json"), "utf8")) as { pages: { viewportShotFile: string }[] };
      const { design } = await assessDesign(dir, crawl.pages[0].viewportShotFile);
      const site = JSON.parse(await readFile(join(dir, "site.json"), "utf8"));
      const json = JSON.stringify({ ...site, design }, null, 2);
      await writeFile(join(dir, "site.json"), json);
      const { pushFile } = await import("../../scripts/sync-jobs");
      await pushFile(`${jobId}/site.json`, json);
      if (design.hero) await pushFile(`${jobId}/${design.hero}`, await readFile(join(dir, design.hero)));
    } catch (e) {
      console.warn(`[design-check] ${jobId}:`, (e as Error).message);
    } finally {
      assessing.delete(jobId);
    }
  });
}
