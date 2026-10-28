import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { markdownFiles, pageMarkdown } from "../src/lib/exportMarkdown";
import { redirectMap } from "../src/lib/exportSite";
import type { SiteModel } from "../src/pipeline/schema";

const load = async () => JSON.parse(await readFile("fixtures/sample/site.json", "utf8")) as SiteModel;

test("one Markdown file per page, plus the model, redirects and a README", async () => {
  const site = await load();
  const files = [...markdownFiles(site).keys()];
  assert.ok(files.includes("content/index.md"));
  assert.ok(files.includes("content/services/business-permit.md"));
  assert.equal(files.filter((f) => f.startsWith("content/")).length, site.pages.length);
  for (const f of ["site.json", "redirects.csv", "README.md"]) assert.ok(files.includes(f), f);
});

test("front matter is valid YAML-quoted and blocks become Markdown", async () => {
  const site = await load();
  const md = pageMarkdown(site, site.pages.find((p) => p.slug === "services/business-permit")!);
  assert.match(md, /^---\ntitle: "Business permit"\n/);
  assert.match(md, /unofficial_concept: true/);
  assert.match(md, /## How to apply\n\n1\. \*\*Fill in the unified form\*\*: Get it/);
  assert.match(md, /\| Sari-sari store \| ₱500 \|/);
});

test("redirects map old addresses to new pages, and skip ones that did not move", async () => {
  const map = redirectMap(await load());
  assert.deepEqual(map.find(([f]) => f === "/index.php?page=permits"), ["/index.php?page=permits", "/services/business-permit/"]);
  assert.equal(map.some(([f]) => f === "/about/"), false);
});
