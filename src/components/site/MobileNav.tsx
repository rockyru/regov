"use client";
import { useState } from "react";
import Link from "next/link";
import type { SiteModel } from "@/pipeline/schema";
import { Caret } from "./Caret";

export function MobileNav({ nav, jobId }: { nav: SiteModel["nav"]; jobId: string }) {
  const [open, setOpen] = useState(false);
  const href = (slug: string) => (slug && slug !== "home" ? `/preview/${jobId}/${slug}` : `/preview/${jobId}`);
  return (
    <div className="lg:hidden">
      <button type="button" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen(!open)} className="inline-flex h-11 items-center gap-2 px-3 font-semibold text-white hover:bg-white/10">
        <span className="space-y-1.5" aria-hidden><span className="block h-0.5 w-6 bg-current" /><span className="block h-0.5 w-6 bg-current" /><span className="block h-0.5 w-6 bg-current" /></span>Menu
      </button>
      {open && (
        <div id="mobile-nav" className="absolute inset-x-0 top-full z-50 max-h-[80vh] overflow-y-auto bg-white text-neutral-900 shadow-2xl border-t-4 border-kapwa-yellow-400 border-b-2 border-b-neutral-900">
          {nav.filter((n) => n.slug || n.children.length > 0).map((item) => (
            <details key={item.label} className="border-b border-neutral-100 group">
              <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 font-semibold">
                {item.slug ? <Link href={href(item.slug)} onClick={() => setOpen(false)}>{item.label}</Link> : item.label}
                {item.children.length > 0 && <Caret className="size-4 text-neutral-500 group-open:rotate-180 transition" />}
              </summary>
              {item.children.length > 0 && (
                <ul className="bg-neutral-50 pb-2">
                  {item.children.map((c) => <li key={c.slug + c.label}><Link href={href(c.slug)} onClick={() => setOpen(false)} className="block px-8 py-2.5 text-[15px] text-neutral-700">{c.label}</Link></li>)}
                </ul>
              )}
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
