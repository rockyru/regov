"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { QueueStripData } from "@/lib/queueStrip";

/** The home page's queue strip. Updates itself in place from /api/queue; the rest of the page is never re-rendered. */
export function QueueStrip({ initial }: { initial: QueueStripData }) {
  const [q, setQ] = useState(initial);
  const busy = q.running.length + q.waiting.length > 0;
  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const r = await fetch("/api/queue", { cache: "no-store" });
        if (r.ok && !stop) setQ(await r.json());
      } catch { /* keep what is shown */ }
    };
    const id = setInterval(tick, busy ? 4000 : 20000);
    return () => { stop = true; clearInterval(id); };
  }, [busy]);
  if (!busy && q.failed.length === 0) return null;
  return (
    <section aria-label="Sites being reimagined" className="border-b border-kapwa-yellow-400/60 bg-kapwa-yellow-50">
      <ul className="container-gov py-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
        {q.running.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-2 font-semibold text-kapwa-brand-900 hover:underline"><span className="size-2 bg-kapwa-brand-600 animate-pulse" />Reimagining {j.host} · {j.label} <span className="tabular-nums">{j.pct}%</span> →</Link></li>)}
        {q.waiting.length > 0 && (
          <li className="inline-flex flex-wrap items-center gap-x-2 gap-y-1 text-neutral-700">
            <span className="inline-flex items-center gap-2 font-semibold"><span className="size-2 bg-kapwa-yellow-400" />In queue:</span>
            {q.waiting.slice(0, 4).map((j, i) => <Link key={j.id} href={`/jobs/${j.id}`} className="hover:text-kapwa-brand-900 hover:underline"><span className="tabular-nums text-neutral-500">{i + 1}.</span> {j.host}</Link>)}
            {q.waiting.length > 4 && <span className="text-neutral-500">+{q.waiting.length - 4} more</span>}
          </li>
        )}
        {q.failed.map((j) => <li key={j.id}><Link href={`/jobs/${j.id}`} className="inline-flex items-center gap-2 font-semibold text-kapwa-red-800 hover:underline"><span className="size-2 bg-kapwa-red-600" />{j.host} stopped →</Link></li>)}
      </ul>
    </section>
  );
}
