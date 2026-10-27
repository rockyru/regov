// Read the Citizen's Charter PDFs linked from rebuilt sites into service pages (Muse Spark; cached per PDF).
//   npx tsx --env-file=.env scripts/charter.ts <jobId> [...]
import { join } from "node:path";
import { readCharters } from "../src/pipeline/charter";
import { withUsage } from "../src/lib/usage";

async function main() {
  for (const id of process.argv.slice(2)) {
    const t = Date.now();
    const c = await withUsage(join("jobs", id), "run", "charter", () => readCharters(join("jobs", id), (url, n) => console.log(`  ${n} services · ${decodeURIComponent(url.split("/").pop() ?? url)}`)));
    console.log(`${id}: ${c.docs.length} documents, ${c.docs.reduce((n, d) => n + d.services.length, 0)} services, ${c.skipped.length} skipped, ${((Date.now() - t) / 1000).toFixed(0)}s`);
    for (const s of c.skipped) console.log(`  skipped ${s.url}: ${s.reason}`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
