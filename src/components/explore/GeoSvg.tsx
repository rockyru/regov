import Link from "next/link";
import { project, type GeoMap } from "@/lib/explore/geo";

export type MapPin = { lat: number; lon: number; n?: number; label: string; href?: string; active?: boolean };

/**
 * One of the Explore maps as SVG: land, and for the town map its roads and rivers, with numbered
 * pins. `focus` crops the view to a square around a point, `span` degrees of latitude tall.
 * Styles: .geo-* in src/app/explore/explore.css.
 */
export function GeoSvg({ map, pins = [], focus, span, view, onSelect, className = "", label }: {
  map: GeoMap; pins?: MapPin[]; focus?: { lat: number; lon: number }; span?: number; className?: string;
  /** An explicit viewBox (an interactive map pans and zooms with it); pins keep their size on screen. */
  view?: number[];
  /** Pins become buttons that call this instead of links (client components only). */
  onSelect?: (p: MapPin) => void;
  /** Empty for a decorative map. */ label: string;
}) {
  let vb = view ?? [0, 0, map.w, map.h];
  if (!view && focus && span) {
    const [x, y] = project(map, focus.lat, focus.lon), h = span * map.sc, w = h * 1.6;
    vb = [x - w / 2, y - h / 2, w, h];
  }
  // Pins keep one size on screen whatever the crop: sized from the view's width.
  const r = vb[2] * 0.014;
  const groups: MapPin[][] = [];
  for (const p of pins) {
    const [x, y] = project(map, p.lat, p.lon);
    const g = groups.find((g) => { const [gx, gy] = project(map, g[0].lat, g[0].lon); return Math.hypot(gx - x, gy - y) < r * 2.2; });
    if (g) g.push(p); else groups.push([p]);
  }
  for (const g of groups) g.sort((a, b) => (a.n ?? 0) - (b.n ?? 0));
  return (
    <svg viewBox={vb.join(" ")} className={`geo ${className}`} preserveAspectRatio={view ? "none" : "xMidYMid slice"} {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}>
      <path d={map.land} className="geo-land" />
      {map.rivers && <path d={map.rivers} className="geo-river" />}
      {map.roads && <path d={map.roads} className="geo-road" />}
      {groups.map((g, k) => {
        const [x, y] = project(map, g[0].lat, g[0].lon);
        const active = g.some((p) => p.active);
        if (g[0].n == null) return <g key={k} className={`geo-pin ${active ? "is-active" : ""}`} transform={`translate(${x} ${y})`} style={{ "--d": k } as React.CSSProperties}><title>{g[0].label}</title>{active && <circle r={r * 2.2} className="geo-halo" />}<circle r={r * 0.45} /></g>;
        // Pins too close to tell apart share one pill, their numbers side by side.
        // Each number advances by its own width, so two-digit numbers do not crowd.
        const adv = (p: MapPin) => r * (0.62 * String(p.n).length + 0.5);
        const xs = g.map((_, m) => g.slice(0, m).reduce((t, p, k) => t + (adv(p) + adv(g[k + 1])) / 2, 0));
        const span = xs[xs.length - 1], w = r * 2 + span;
        // Grow the pill away from the nearest other pin, so it does not run under it.
        const other = groups.filter((o) => o !== g).map((o) => project(map, o[0].lat, o[0].lon)).sort((a, b) => Math.hypot(a[0] - x, a[1] - y) - Math.hypot(b[0] - x, b[1] - y))[0];
        const left = other ? other[0] > x : false, x0 = left ? -span : 0;
        return (
          <g key={k} className={`geo-pin ${active ? "is-active" : ""}`} transform={`translate(${x} ${y})`} style={{ "--d": k } as React.CSSProperties}>
            {active && <circle r={r * 2.2} className="geo-halo" />}
            {active && onSelect && <circle r={r * 1.4} className="geo-pulse" />}
            <rect x={x0 - r} y={-r} width={w} height={r * 2} rx={r} />
            {g.map((p, m) => {
              const t = <text x={x0 + xs[m]} dy="0.35em" style={{ fontSize: r * 1.05 }}><title>{p.label}</title>{p.n}</text>;
              if (onSelect) return <g key={m} role="button" tabIndex={0} aria-label={p.label} className="geo-hit" onClick={() => onSelect(p)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(p); } }}>{t}</g>;
              return p.href ? <Link key={m} href={p.href} aria-label={p.label}>{t}</Link> : <g key={m}>{t}</g>;
            })}
          </g>
        );
      })}
    </svg>
  );
}
