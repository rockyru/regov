import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRobots, robotsFrom } from "../src/pipeline/robots";

const TXT = `
User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php
Disallow: /*.pdf$
Crawl-delay: 2

User-agent: BadBot
Disallow: /

Sitemap: https://example.gov.ph/sitemap.xml
`;

test("uses the * group when no group names REGOVBot", () => {
  const r = robotsFrom("rules", TXT);
  assert.equal(r.allows("https://example.gov.ph/about/"), true);
  assert.equal(r.allows("https://example.gov.ph/wp-admin/options.php"), false);
  assert.equal(r.delayMs, 2000);
  assert.equal(r.blocksSite, false);
  assert.deepEqual(r.sitemaps, ["https://example.gov.ph/sitemap.xml"]);
});

test("the longest match wins, and Allow wins a tie", () => {
  const r = robotsFrom("rules", TXT);
  assert.equal(r.allows("https://example.gov.ph/wp-admin/admin-ajax.php"), true);
  const tie = robotsFrom("rules", "User-agent: *\nDisallow: /a\nAllow: /a\n");
  assert.equal(tie.allows("https://x.gov.ph/a"), true);
});

test("* and $ patterns", () => {
  const r = robotsFrom("rules", TXT);
  assert.equal(r.allows("https://example.gov.ph/files/report.pdf"), false);
  assert.equal(r.allows("https://example.gov.ph/files/report.pdf?download=1"), true);
});

test("a group naming REGOVBot replaces the * group", () => {
  const r = robotsFrom("rules", "User-agent: *\nDisallow: /\n\nUser-agent: regovbot\nDisallow: /private\n");
  assert.equal(r.allows("https://x.gov.ph/"), true);
  assert.equal(r.allows("https://x.gov.ph/private/a"), false);
});

test("consecutive User-agent lines share one group", () => {
  const { rules } = parseRobots("User-agent: Googlebot\nUser-agent: REGOVBot\nDisallow: /x\n");
  assert.equal(rules.length, 1);
});

test("Disallow: / blocks the whole site; robots.txt itself stays readable", () => {
  const r = robotsFrom("rules", "User-agent: *\nDisallow: /\n");
  assert.equal(r.blocksSite, true);
  assert.equal(r.allows("https://x.gov.ph/robots.txt"), true);
});

test("a missing file allows everything; an unreachable one allows nothing", () => {
  assert.equal(robotsFrom("none").allows("https://x.gov.ph/anything"), true);
  assert.equal(robotsFrom("unreachable").allows("https://x.gov.ph/"), false);
});

test("crawl-delay is capped at 30 seconds", () => {
  assert.equal(robotsFrom("rules", "User-agent: *\nCrawl-delay: 120\n").delayMs, 30_000);
});
