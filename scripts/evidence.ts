// Outline accessibility problems on old homepages for the report (Muse Spark picks, SAM 3.1 finds; cached).
//   npx tsx --env-file=.env scripts/evidence.ts <jobId> [...]
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findEvidence } from "../src/pipeline/evidence";
import { withUsage } from "../src/lib/usage";

async function main() {
  for (const id of process.argv.slice(2)) {
    const site = JSON.parse(await readFile(join("jobs", id, "site.json"), "utf8"));
    const e = await withUsage(join("jobs", id), "run", "evidence", () => findEvidence(join("jobs", id), site));
    console.log(`${id}: ${e ? e.items.length : 0} outlined`);
    for (const x of e?.items ?? []) console.log(`  ${x.n}. [${x.prompt}] ${x.label} (${x.confidence.toFixed(2)}) · ${x.sc.join(", ") || "best practice"}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
