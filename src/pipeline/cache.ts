import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

/** Disk cache for model calls so demo reruns are instant and free. */
export async function cached<T>(jobDir: string, keyParts: unknown[], fn: () => Promise<T>): Promise<T> {
  const key = createHash("sha1").update(JSON.stringify(keyParts)).digest("hex").slice(0, 16);
  const dir = join(jobDir, "models");
  const file = join(dir, `${key}.json`);
  try { return JSON.parse(await readFile(file, "utf8")) as T; } catch { /* miss */ }
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
