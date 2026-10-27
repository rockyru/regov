import OpenAI from "openai";

/**
 * One client for every Meta Model API model: Muse Spark, SAM 3.1, Muse Image.
 * Created lazily so importing pipeline code never needs the key at build time.
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
export const meta = new Proxy({} as OpenAI, { get: (_t, prop) => (get() as unknown as Record<PropertyKey, unknown>)[prop] });

export const MUSE = process.env.MUSE_MODEL ?? "muse-spark-1.3";
export const SAM = "sam-3.1";
export const MUSE_IMAGE = "muse-image-1.0";
