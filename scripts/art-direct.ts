// Art-direct the homepage of refined sites (Muse Spark spec + Muse Image backdrop).
//   npx tsx --env-file=.env scripts/art-direct.ts <jobId> [...] [--keep-image]
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SiteModel } from "../src/pipeline/schema";
import { artDirect } from "../src/pipeline/artDirect";

async function main() {
  const args = process.argv.slice(2), keepImage = args.includes("--keep-image");
  for (const id of args.filter((a) => !a.startsWith("--"))) {
    const file = join("jobs", id, "site.json");
    const site = JSON.parse(await readFile(file, "utf8")) as SiteModel;
    if (site.design?.mode !== "refine") { console.log(`${id}: not a refined site, skipped`); continue; }
    const { art, usage } = await artDirect(join("jobs", id), site, { keepImage });
    site.design = { ...site.design, art };
    await writeFile(file, JSON.stringify(site, null, 2));
    console.log(`${id}: ${usage} tokens`, JSON.stringify(art, null, 2));
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
