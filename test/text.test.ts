import { test } from "node:test";
import assert from "node:assert/strict";
import { slugOf } from "../src/pipeline/slug";
import { fixPage, isBareAddress } from "../src/pipeline/titles";
import { personKey } from "../src/lib/people";
import { scrubLoneSurrogates } from "../src/lib/meta";
import { locs } from "../src/pipeline/sitemap";
import { wcagForFinding, scFromAxeTag } from "../src/pipeline/wcag";

test("slugs from URLs", () => {
  assert.equal(slugOf("https://x.gov.ph/"), "home");
  assert.equal(slugOf("https://x.gov.ph/About-Us/Mandate.php"), "about-us/mandate");
  assert.equal(slugOf("https://x.gov.ph/index.php?page=forms&utm_source=fb"), "index/page-forms");
});

test("address-only titles are replaced", () => {
  assert.equal(isBareAddress("info@x.gov.ph"), true);
  assert.equal(isBareAddress("Contact us"), false);
  const p = fixPage({ title: "info@x.gov.ph", slug: "contact-us", page_type: "contact", section: "", hero: { heading: "info@x.gov.ph", subheading: "", primary_cta_label: "", primary_cta_href: "" } });
  assert.equal(p.title, "Contact Us");
  assert.equal(p.hero.heading, "Contact Us");
});

test("one key per person across spellings", () => {
  assert.equal(personKey("Hon. Alfredo B. Castro Jr."), personKey("ALFREDO B. CASTRO JR"));
});

test("lone surrogate escapes are dropped, pairs kept", () => {
  assert.equal(scrubLoneSurrogates(String.raw`"a\ud83d"`), `"a"`);
  assert.equal(scrubLoneSurrogates(String.raw`"😀"`), String.raw`"😀"`);
});

test("sitemap <loc> values, CDATA and entities unwrapped", () => {
  assert.deepEqual(locs("<urlset><url><loc> https://x.gov.ph/a?b=1&amp;c=2 </loc></url><url><loc><![CDATA[https://x.gov.ph/b]]></loc></url></urlset>"), ["https://x.gov.ph/a?b=1&c=2", "https://x.gov.ph/b"]);
});

test("WCAG criteria from findings and axe tags", () => {
  assert.deepEqual(wcagForFinding("Low contrast grey text"), ["1.4.3"]);
  assert.deepEqual(wcagForFinding("Fails 2.4.4 and 9.9.9"), ["2.4.4"]);
  assert.equal(scFromAxeTag("wcag1410"), "1.4.10");
  assert.equal(scFromAxeTag("best-practice"), null);
});
