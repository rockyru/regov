"use client";
import { useMemo, useState, type ReactNode } from "react";

export type ShowcaseItem = { id: string; text: string; kind: string; node: ReactNode };

/** Search box and type chips over server-rendered showcase entries. */
export function ShowcaseList({ items, kinds }: { items: ShowcaseItem[]; kinds: { key: string; label: string; count: number }[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = useMemo(() => items.filter((it) => (!kind || it.kind === kind) && words.every((w) => it.text.includes(w))), [items, kind, words]);
  const chip = (key: string, label: string, count: number) => (
    <button key={key} type="button" onClick={() => setKind(key)} aria-pressed={kind === key}
      className={`h-9 border px-3 text-sm font-semibold tabular-nums ${kind === key ? "border-kapwa-brand-900 bg-kapwa-brand-900 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:border-kapwa-brand-900"}`}>
      {label} <span className={kind === key ? "text-white/70" : "text-neutral-400"}>{count}</span>
    </button>
  );
  return (
    <>
      <div className="sticky top-0 z-20 -mx-4 mt-8 bg-white/95 px-4 py-4 backdrop-blur sm:mx-0 sm:px-0">
        <label className="flex h-12 items-center border-2 border-kapwa-brand-900 bg-white focus-within:ring-4 focus-within:ring-kapwa-yellow-400">
          <span className="sr-only">Search the showcase</span>
          <svg aria-hidden viewBox="0 0 20 20" className="ml-4 size-5 shrink-0 text-neutral-400"><circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m13 13 4 4" stroke="currentColor" strokeWidth="2" /></svg>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, place or type" className="h-full min-w-0 flex-1 bg-transparent px-3 text-base outline-none" />
          <span className="pr-4 text-sm tabular-nums text-neutral-500" aria-live="polite">{shown.length} of {items.length}</span>
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          {chip("", "All", items.length)}
          {kinds.map((k) => chip(k.key, k.label, k.count))}
        </div>
      </div>
      {shown.map((it) => <div key={it.id}>{it.node}</div>)}
      {shown.length === 0 && <p className="mt-10 text-neutral-500">No site matches “{q}”.</p>}
    </>
  );
}
