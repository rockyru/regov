// Prepare the Filipino edition of rebuilt sites ahead of visitors (Muse Spark; cached per chunk).
//   npx tsx --env-file=.env scripts/translate.ts <jobId> [--all-pages] [...]
// Without --all-pages only the site strings and the homepage; other pages translate on first visit.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SiteModel } from "../src/pipeline/schema";
import { translateSite, translatePage } from "../src/pipeline/translate";
import { pmap } from "../src/pipeline/cache";

async function main() {
  const args = process.argv.slice(2);
  const allPages = args.includes("--all-pages");
  for (const id of args.filter((a) => !a.startsWith("--"))) {
    const dir = join("jobs", id), t = Date.now();
    const site = JSON.parse(await readFile(join(dir, "site.json"), "utf8")) as SiteModel;
    const pages = allPages ? site.pages : site.pages.filter((p) => p.slug === "home");
    await Promise.all([translateSite(dir, site), pmap(pages, 3, (p) => translatePage(dir, p))]); // counted per chunk in translate.ts
    console.log(`${id}: site strings + ${pages.length} pages in ${((Date.now() - t) / 1000).toFixed(0)}s`);
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
