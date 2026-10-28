// Accessibility gate: run axe-core (WCAG 2.2 A/AA) on every page of one or more rebuilt sites, at
// desktop and phone widths, and fail when any violation is serious or critical. CI runs it on the
// fictional sample site, so a template change that breaks accessibility fails the pull request.
//   npx tsx scripts/a11y.ts                     the sample site (npm run sample first)
//   npx tsx scripts/a11y.ts <jobId> [...]       other sites
//   --base http://127.0.0.1:3000                where the app answers (default AUDIT_BASE or :3000)
//   --impact moderate                           also fail on moderate violations
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { axeAudit } from "../src/pipeline/wcag";
import { auditBase } from "../src/pipeline/audit";

const ORDER = ["minor", "moderate", "serious", "critical"];

async function main() {
  const args = process.argv.slice(2);
  const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args.splice(i, 2)[1] : undefined; };
  const base = opt("base") ?? auditBase();
  const floor = ORDER.indexOf(opt("impact") ?? "serious");
  const ids = (args.length ? args : ["sample"]).filter((id) => existsSync(join("jobs", id, "site.json")));
  const browser = await chromium.launch();
  let failures = 0, checked = 0;
  try {
    for (const id of ids) {
      const site = JSON.parse(await readFile(join("jobs", id, "site.json"), "utf8")) as { pages: { slug: string }[] };
      const paths = [...site.pages.map((p) => (p.slug === "home" ? "" : `/${p.slug}`)), "/hotlines"];
      for (const [label, viewport] of [["desktop", { width: 1280, height: 900 }], ["phone", { width: 390, height: 844 }]] as const) {
        const page = await browser.newPage({ viewport });
        for (const path of paths) {
          const url = `${base}/preview/${id}${path}?lang=en`;
          const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
          if (!res?.ok()) { console.log(`✗ ${url} answered ${res?.status()}`); failures++; continue; }
          const bad = (await axeAudit(page)).violations.filter((v) => ORDER.indexOf(v.impact) >= floor);
          checked++;
          for (const v of bad) console.log(`✗ ${id}${path || "/"} (${label}) ${v.impact} ${v.id}: ${v.help} [${v.sc.join(", ") || "best practice"}] × ${v.nodes}`);
          failures += bad.length;
        }
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`${checked} page views checked, ${failures} ${failures === 1 ? "problem" : "problems"} at ${ORDER[floor]} or worse`);
  process.exit(failures ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
