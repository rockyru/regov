/**
 * What each site costs in model calls. Every Meta Model API call made inside withUsage() is counted
 * under the current step (tokens as the API reports them; SAM and Muse Image calls by count) and
 * added to jobs/<id>/usage.json, split into the run itself and on-demand use (Filipino, Ask).
 * Cache hits make no call, so they cost and count nothing.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type Tally = Record<string, { calls: number; tokens: number; models: string[] }>;
export type UsageFile = { run: Tally; on_demand: Tally; days: Record<string, { calls: number; tokens: number }>; updated_at: string };

const als = new AsyncLocalStorage<{ step: string; tally: Tally }>();

/** Called by the client wrapper in src/lib/meta.ts after every request. */
export function recordUsage(model: string, tokens: number) {
  const c = als.getStore();
  if (!c) return;
  const t = (c.tally[c.step] ??= { calls: 0, tokens: 0, models: [] });
  t.calls++;
  t.tokens += tokens;
  if (!t.models.includes(model)) t.models.push(model);
}

/** Inside a withUsage() block: count what fn calls under another step name. */
export function step<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const c = als.getStore();
  return c ? als.run({ ...c, step: name }, fn) : fn();
}

const manilaDay = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
let writing: Promise<void> = Promise.resolve();

function merge(jobDir: string, section: "run" | "on_demand", tally: Tally) {
  writing = writing.then(async () => {
    const file = join(jobDir, "usage.json");
    let u: UsageFile = { run: {}, on_demand: {}, days: {}, updated_at: "" };
    try { u = { ...u, ...JSON.parse(await readFile(file, "utf8")) }; } catch { /* first use */ }
    const day = (u.days[manilaDay()] ??= { calls: 0, tokens: 0 });
    for (const [k, v] of Object.entries(tally)) {
      const t = (u[section][k] ??= { calls: 0, tokens: 0, models: [] });
      t.calls += v.calls; t.tokens += v.tokens; t.models = [...new Set([...t.models, ...v.models])];
      day.calls += v.calls; day.tokens += v.tokens;
    }
    u.updated_at = new Date().toISOString();
    await writeFile(file, JSON.stringify(u, null, 2));
  }).catch((e) => console.warn("[usage]", (e as Error).message));
  return writing;
}

/** Run fn, counting its model calls under `name`, then add them to the site's usage.json. */
export async function withUsage<T>(jobDir: string, section: "run" | "on_demand", name: string, fn: () => Promise<T>): Promise<T> {
  const tally: Tally = {};
  try {
    return await als.run({ step: name, tally }, fn);
  } finally {
    if (Object.keys(tally).length) await merge(jobDir, section, tally);
  }
}

export async function loadUsage(jobDir: string): Promise<UsageFile | null> {
  try { return JSON.parse(await readFile(join(jobDir, "usage.json"), "utf8")) as UsageFile; } catch { return null; }
}
