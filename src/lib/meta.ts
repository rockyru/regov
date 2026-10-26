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
  client = new OpenAI({ baseURL: process.env.MODEL_API_BASE ?? "https://api.meta.ai/v1", apiKey });
  return client;
}
export const meta = new Proxy({} as OpenAI, { get: (_t, prop) => (get() as unknown as Record<PropertyKey, unknown>)[prop] });

export const MUSE = process.env.MUSE_MODEL ?? "muse-spark-1.3";
export const SAM = "sam-3.1";
export const MUSE_IMAGE = "muse-image-1.0";
