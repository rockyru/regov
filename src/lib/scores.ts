import { readFile } from "node:fs/promises";
import { join } from "node:path";

/** One homepage load, as measured by src/pipeline/scores.ts. */
export type Metrics = { url: string; load_ms: number; lcp_ms: number | null; bytes: number; requests: number; axe_violations: number; axe_elements: number };
export type Scores = { generated_at: string; original: Metrics | null; original_note: string; rebuilt: Metrics | null; rebuilt_base: string };

export async function loadScores(jobDir: string): Promise<Scores | null> {
  try { return JSON.parse(await readFile(join(jobDir, "assets/scores.json"), "utf8")) as Scores; } catch { return null; }
}

export const fmtMs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
export const fmtBytes = (b: number) => (b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
/** How the rebuild compares: "23× lighter", "54% fewer", "12% slower". Lower is better for every metric here. */
export function change(before: number, after: number, [better, worse]: [string, string]): { text: string; good: boolean } {
  if (after <= 0 || before <= 0) return { text: after === before ? "same" : after < before ? `none left` : worse, good: after <= before };
  if (after === before) return { text: "same", good: true };
  const r = before / after;
  if (r >= 2) return { text: `${r < 10 ? r.toFixed(1) : Math.round(r)}× ${better}`, good: true };
  const pct = Math.round(Math.abs(1 - after / before) * 100);
  return { text: `${pct}% ${after < before ? better : worse}`, good: after < before };
}
