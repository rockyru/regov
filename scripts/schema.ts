// Write the published JSON Schema for site.json (src/pipeline/schema.ts) to public/schema/.
//   npx tsx scripts/schema.ts           write it
//   npx tsx scripts/schema.ts --check   fail if the committed file is out of date (CI)
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { siteModelJsonSchema, SITE_MODEL_VERSION } from "../src/pipeline/schema";

const file = `public/schema/site-model.v${SITE_MODEL_VERSION}.json`;
const json = JSON.stringify(siteModelJsonSchema(), null, 2) + "\n";

async function main() {
  if (process.argv.includes("--check")) {
    if ((await readFile(file, "utf8").catch(() => "")) !== json) { console.error(`${file} is out of date: run npx tsx scripts/schema.ts`); process.exit(1); }
    console.log(`${file} is up to date`);
    return;
  }
  await mkdir("public/schema", { recursive: true });
  await writeFile(file, json);
  console.log(`wrote ${file}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
