/**
 * Day-1 smoke test: proves the Meta Model API works from this machine and
 * that the three calls the pipeline depends on behave as documented.
 *   npx tsx --env-file=.env scripts/smoke.ts
 */
import { meta, MUSE, SAM } from "../src/lib/meta";
import { parseImageStream, recordsOfKind } from "@meta-sam/parser";

import { readFileSync } from "node:fs";
// Inline base64, same as the pipeline will do with local screenshots (remote origins may refuse Meta's fetcher).
const IMG_PATH = process.argv[2] ?? "scripts/fixtures/sample-page.png";
const IMG = `data:image/png;base64,${readFileSync(IMG_PATH).toString("base64")}`;

async function sparkText() {
  const t = Date.now();
  const r = await meta.responses.create({
    model: MUSE,
    input: "Reply with exactly: OK",
    reasoning: { effort: "minimal" } as never,
  });
  console.log(`[spark text] ${Date.now() - t}ms ->`, r.output_text.trim(), "| usage:", r.usage?.total_tokens);
}

async function sparkVisionStructured() {
  const t = Date.now();
  const r = await meta.responses.create({
    model: MUSE,
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "Describe this web page screenshot as a layout model." },
          { type: "input_image", image_url: IMG, detail: "auto" },
        ],
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "layout",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["site_type", "has_nav", "regions"],
          properties: {
            site_type: { type: "string" },
            has_nav: { type: "boolean" },
            regions: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  });
  console.log(`[spark vision+json] ${Date.now() - t}ms ->`, r.output_text, "| usage:", r.usage?.total_tokens);
}

async function sam() {
  const t = Date.now();
  const stream = await meta.responses.create({
    model: SAM,
    input: [
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "logo" },
          { type: "input_image", image_url: IMG, detail: "auto" },
        ],
      },
    ],
    stream: true,
    metadata: { mask_encoding: "one_bit", include_confidence: "true" },
  });
  const result = await parseImageStream(stream as never).finalResult;
  const boxes = recordsOfKind(result.records, "box");
  console.log(`[sam 3.1] ${Date.now() - t}ms -> ${boxes.length} box(es)`);
  for (const b of boxes) console.log("   ", JSON.stringify(b));
}

async function main() {
const steps: [string, () => Promise<void>][] = [
  ["spark text", sparkText],
  ["spark vision+structured", sparkVisionStructured],
  ["sam 3.1", sam],
];
let failed = 0;
for (const [name, fn] of steps) {
  try { await fn(); } catch (e) { failed++; console.error(`[${name}] FAILED:`, (e as Error).message); }
}
process.exit(failed ? 1 : 0);
}
main();
