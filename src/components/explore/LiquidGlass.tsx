"use client";
import { useEffect, useId, useRef } from "react";

/**
 * Liquid glass in the manner of Apple's material: the backdrop is refracted toward the edges as
 * if through a rounded slab of glass, kept nearly clear, with a bright specular rim. The bending is
 * an SVG displacement map fed to backdrop-filter, which only Chromium renders; elsewhere the
 * element keeps the frosted .xp-liquid styling. The map is drawn for the element's own size.
 */
export function LiquidGlass({ children, className = "", label, as: Tag = "div", bezel = 26, strength = 64 }: { children: React.ReactNode; className?: string; label?: string; as?: "div" | "nav"; bezel?: number; strength?: number }) {
  const ref = useRef<HTMLElement | null>(null);
  const imgRef = useRef<SVGFEImageElement | null>(null);
  const mapRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const id = `lg${useId().replace(/[^a-z0-9]/gi, "")}`;

  useEffect(() => {
    const el = ref.current, img = imgRef.current, map = mapRef.current;
    const brands = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands ?? [];
    if (!el || !img || !map || !brands.some((b) => b.brand === "Chromium")) return;
    const draw = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (!w || !h) return;
      const r = Math.min(h, w) / 2, b = Math.min(bezel, r);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      const ctx = c.getContext("2d")!, data = ctx.createImageData(w, h);
      // Signed distance to the capsule's edge (negative inside), and its outward normal.
      const sd = (x: number, y: number) => {
        const qx = Math.abs(x - w / 2) - (w / 2 - r), qy = Math.abs(y - h / 2) - (h / 2 - r);
        return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
      };
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const d = -sd(x + 0.5, y + 0.5), i = (y * w + x) * 4;
        let dx = 0, dy = 0;
        if (d > 0 && d < b) {
          const nx = sd(x + 1.5, y + 0.5) - sd(x - 0.5, y + 0.5), ny = sd(x + 0.5, y + 1.5) - sd(x + 0.5, y - 0.5);
          const n = Math.hypot(nx, ny) || 1, t = 1 - d / b;
          // A convex bezel bends light harder the closer it is to the rim.
          const m = t * t * (3 - 2 * t);
          dx = (-nx / n) * m; dy = (-ny / n) * m;
        }
        data.data[i] = 128 + dx * 127; data.data[i + 1] = 128 + dy * 127; data.data[i + 2] = 128; data.data[i + 3] = 255;
      }
      ctx.putImageData(data, 0, 0);
      img.setAttribute("href", c.toDataURL());
      img.setAttribute("width", String(w)); img.setAttribute("height", String(h));
      map.setAttribute("scale", String(strength));
      el.style.backdropFilter = `url(#${id}) blur(1.5px) saturate(165%) brightness(1.06)`;
      el.dataset.refract = "";
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, bezel, strength]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const T = Tag as any;
  return (
    <T ref={ref} aria-label={label} className={`xp-liquid ${className}`}>
      <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
        <filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feImage ref={imgRef} x="0" y="0" preserveAspectRatio="none" result="map" />
          <feDisplacementMap ref={mapRef} in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      {children}
    </T>
  );
}
