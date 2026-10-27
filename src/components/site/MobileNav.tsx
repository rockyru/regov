"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SiteModel } from "@/pipeline/schema";
import { Caret } from "./Caret";

type NavItem = SiteModel["nav"][number];

/** Square-capped line icons, chosen by what the section is about. */
function Icon({ name, className = "" }: { name: string; className?: string }) {
  const d: Record<string, React.ReactNode> = {
    home: <><path d="M3 11 12 3l9 8" /><path d="M5 10v11h14V10" /><path d="M10 21v-6h4v6" /></>,
    services: <><path d="M4 7h16v13H4z" /><path d="M9 7V4h6v3" /><path d="M4 12h16" /></>,
    news: <><path d="M4 5h16v15H4z" /><path d="M8 9h5v4H8z" /><path d="M15 9h2M15 13h2M8 16h9" /></>,
    people: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-1a6 6 0 0 1 12 0v1" /><path d="M16 11a3 3 0 1 0 0-6" /><path d="M17 14a5 5 0 0 1 4 5v1" /></>,
    building: <><path d="M4 21h16" /><path d="M6 21V5l6-2 6 2v16" /><path d="M10 9h1M13 9h1M10 13h1M13 13h1M10 17h1M13 17h1" /></>,
    landmark: <><path d="M3 21h18" /><path d="M4 9h16L12 4 4 9z" /><path d="M6 9v9M10 9v9M14 9v9M18 9v9" /></>,
    book: <><path d="M4 4h7a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4z" /><path d="M20 4h-7a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h7z" /></>,
    file: <><path d="M6 3h8l5 5v13H6z" /><path d="M14 3v5h5" /><path d="M9 13h6M9 17h6" /></>,
    info: <><rect x="4" y="4" width="16" height="16" /><path d="M12 11v5" /><path d="M12 8h.01" /></>,
    map: <><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></>,
    phone: <><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></>,
    menu: <><path d="M4 7h16M4 12h16M4 17h16" /></>,
    grid: <><path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></>,
  };
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden className={`size-6 shrink-0 ${className}`}>
      {d[name] ?? d.grid}
    </svg>
  );
}

function iconFor(label: string) {
  const l = label.toLowerCase();
  if (/service|charter|frontline|transaction|permit|apply|admission|enrol/.test(l)) return "services";
  if (/news|update|event|announce|press|bulletin/.test(l)) return "news";
  if (/official|people|director|faculty|staff|leader/.test(l)) return "people";
  if (/office|campus|branch|venue|facilit|hospital|department/.test(l)) return "building";
  if (/government|governance|executive|legislative|council|sanggunian/.test(l)) return "landmark";
  if (/academic|program|course|college|research|study|library/.test(l)) return "book";
  if (/resource|download|form|circular|law|issuance|document|publication|plan|report/.test(l)) return "file";
  if (/about|history|profile|mission|vision/.test(l)) return "info";
  if (/barangay|map|tourism|destination/.test(l)) return "map";
  return "grid";
}

