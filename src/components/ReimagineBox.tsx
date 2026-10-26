"use client";
import { useState } from "react";

const EXAMPLES = ["cda.gov.ph", "neust.edu.ph", "lupao.gov.ph", "region10.dilg.gov.ph"];

export function ReimagineBox() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form action="/api/run" method="post" onSubmit={() => setBusy(true)} className="w-full">
      <div className="rounded-3xl bg-white p-2 shadow-[0_8px_40px_-12px_rgba(0,56,168,0.35)] ring-1 ring-neutral-200 focus-within:ring-2 focus-within:ring-kapwa-brand-500 transition">
        <div className="flex items-center gap-2">
          <span className="pl-4 text-neutral-400" aria-hidden>
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" /></svg>
          </span>
          <input
            name="url" value={url} onChange={(e) => setUrl(e.target.value)} required autoFocus
            placeholder="Paste a government website address…"
            className="flex-1 bg-transparent py-4 text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
          />
          <button type="submit" disabled={busy || !url.trim()} aria-label="Reimagine this site" className="grid size-12 place-items-center rounded-2xl bg-kapwa-brand-800 text-white hover:bg-kapwa-brand-900 disabled:opacity-40 transition">
            {busy ? <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 19V5M5 12l7-7 7 7" /></svg>}
          </button>
        </div>
        <input type="hidden" name="max" value="30" />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm">
        <span className="text-neutral-400">Try</span>
        {EXAMPLES.map((e) => (
          <button key={e} type="button" onClick={() => setUrl(`https://${e}`)} className="rounded-full bg-neutral-100 px-3 py-1.5 text-neutral-700 hover:bg-kapwa-brand-50 hover:text-kapwa-brand-900">{e}</button>
        ))}
      </div>
    </form>
  );
}
