import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { SiteModel, siteModelJsonSchema } from "../src/pipeline/schema";

test("the sample site is a valid site model", async () => {
  const site = JSON.parse(await readFile("fixtures/sample/site.json", "utf8"));
  SiteModel.parse(site);
});

test("every local job's site.json is a valid site model", async (t) => {
  const ids = existsSync("jobs") ? (await readdir("jobs")).filter((id) => existsSync(`jobs/${id}/site.json`)) : [];
  if (!ids.length) return t.skip("no local jobs");
  for (const id of ids) {
    const r = SiteModel.safeParse(JSON.parse(await readFile(`jobs/${id}/site.json`, "utf8")));
    assert.ok(r.success, `${id}: ${r.error?.issues.slice(0, 3).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  }
});

test("the published JSON Schema is up to date", async () => {
  const committed = await readFile("public/schema/site-model.v1.json", "utf8");
  assert.equal(committed, JSON.stringify(siteModelJsonSchema(), null, 2) + "\n", "run npx tsx scripts/schema.ts");
});
