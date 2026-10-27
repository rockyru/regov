"use client";
import { useEffect, useRef } from "react";

/**
 * Fades and lifts its content into view the first time it scrolls into the viewport.
 * `stagger` delays each direct child in turn (grids, lists). Styles live in globals.css
 * under [data-reveal]; a <noscript> rule in the layout keeps content visible without JS.
 */
export function Reveal({ children, className = "", stagger = false, delay = 0, as: Tag = "div" }: { children: React.ReactNode; className?: string; stagger?: boolean; delay?: number; as?: "div" | "section" | "ul" | "ol" | "li" }) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stagger) Array.from(el.children).forEach((c, i) => (c as HTMLElement).style.setProperty("--i", String(i)));
    if (!("IntersectionObserver" in window)) { el.classList.add("is-visible"); return; }
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { el.classList.add("is-visible"); io.disconnect(); }
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.08 });
    io.observe(el);
    return () => io.disconnect();
  }, [stagger]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = Tag as any;
  return <T ref={ref} data-reveal="" data-stagger={stagger ? "" : undefined} style={delay ? { transitionDelay: `${delay}ms` } : undefined} className={className}>{children}</T>;
}
