// npx tsx scripts/crawl.ts https://cda.gov.ph [maxPages] [jobId]
import { crawl } from "../src/pipeline/crawl";
const [url, max = "12", jobId] = process.argv.slice(2);
if (!url) { console.error("usage: crawl.ts <url> [maxPages] [jobId]"); process.exit(1); }
const id = jobId ?? new URL(url).hostname.replace(/\W+/g, "-") + "-" + Date.now().toString(36);
const t = Date.now();
await_main();
async function await_main() {
  const r = await crawl(url, {
    jobId: id, maxPages: Number(max),
    onEvent: (e) => console.log(JSON.stringify(e)),
  });
  console.log(`\njob ${id}: ${r.pages.length} pages, ${r.skipped.length} skipped, wp-rest: ${r.wp ? `${r.wp.pages.length} pages / ${r.wp.posts.length} posts` : "none"} in ${((Date.now() - t) / 1000).toFixed(0)}s`);
}
