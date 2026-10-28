# Models

RE:GOV calls models through one OpenAI-compatible client (`src/lib/meta.ts`). By default it uses
the Meta Model API. Three kinds of model are used:

| Variable | Default | Used for | What the model must support |
| --- | --- | --- | --- |
| `MUSE_MODEL` | `muse-spark-1.3` | Understanding pages, planning, terms, verification, charters, translation, Ask | The Responses API with image input and strict `json_schema` output |
| `SAM_MODEL` | `sam-3.1` | Cutting out the seal, finding portraits, reading text in images, marking evidence | Promptable segmentation returning masks, streamed in the Meta SAM format (`@meta-sam/parser`) |
| `IMAGE_MODEL` | `muse-image-1.0` | Header illustration and art-directed heroes | `images.generate` |

`MODEL_API_BASE` (default `https://api.meta.ai/v1`) and `MODEL_API_KEY` choose the provider.

## Using another provider

The language model is the easiest to swap: any provider with an OpenAI-compatible Responses API
that accepts images and strict JSON schemas should work, for example OpenAI itself. Set
`MODEL_API_BASE`, `MODEL_API_KEY` and `MUSE_MODEL`.

Segmentation is Meta-specific today: the SAM response format is parsed directly. Image
generation needs a provider that implements `images.generate`. All three share one base URL and
key, so mixing providers needs a small change to `src/lib/meta.ts`. Per-model providers and a
segmentation adapter are on the [roadmap](../ROADMAP.md).

## Working without a key

- `npm run sample` installs a finished, fictional site, so the app, report, editor and exports
  work with no model at all.
- `MODEL_CACHE=replay` reruns a saved job using only the model answers recorded in
  `jobs/<id>/models`, and fails on the first step that would need a new call.

## Cost

Each call's tokens are counted per step in `jobs/<id>/usage.json`, and `/admin` shows the average
cost per site. `USD_PER_MTOK` sets the rate used for estimates.
