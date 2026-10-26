// Which noun phrases does SAM 3.1 actually find on a government homepage screenshot?
// npx tsx --env-file=.env scripts/sam-probe.ts jobs/cda-demo/shots/000.viewport.png
import { meta, SAM } from "../src/lib/meta";
import { pngDataUrl } from "../src/pipeline/images";
import { parseImageStream, recordsOfKind } from "@meta-sam/parser";
const file = process.argv[2];
const prompts = (process.argv[3] ?? "logo,seal,photo,person,flag,map,menu bar,search box,button,heading text,slideshow,poster,icon").split(",");
async function main() {
const img = await pngDataUrl(file);
for (const p of prompts) {
  const t = Date.now();
  const stream = await meta.responses.create({ model: SAM, input: [{ type: "message", role: "user", content: [{ type: "input_text", text: p }, { type: "input_image", image_url: img, detail: "auto" }] }], stream: true, metadata: { mask_encoding: "one_bit", include_confidence: "true" } });
  const r = await parseImageStream(stream as never).finalResult;
  const boxes = recordsOfKind(r.records, "box") as readonly { left: number; top: number; right: number; bottom: number; confidence?: number }[];
  console.log(`${p.padEnd(14)} ${String(boxes.length).padStart(2)} boxes ${Date.now() - t}ms  ${boxes.slice(0, 4).map((b) => `[${Math.round(b.left)},${Math.round(b.top)} ${Math.round(b.right - b.left)}x${Math.round(b.bottom - b.top)} ${((b.confidence ?? 0) * 100).toFixed(0)}%]`).join(" ")}`);
}
}
main();
