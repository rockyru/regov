import OpenAI from "openai";
import { recordUsage } from "./usage";

/**
 * One OpenAI-compatible client for every model: Muse Spark, SAM 3.1, Muse Image by default.
 * Created lazily so importing pipeline code never needs the key at build time.
 * MODEL_API_BASE points it at another OpenAI-compatible provider; the model names below are
 * overridable too (docs/models.md lists what each step needs from its model).
 */
let client: OpenAI | null = null;
function get(): OpenAI {
  if (client) return client;
  const apiKey = process.env.MODEL_API_KEY;
  if (!apiKey) throw new Error("MODEL_API_KEY is not set (copy .env.example to .env)");
  client = new OpenAI({ baseURL: process.env.MODEL_API_BASE ?? "https://api.meta.ai/v1", apiKey, fetch: wellFormedFetch });
  return client;
}

// Page text is clipped by character count, which can split an emoji or rare character into a
// lone UTF-16 surrogate. JSON.stringify emits it as "\ud83d" and the API's strict parser answers
// 400 "unexpected end of hex escape". Drop lone surrogate escapes from every JSON body we send.
const LONE_HIGH = /(?<!\\)\\u[dD][89abAB][0-9a-fA-F]{2}(?!\\u[dD][c-fC-F][0-9a-fA-F]{2})/g;
const LONE_LOW = /(?<!\\u[dD][89abAB][0-9a-fA-F]{2})(?<!\\)\\u[dD][c-fC-F][0-9a-fA-F]{2}/g;
export function scrubLoneSurrogates(json: string): string {
  return json.replace(LONE_HIGH, "").replace(LONE_LOW, "");
}
const wellFormedFetch: typeof fetch = (url, init) => {
  if (init && typeof init.body === "string") init = { ...init, body: scrubLoneSurrogates(init.body) };
  return fetch(url, init);
};
// Count every call for the per-site usage record (src/lib/usage.ts). Streams (SAM) and images report no tokens; they count as calls.
type Create = (body: { model?: string; stream?: boolean }, opts?: unknown) => Promise<unknown>;
function counted(fn: Create): Create {
  return async (body, opts) => {
    const r = await fn(body, opts);
    const tokens = body?.stream ? 0 : ((r as { usage?: { total_tokens?: number } })?.usage?.total_tokens ?? 0);
    recordUsage(String(body?.model ?? "?"), tokens);
    return r;
  };
}
const wrapped = new WeakMap<object, unknown>();
export const meta = new Proxy({} as OpenAI, {
  get: (_t, prop) => {
    const c = get() as unknown as Record<PropertyKey, Record<string, Create>>;
    if (prop !== "responses" && prop !== "images") return c[prop];
    const api = c[prop];
    if (!wrapped.has(api)) wrapped.set(api, prop === "responses" ? { create: counted(api.create.bind(api)) } : { generate: counted(api.generate.bind(api)) });
    return wrapped.get(api);
  },
});

/** Text and vision with strict JSON output: understanding, planning, terms, translation, Ask. */
export const MUSE = process.env.MUSE_MODEL || "muse-spark-1.3";
/** Promptable segmentation (masks and boxes from a noun phrase): seals, portraits, text in images. */
export const SAM = process.env.SAM_MODEL || "sam-3.1";
/** Image generation: each site's header illustration. */
export const MUSE_IMAGE = process.env.IMAGE_MODEL || "muse-image-1.0";
