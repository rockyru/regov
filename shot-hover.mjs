import { chromium } from "/Users/rutherbergonia/dev/meta-hackaton/node_modules/playwright/index.mjs";
const [url, out, hoverText, width = "1440"] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: Number(width), height: 900 } });
await p.goto(url, { waitUntil: "networkidle" });
if (hoverText) {
  const el = p.locator('nav[aria-label="Primary"] a, nav[aria-label="Primary"] button').filter({ hasText: new RegExp("^" + hoverText) }).first();
  await el.hover(); await p.waitForTimeout(500);
}
await p.screenshot({ path: out, fullPage: false }); await b.close();
