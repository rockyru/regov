"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";

/**
 * A section's room: one of its photographs, blurred, brightened and drifting, held behind the
 * section as it scrolls. Elements in the section with data-room="<photo src>" choose it: the one
 * crossing the middle of the screen, or the one under the pointer or focus (a place card).
 * Styles: .xp-room in src/app/explore/explore.css.
 */
export function Room({ photos }: { photos: string[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [on, setOn] = useState(photos[0]);

  useEffect(() => {
    const section = ref.current?.parentElement;
    if (!section) return;
    const pick = (e: Event) => {
      const src = (e.target as Element).closest?.("[data-room]")?.getAttribute("data-room");
      if (src) setOn(src);
    };
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setOn(e.target.getAttribute("data-room")!);
    }, { rootMargin: "-48% 0px -48% 0px" });
    section.querySelectorAll("[data-room]").forEach((el) => io.observe(el));
    section.addEventListener("pointerover", pick);
    section.addEventListener("focusin", pick);
    return () => { io.disconnect(); section.removeEventListener("pointerover", pick); section.removeEventListener("focusin", pick); };
  }, []);

  return (
    <div ref={ref} className="xp-room" aria-hidden>
      <div className="xp-room-view">
        {photos.map((src, i) => <img key={src} src={src} alt="" loading={i ? "lazy" : "eager"} className={src === on ? "is-on" : ""} />)}
      </div>
    </div>
  );
}