export function MobileNav({ nav, jobId }: { nav: SiteModel["nav"]; jobId: string }) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const pathname = usePathname();
  const href = (slug: string) => (slug && slug !== "home" ? `/preview/${jobId}/${slug}` : `/preview/${jobId}`);
  const sections = nav.filter((n) => n.slug !== "home" && (n.slug || n.children.length > 0));
  // Three surfaced tabs: Home plus the two sections the planner ranked first (services, then what citizens come for next).
  const primary = sections.filter((n) => n.slug).slice(0, 2);
  const isActive = (item: NavItem) => {
    if (item.slug === "home") return pathname === href("home");
    const slugs = [item.slug, ...item.children.map((c) => c.slug)].filter(Boolean);
    return slugs.some((s) => pathname === href(s));
  };

  // Animate out, unless the viewer prefers reduced motion (then no animationend would fire).
  const close = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? setOpen(false) : setClosing(true));
  const finishClose = (e: React.AnimationEvent) => { if (closing && e.target === e.currentTarget) { setOpen(false); setClosing(false); } };
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open]);

  const tabBase = "relative flex flex-1 flex-col items-center justify-center gap-1 h-16 min-w-0 px-1 text-[11px] font-semibold tracking-wide";
  const tab = (active: boolean) => `${tabBase} ${active ? "text-white bg-white/10" : "text-white/70 hover:text-white"}`;
  const bar = (active: boolean) => active && <span aria-hidden className="absolute inset-x-3 top-0 h-[3px] bg-kapwa-yellow-400" />;

  return (
    <div className="lg:hidden">
      {/* Floating bottom bar */}
      <nav aria-label="Primary (mobile)" className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-50 sm:mx-auto sm:max-w-md bg-kapwa-brand-900 text-white border border-black/30 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5),0_2px_6px_rgba(0,0,0,0.25)]">
        <ul className="flex items-stretch divide-x divide-white/15">
          <li className="flex flex-1 min-w-0">
            <Link href={href("home")} aria-current={isActive(nav[0]) ? "page" : undefined} className={tab(pathname === href("home"))}>
              {bar(pathname === href("home"))}<Icon name="home" /><span className="truncate max-w-full">Home</span>
            </Link>
          </li>
          {primary.map((item) => (
            <li key={item.label} className="flex flex-1 min-w-0">
              <Link href={href(item.slug)} aria-current={isActive(item) ? "page" : undefined} className={tab(isActive(item))}>
                {bar(isActive(item))}<Icon name={iconFor(item.label)} /><span className="truncate max-w-full">{item.label}</span>
              </Link>
            </li>
          ))}
          <li className="flex flex-1 min-w-0">
            <button type="button" aria-expanded={open} aria-controls="mobile-drawer" onClick={() => (open ? close() : setOpen(true))} className={tab(open)}>
              {bar(open)}<Icon name={open ? "menu" : "grid"} /><span>More</span>
            </button>
          </li>
        </ul>
      </nav>

      {/* Drawer that rises from the bottom */}
      {open && (
        <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="All sections">
          <button type="button" aria-label="Close menu" onClick={close} className={`absolute inset-0 bg-kapwa-brand-950/60 backdrop-blur-[2px] motion-safe:duration-300 motion-safe:fill-mode-forwards ${closing ? "motion-safe:animate-out motion-safe:fade-out" : "motion-safe:animate-in motion-safe:fade-in"}`} />
          <div id="mobile-drawer" onAnimationEnd={finishClose} className={`absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col bg-white text-neutral-900 border-t-4 border-kapwa-yellow-400 shadow-2xl motion-safe:duration-300 motion-safe:fill-mode-forwards ${closing ? "motion-safe:animate-out motion-safe:slide-out-to-bottom motion-safe:ease-in" : "motion-safe:animate-in motion-safe:slide-in-from-bottom motion-safe:ease-out"}`}>
            <div className="flex items-center justify-between px-5 h-14 border-b-2 border-neutral-900 shrink-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-600">All sections</span>
              <button type="button" onClick={close} className="inline-flex h-9 items-center gap-1.5 px-3 text-sm font-semibold border border-neutral-900 hover:bg-neutral-900 hover:text-white">
                Close <Caret />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]">
              <form role="search" className="flex m-5 mb-0">
                <label className="sr-only" htmlFor="drawer-search">Search this site</label>
                <input id="drawer-search" placeholder="Search services, forms, offices…" className="h-11 flex-1 min-w-0 border-2 border-r-0 border-neutral-900 bg-white px-3 text-[15px] placeholder:text-neutral-500 focus:outline-none focus:bg-kapwa-yellow-50" />
                <button type="submit" aria-label="Search" className="h-11 w-12 grid place-items-center bg-neutral-900 text-white hover:bg-kapwa-brand-900"><Icon name="search" className="size-5" /></button>
              </form>

              <ul className="mt-5 border-t-2 border-neutral-900">
                {sections.map((item, i) => (
                  <li key={item.label} className="border-b border-neutral-200">
                    {item.children.length > 0 ? (
                      <details className="group">
                        <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4">
                          <Icon name={iconFor(item.label)} className="text-kapwa-brand-900" />
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold">{item.label}</span>
                            {item.description && <span className="block text-[13px] text-neutral-500 truncate">{item.description}</span>}
                          </span>
                          <span className="text-[11px] font-semibold tabular-nums text-neutral-500">{String(i + 1).padStart(2, "0")}</span>
                          <Caret className="size-4 text-neutral-500 transition group-open:rotate-180" />
                        </summary>
                        <ul className="bg-neutral-50 border-t border-neutral-200 py-2">
                          {item.slug && <li><Link href={href(item.slug)} onClick={close} className="block px-5 py-2.5 pl-[3.75rem] text-[15px] font-semibold text-kapwa-brand-900">{item.label} overview →</Link></li>}
                          {item.children.map((c) => <li key={c.slug + c.label}><Link href={href(c.slug)} onClick={close} className="block px-5 py-2.5 pl-[3.75rem] text-[15px] text-neutral-700 hover:text-kapwa-brand-900">{c.label}</Link></li>)}
                        </ul>
                      </details>
                    ) : (
                      <Link href={href(item.slug)} onClick={close} className="flex items-center gap-4 px-5 py-4">
                        <Icon name={iconFor(item.label)} className="text-kapwa-brand-900" />
                        <span className="flex-1 min-w-0">
                          <span className="block font-semibold">{item.label}</span>
                          {item.description && <span className="block text-[13px] text-neutral-500 truncate">{item.description}</span>}
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums text-neutral-500">{String(i + 1).padStart(2, "0")}</span>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>

              <div className="grid grid-cols-2 gap-px bg-neutral-900 border-b-2 border-neutral-900">
                <Link href={href("hotlines")} onClick={close} className="flex items-center gap-3 bg-kapwa-red-700 px-5 py-4 text-white font-semibold hover:bg-kapwa-red-800"><Icon name="phone" className="size-5" />Hotlines</Link>
                <a href={`${href("home")}#transparency`} onClick={close} className="flex items-center gap-3 bg-white px-5 py-4 font-semibold hover:bg-neutral-100"><Icon name="file" className="size-5 text-kapwa-brand-900" />Transparency</a>
              </div>
              <p className="px-5 py-4 text-[12px] text-neutral-500">Unofficial concept. Not affiliated with the agency. Use the original site for transactions.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
