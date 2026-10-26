// npx tsx --env-file=.env scripts/run.ts <jobId>   (job must have crawl.json)
import { buildSite } from "../src/pipeline/build";
const jobId = process.argv[2];
if (!jobId) { console.error("usage: run.ts <jobId>"); process.exit(1); }
buildSite(jobId, (e) => console.log(JSON.stringify(e))).catch((e) => { console.error(e); process.exit(1); });
