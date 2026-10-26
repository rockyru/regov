import OpenAI from "openai";

const apiKey = process.env.MODEL_API_KEY;
if (!apiKey) throw new Error("MODEL_API_KEY is not set (copy .env.example to .env)");

/** One client for every Meta Model API model: Muse Spark, SAM 3.1, Muse Image. */
export const meta = new OpenAI({
  baseURL: process.env.MODEL_API_BASE ?? "https://api.meta.ai/v1",
  apiKey,
});

export const MUSE = process.env.MUSE_MODEL ?? "muse-spark-1.3";
export const SAM = "sam-3.1";
export const MUSE_IMAGE = "muse-image-1.0";
