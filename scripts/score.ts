// Before/after homepage measurements (speed, weight, axe-core). Free, no model calls.
//   npx tsx --env-file=.env scripts/score.ts <jobId> [...]     one or more sites
//   npx tsx --env-file=.env scripts/score.ts --all [--missing] every finished site (or only unscored ones)
// Needs the app running (SCORE_BASE, else PUBLIC_ORIGIN, else the local app). Mirrors results to R2.
import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { scoreSite, fmtMs, fmtBytes, type Metrics } from "../src/pipeline/scores";
import { pushFile } from "./sync-jobs";

async function main() {
  const args = process.argv.slice(2);
  const all = args[0] === "--all", missing = args.includes("--missing");
  const ids = all ? (await readdir("jobs")).filter((id) => existsSync(join("jobs", id, "site.json")) && !(missing && existsSync(join("jobs", id, "assets/scores.json")))) : args;
  let n = 0;
  for (const id of ids) {
    const s = await scoreSite(join("jobs", id), id).catch((e) => { console.warn(id, (e as Error).message); return null; });
    const side = (m: Metrics | null) => (m ? `${fmtMs(m.load_ms)} ${fmtBytes(m.bytes)} ${m.requests}req axe ${m.axe_violations}` : "–");
    console.log(`${++n}/${ids.length} ${id}: ${s ? `${side(s.original)} → ${side(s.rebuilt)}` : "failed"}`);
    if (s) await pushFile(`${id}/assets/scores.json`, await readFile(join("jobs", id, "assets/scores.json"))).catch(() => {});
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
