import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { cached, ReplayMissError } from "../src/pipeline/cache";

test("records an answer once, then replays it; replay mode refuses to call on a miss", async () => {
  const dir = await mkdtemp(join(tmpdir(), "regov-cache-"));
  try {
    let calls = 0;
    const fn = async () => ({ n: ++calls });
    assert.deepEqual(await cached(dir, ["k"], fn), { n: 1 });
    assert.deepEqual(await cached(dir, ["k"], fn), { n: 1 });
    process.env.MODEL_CACHE = "replay";
    assert.deepEqual(await cached(dir, ["k"], fn), { n: 1 });
    await assert.rejects(cached(dir, ["other"], fn), ReplayMissError);
    assert.equal(calls, 1);
  } finally {
    delete process.env.MODEL_CACHE;
    await rm(dir, { recursive: true, force: true });
  }
});
