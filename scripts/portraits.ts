// Find officials' photos on rebuilt sites (SAM 3.1 finds them, Muse Spark names them; cached).
//   npx tsx --env-file=.env scripts/portraits.ts <jobId> [...]
// Needs the full-page screenshots (shots/NNN.png) of the crawl.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { findPortraits } from "../src/pipeline/portraits";

async function main() {
  for (const id of process.argv.slice(2)) {
    const t = Date.now();
    const site = JSON.parse(await readFile(join("jobs", id, "site.json"), "utf8"));
    const p = await findPortraits(join("jobs", id), site);
    console.log(`${id}: ${p.people.length} named of ${p.checked} photos in ${((Date.now() - t) / 1000).toFixed(0)}s`);
    for (const x of p.people) console.log(`  ${x.name} · ${x.page} · ${x.alt}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
