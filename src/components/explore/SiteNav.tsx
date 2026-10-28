"use client";
import { useEffect, useState } from "react";
import { LiquidGlass } from "./LiquidGlass";

/**
 * The portal's nav: one liquid-glass capsule fixed at the top of the screen through every
 * section, marking the section under it. On a portal's inner pages it links back to the portal
 * (`base`) and marks `current`. Styles: .xp-nav in src/app/explore/explore.css.
 */
const SECTIONS = [
  { id: "top", label: "Home" },
  { id: "story", label: "Story" },
  { id: "places", label: "Places" },
  { id: "events", label: "Events" },
  { id: "plan", label: "Plan" },
];

export function SiteNav({ base = "", current }: { base?: string; current?: string }) {
  const [active, setActive] = useState(current ?? "top");
  useEffect(() => {
    if (current) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * 0.5;
      let cur = "top";
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top <= line) cur = s.id;
      }
      setActive(cur);
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
    return () => { window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); cancelAnimationFrame(frame); };
  }, [current]);
  return (
    <LiquidGlass as="nav" label="Sections" className="xp-nav">
      {SECTIONS.map((s) => <a key={s.id} href={`${base}#${s.id}`} aria-current={s.id === active ? "location" : undefined}>{s.label}</a>)}
    </LiquidGlass>
  );
}
