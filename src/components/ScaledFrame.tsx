"use client";
import { useEffect, useRef, useState } from "react";

/** Renders a page at desktop width inside a box, scaled to fit the box's width. Non-interactive. */
export function ScaledFrame({ src, width = 1440, height = 900, title, className = "" }: { src: string; width?: number; height?: number; title: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [width]);
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ aspectRatio: `${width}/${height}` }}>
      {scale > 0 && (
        <iframe src={src} title={title} loading="lazy" tabIndex={-1} aria-hidden scrolling="no" className="absolute left-0 top-0 origin-top-left pointer-events-none border-0 bg-white" style={{ width, height, transform: `scale(${scale})` }} />
      )}
    </div>
  );
}
