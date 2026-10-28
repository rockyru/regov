import { test } from "node:test";
import assert from "node:assert/strict";
import { crawlQuality, MIN_CHARS } from "../src/pipeline/quality";

const page = (chars: number) => ({ text: "x".repeat(chars) }) as never;

test("no pages, or too little text, is insufficient", () => {
  assert.equal(crawlQuality({ pages: [], skipped: [] }).status, "insufficient");
  assert.equal(crawlQuality({ pages: [page(MIN_CHARS - 1)], skipped: [] }).status, "insufficient");
  assert.equal(crawlQuality({ pages: [page(150), page(150), page(150), page(150), page(150), page(150), page(150), page(150), page(150), page(150), page(150)], skipped: [] }).status, "insufficient");
});

test("enough text and nothing missed is complete", () => {
  const q = crawlQuality({ pages: [page(1000), page(1000)], skipped: [] });
  assert.equal(q.status, "complete");
  assert.equal(q.chars, 2000);
});

test("pages left uncollected make it partial, with the reason", () => {
  const q = crawlQuality({ pages: [page(2000)], skipped: [], coverage: { discovered: 120, crawled: 30, limit: 30, not_reached: 90, robots: 1, failed: 0, empty: 0 } as never });
  assert.equal(q.status, "partial");
  assert.match(q.reasons[0], /30 of the 120 pages/);
  assert.match(q.reasons[1], /1 page is excluded by the site's robots\.txt/);
});
