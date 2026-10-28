import { test } from "node:test";
import assert from "node:assert/strict";
import { isGovernmentHost, normalizeSiteUrl } from "../src/lib/govdomain";
import { optedOut } from "../src/lib/optout";

test("accepts Philippine and common government domains", () => {
  for (const h of ["dilg.gov.ph", "www.up.edu.ph", "army.mil.ph", "gov.ph", "usa.gov", "canada.gc.ca", "sat.gob.mx", "www.service.gov.uk"]) assert.equal(isGovernmentHost(h), true, h);
});

test("refuses everything else", () => {
  for (const h of ["example.com", "gov.ph.example.com", "govph.net", "notgov.ph"]) assert.equal(isGovernmentHost(h), false, h);
});

test("normalizes what people paste", () => {
  assert.equal(normalizeSiteUrl("  dilg.gov.ph/about ")?.href, "https://dilg.gov.ph/about");
  assert.equal(normalizeSiteUrl("http://x.gov.ph")?.protocol, "http:");
  assert.equal(normalizeSiteUrl("localhost"), null);
  assert.equal(normalizeSiteUrl(""), null);
});

test("opt-outs cover subdomains", () => {
  assert.equal(optedOut("https://www.pna.gov.ph/articles/1"), true);
  assert.equal(optedOut("news.pna.gov.ph"), true);
  assert.equal(optedOut("dilg.gov.ph"), false);
});
