import { chromium } from "playwright";
const out = process.argv[2];
const b = await chromium.launch(); 
const shots = [
  ["cda-home", "http://localhost:3210/preview/cda-v2", 1440, 2400],
  ["lupao-home", "http://localhost:3210/preview/lupao", 1440, 2400],
  ["neust-home", "http://localhost:3210/preview/neust", 1440, 2400],
  ["cda-mobile", "http://localhost:3210/preview/cda-v2", 390, 1600],
];
for (const [name, url, w, h] of shots) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(url, { waitUntil: "networkidle", timeout: 90000 });
  await p.screenshot({ path: `${out}/${name}.png`, fullPage: false });
  if (name === "cda-home") {
    const links = await p.$$eval("main a[href^='/preview/cda-v2/']", (as) => as.map((a) => a.getAttribute("href")));
    await p.goto("http://localhost:3210" + links[0], { waitUntil: "networkidle", timeout: 90000 });
    await p.screenshot({ path: `${out}/cda-content.png`, fullPage: false });
    await p.goto(url, { waitUntil: "networkidle" });
    await p.hover("nav[aria-label=Primary] .group >> nth=1");
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/cda-mega.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${out}/cda-footer.png`, fullPage: false });
  }
  await p.close();
}
await b.close();
