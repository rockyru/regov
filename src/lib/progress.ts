/** Pipeline steps and how far along a run is, from the events in its status file. */
export const STEPS: { key: string; label: string; tool: string }[] = [
  { key: "crawl", label: "Crawl", tool: "Playwright" },
  { key: "archive", label: "Archive", tool: "Wayback Machine" },
  { key: "understand", label: "Understand", tool: "Muse Spark" },
  { key: "plan", label: "Plan", tool: "Muse Spark" },
  { key: "segment", label: "Segment", tool: "SAM 3.1" },
  { key: "band", label: "Illustrate", tool: "Muse Image" },
  { key: "write", label: "Assemble", tool: "RE:GOV" },
];

// Share of a typical run spent in each step, for progress percentages.
const WEIGHT: Record<string, number> = { crawl: 0.25, archive: 0.05, understand: 0.45, plan: 0.08, segment: 0.04, band: 0.12, write: 0.06 };

type Ev = { type: string; [k: string]: unknown };
export function progressOf(status: { phase: string; done: boolean; events: Ev[] }) {
  const { events } = status;
  const archived = events.some((e) => e.type === "archive");
  const steps = STEPS.filter((s) => s.key !== "archive" || archived || status.phase === "archive");
  const idx = Math.max(0, steps.findIndex((s) => s.key === (status.done ? "write" : status.phase === "queued" ? "crawl" : status.phase)));
  const fetched = events.filter((e) => e.type === "page" && e.url).length;
  const understood = events.filter((e) => e.type === "page" && e.title).length;
  const crawlDone = events.find((e) => e.type === "done");
  const toUnderstand = Number(String(events.find((e) => e.type === "phase" && e.phase === "understand")?.detail ?? "").match(/\d+/)?.[0]) || Number(crawlDone?.count) || 0;
  const cur = steps[idx]?.key ?? "crawl";
  const detail = cur === "crawl" ? `${fetched} ${fetched === 1 ? "page" : "pages"} fetched`
    : cur === "archive" ? "finding a snapshot"
    : cur === "understand" ? `${understood} of ${toUnderstand || "?"} pages`
    : cur === "plan" ? "site map and navigation"
    : cur === "segment" ? "reading the old homepage"
    : cur === "band" ? "painting the header"
    : "writing pages";
  const frac = cur === "crawl" ? (crawlDone ? 1 : Math.min(0.95, fetched / 20)) : cur === "understand" ? (toUnderstand ? Math.min(1, understood / toUnderstand) : 0) : 0.4;
  const w = (k: string) => WEIGHT[k] ?? 0.05;
  const total = steps.reduce((t, s) => t + w(s.key), 0);
  const pct = status.done ? 100 : status.phase === "queued" ? 0 : Math.round((100 * (steps.slice(0, idx).reduce((t, s) => t + w(s.key), 0) + w(cur) * frac)) / total);
  return { steps, idx, label: steps[idx]?.label ?? "Crawl", detail, pct };
}
