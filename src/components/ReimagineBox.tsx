"use client";
import { useState } from "react";
import { isGovernmentHost, normalizeSiteUrl } from "@/lib/govdomain";

const EXAMPLES = ["region10.dilg.gov.ph", "isu.edu.ph", "bulacan.gov.ph", "nrcp.dost.gov.ph", "philsa.gov.ph", "launion.gov.ph", "pchrd.dost.gov.ph", "region5.dilg.gov.ph"];

const INITIAL: Record<string, (url: string, wait: number) => string> = {
  notgov: (u) => `${u} is not a government domain.`,
  invalid: () => "That doesn't look like a website address.",
  ratelimit: (_u, w) => `You have started a few runs already. Please wait about ${w >= 90 ? `${Math.ceil(w / 60)} minutes` : `${w} seconds`} before starting another.`,
  busy: () => "The agent is busy right now and its queue is full. Please try again in a few minutes, or browse the showcase meanwhile.",
};

export function ReimagineBox({ done = [], initialError = "", initialUrl = "", initialWait = 0 }: { done?: string[]; initialError?: string; initialUrl?: string; initialWait?: number }) {
  const examples = EXAMPLES.filter((e) => !done.includes(e)).slice(0, 4);
  const [url, setUrl] = useState(initialError === "ratelimit" || initialError === "busy" ? "" : initialUrl);
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
      <p className="mt-3 text-center text-sm text-neutral-500">
        <span className="font-semibold text-neutral-700">Try</span>{" "}
        {examples.map((e, i) => (
          <span key={e}>{i > 0 && <span className="text-neutral-300"> / </span>}<button type="button" onClick={() => setUrl(`https://${e}`)} className="underline decoration-neutral-300 underline-offset-4 hover:text-kapwa-brand-900 hover:decoration-kapwa-brand-900">{e}</button></span>
        ))}
      </p>
    </form>
  );
}
