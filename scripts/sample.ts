// Install the fictional sample site (fixtures/sample: Bayan ng Halimbawa) as job "sample", so the
// app, the report, the review editor and the exports can be tried without a model key.
//   npx tsx scripts/sample.ts      then open http://localhost:3000/preview/sample
import { cp, rm } from "node:fs/promises";

async function main() {
  await rm("jobs/sample", { recursive: true, force: true });
  await cp("fixtures/sample", "jobs/sample", { recursive: true });
  console.log("installed jobs/sample: /preview/sample, /report/sample, /edit/sample");
}
main().catch((e) => { console.error(e); process.exit(1); });
