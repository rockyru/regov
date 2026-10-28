import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Thrown in replay mode when a model call has no recorded answer. */
export class ReplayMissError extends Error {}

/**
 * Disk cache for model calls so reruns are instant and free. With MODEL_CACHE=replay a miss throws
 * instead of calling the model, so a saved job can be rebuilt offline and without a key.
 */
export async function cached<T>(jobDir: string, keyParts: unknown[], fn: () => Promise<T>): Promise<T> {
  const key = createHash("sha1").update(JSON.stringify(keyParts)).digest("hex").slice(0, 16);
  const dir = join(jobDir, "models");
  const file = join(dir, `${key}.json`);
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { /* miss */ }
  if (process.env.MODEL_CACHE === "replay") throw new ReplayMissError(`MODEL_CACHE=replay: no recorded model answer ${join(dir, `${key}.json`)}`);
  const value = await fn();
  await mkdir(dir, { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2));
  return value;
}

export async function pmap<T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}
