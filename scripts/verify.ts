// Self-check rebuilt sites against their originals (Muse Spark; cached per page).
//   npx tsx --env-file=.env scripts/verify.ts <jobId> [...]
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { verifySite } from "../src/pipeline/verify";

async function main() {
  for (const id of process.argv.slice(2)) {
    const t = Date.now();
    const site = JSON.parse(await readFile(join("jobs", id, "site.json"), "utf8"));
    const v = await verifySite(join("jobs", id), site);
    const by = (k: string) => v.pages.filter((p) => p.verdict === k).length;
    console.log(`${id}: ${v.pages.length} pages, average coverage ${v.average}%, ${by("faithful")} faithful / ${by("minor_gaps")} minor / ${by("major_gaps")} major, ${v.pages.reduce((n, p) => n + p.unsupported.length, 0)} unsupported statements, ${((Date.now() - t) / 1000).toFixed(0)}s`);
    for (const p of v.pages.filter((x) => x.unsupported.length)) console.log(`  ${p.slug}: ${p.unsupported.join(" | ")}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
