import { test } from "node:test";
import assert from "node:assert/strict";
import { termsLinks } from "../src/pipeline/terms";

const ORIGIN = "https://www.example.gov.ph";

test("finds terms pages on the same site, terms before legal before disclaimers", () => {
  const out = termsLinks([
    { text: "Disclaimer", href: "https://example.gov.ph/disclaimer/" },
    { text: "Terms of Use", href: "https://www.example.gov.ph/terms-of-use/" },
    { text: "Legal", href: "https://www.example.gov.ph/legal#top" },
  ], ORIGIN, false);
  assert.deepEqual(out, ["https://www.example.gov.ph/terms-of-use/", "https://www.example.gov.ph/legal"]);
});

test("skips privacy and cookie pages, other sites, and documents", () => {
  const out = termsLinks([
    { text: "Privacy policy and terms", href: "https://www.example.gov.ph/privacy/" },
    { text: "Terms", href: "https://other.gov.ph/terms" },
    { text: "Terms of use", href: "https://www.example.gov.ph/files/terms.pdf" },
  ], ORIGIN, false);
  assert.deepEqual(out, []);
});

test("'illegal' in a news slug is not a legal notice", () => {
  assert.deepEqual(termsLinks([{ text: "Illegal logging stopped", href: "https://www.example.gov.ph/news/illegal-logging" }], ORIGIN, false), []);
});

test("reads links through the Wayback Machine in archive mode", () => {
  const out = termsLinks([{ text: "Terms", href: "https://web.archive.org/web/20240101000000/https://www.example.gov.ph/terms/" }], ORIGIN, true);
  assert.equal(out.length, 1);
  assert.match(out[0], /^https:\/\/www\.example\.gov\.ph\/terms\/?$/);
});
