"use client";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

type Item = { label: string; href?: string; children: { label: string; href: string }[] };

/**
 * Full-screen menu for art-directed sites (src/components/site/Aurora.tsx). Large numbered
 * sections with their pages, plus search, hotlines and the main call to action.
 */
export function AuroraMenu({ items, extras, cta, search, label, vars }: {
  items: Item[]; extras: { label: string; href: string }[]; cta: { label: string; href: string }; search: { action: string; placeholder: string }; label: string; vars: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open]);
  const close = () => setOpen(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-expanded={open} className="hidden items-center gap-3 px-6 text-[15px] font-medium hover:text-[var(--au-deep)] lg:flex">
        {label}<span aria-hidden className="grid w-6 gap-[5px]"><span className="h-[2px] bg-current" /><span className="h-[2px] bg-current" /></span>
      </button>
      {/* Rendered at the end of <body> so no header stacking context can sit above it */}
      {open && createPortal(
        <div role="dialog" aria-modal="true" aria-label={label} style={vars} className="fixed inset-0 z-[60] overflow-y-auto bg-[var(--au-canvas)] text-[var(--au-ink)]">
          <div aria-hidden className="pointer-events-none absolute -right-40 -top-40 size-[44rem] rounded-full bg-[var(--au-haze)] blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[100px] hidden w-px bg-[var(--au-ink)]/12 lg:block" />
          <div className="relative flex h-20 items-center justify-end border-b border-[var(--au-ink)]/12 px-4 sm:px-8 lg:h-[107px] lg:pl-[200px] lg:pr-[216px]">
            <button type="button" onClick={close} autoFocus className="inline-flex items-center gap-3 text-[15px] font-medium hover:text-[var(--au-deep)]">
              Close<span aria-hidden className="text-3xl font-light leading-none">×</span>
            </button>
          </div>
          <div className="relative grid gap-14 px-4 py-12 sm:px-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-20 lg:py-20 lg:pl-[200px] lg:pr-[216px]">
            <nav aria-label="Site menu">
              <ol className="border-t border-[var(--au-ink)]/15">
                {items.map((it, i) => (
                  <li key={it.label} className="grid gap-4 border-b border-[var(--au-ink)]/15 py-6 md:grid-cols-[3rem_minmax(0,1fr)_auto] md:gap-x-10 md:items-baseline">
                    <span className="text-[15px] tabular-nums text-[var(--au-ink)]/70">{String(i + 1).padStart(2, "0")}</span>
                    {it.href
                      ? <Link href={it.href} onClick={close} className="whitespace-nowrap text-[clamp(2.2rem,4.4vw,4rem)] font-normal leading-none tracking-[-0.045em] hover:text-[var(--au-deep)]">{it.label}</Link>
                      : <span className="whitespace-nowrap text-[clamp(2.2rem,4.4vw,4rem)] font-normal leading-none tracking-[-0.045em]">{it.label}</span>}
                    {it.children.length > 0 && (
                      <ul className="space-y-1.5">
                        {it.children.map((c) => <li key={c.href + c.label}><Link href={c.href} onClick={close} className="text-[17px] text-[var(--au-ink)]/80 hover:text-[var(--au-deep)]">{c.label}</Link></li>)}
                      </ul>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
            <div className="space-y-10">
              <form role="search" action={search.action} className="flex border-b-2 border-[var(--au-ink)]">
                <label className="sr-only" htmlFor="au-menu-search">{search.placeholder}</label>
                <input id="au-menu-search" name="q" maxLength={200} placeholder={search.placeholder} className="h-14 min-w-0 flex-1 bg-transparent text-xl placeholder:text-[var(--au-ink)]/55 focus:outline-none" />
                <button type="submit" aria-label="Search" className="px-2 text-2xl hover:text-[var(--au-deep)]">→</button>
              </form>
              <ul className="space-y-4 text-xl">
                {extras.map((x) => <li key={x.href}><a href={x.href} onClick={close} className="inline-flex items-center gap-3 hover:text-[var(--au-deep)]"><span aria-hidden className="size-2 rounded-full bg-[var(--au-deep)]" />{x.label}</a></li>)}
              </ul>
              <Link href={cta.href} onClick={close} className="inline-flex items-center gap-3 bg-[var(--au-deep)] px-8 py-4 font-semibold uppercase tracking-[0.02em] text-white hover:opacity-90">{cta.label}<span aria-hidden>↓</span></Link>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
