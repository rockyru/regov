// Audit rebuilt sites against WCAG 2.2 A/AA with axe-core (free, no model calls).
//   npx tsx --env-file=.env scripts/audit-rebuilt.ts <jobId> [...]     one or more sites
//   npx tsx --env-file=.env scripts/audit-rebuilt.ts --all             every finished site
// Needs the app running (AUDIT_BASE, default http://127.0.0.1:$PORT or :3000). Mirrors results to R2.
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { auditRebuilt } from "../src/pipeline/audit";
import { pushFile } from "./sync-jobs";

async function main() {
  const args = process.argv.slice(2);
  const ids = args[0] === "--all" ? (await readdir("jobs")).filter((id) => existsSync(join("jobs", id, "site.json"))) : args;
  let n = 0;
  for (const id of ids) {
    const a = await auditRebuilt(join("jobs", id), id);
    const v = a.pages.reduce((t, p) => t + p.violations.length, 0);
    console.log(`${++n}/${ids.length} ${id}: ${a.pages.length} pages, ${v} violations`);
    await pushFile(`${id}/assets/wcag.json`, await readFile(join("jobs", id, "assets/wcag.json"))).catch(() => {});
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
