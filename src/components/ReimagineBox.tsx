"use client";
import { useState } from "react";
import { isGovernmentHost, normalizeSiteUrl } from "@/lib/govdomain";

const INITIAL: Record<string, (url: string, wait: number) => string> = {
  notgov: (u) => `${u} is not a government domain.`,
  invalid: () => "That doesn't look like a website address.",
  ratelimit: (_u, w) => `You have started a few runs already. Please wait about ${w >= 90 ? `${Math.ceil(w / 60)} minutes` : `${w} seconds`} before starting another.`,
  busy: () => "The agent is busy right now and its queue is full. Please try again in a few minutes, or browse the showcase meanwhile.",
  quota: () => "Today's batch of rebuilds is used up. The agent takes new sites again at 8:00 AM Philippine time. Browse the showcase meanwhile.",
  robots: (u) => `${u} asks crawlers not to visit it in its robots.txt, so RE:GOV will not rebuild it.`,
  optout: (u) => `${u} is on RE:GOV's do-not-crawl list (its owner asked, or its terms forbid it), so it will not be rebuilt.`,
  paused: () => "New runs are paused for now while the current batch finishes. Browse the showcase meanwhile, or check back later.",
};

export function ReimagineBox({ initialError = "", initialUrl = "", initialWait = 0 }: { initialError?: string; initialUrl?: string; initialWait?: number }) {
  const [url, setUrl] = useState(["ratelimit", "busy", "paused", "quota", "robots", "optout"].includes(initialError) ? "" : initialUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(INITIAL[initialError]?.(initialUrl, initialWait) ?? "");
  const check = (v: string) => {
    const u = normalizeSiteUrl(v);
    if (!u) return "That doesn't look like a website address.";
    if (!isGovernmentHost(u.hostname)) return `${u.hostname} is not a government domain. RE:GOV only reimagines public institutions (.gov.ph, .edu.ph, .gov, and similar).`;
    return "";
  };
  return (
    <form id="reimagine" action="/api/run" method="post" onSubmit={(e) => { const err = check(url); if (err) { e.preventDefault(); setError(err); return; } setBusy(true); }} className="w-full">
      <label htmlFor="url" className="sr-only">Government website</label>
      <div className={`flex border-2 bg-white ${error ? "border-kapwa-red-600" : "border-kapwa-brand-900 focus-within:border-kapwa-brand-900"}`}>
        <input
          id="url" name="url" value={url} onChange={(e) => { setUrl(e.target.value); if (error) setError(""); }} required autoFocus aria-invalid={!!error} aria-describedby={error ? "url-error" : undefined}
          placeholder="e.g. lupao.gov.ph"
          className="min-w-0 flex-1 bg-transparent px-4 h-14 text-base sm:text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
        <button type="submit" disabled={busy || !url.trim()} className="shrink-0 bg-kapwa-brand-900 px-4 sm:px-6 font-bold text-white hover:bg-kapwa-brand-950 disabled:opacity-40 transition inline-flex items-center gap-2">
          {busy ? <span className="size-4 animate-spin border-2 border-white/40 border-t-white" /> : null}<span className="hidden sm:inline">Reimagine</span><span aria-hidden>→</span>
        </button>
        <input type="hidden" name="max" value="30" />
      </div>
      {error && <p id="url-error" role="alert" className="mt-2 text-center text-sm font-medium text-kapwa-red-700">{error}</p>}
    </form>
  );
}
