"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { project, type GeoMap } from "@/lib/explore/geo";
import { GeoSvg, type MapPin } from "./GeoSvg";

export type CoastPlace = { n: number; name: string; kind: string; photo?: string; href: string; lat: number; lon: number };

/**
 * The coast map, to play with: pick a place on the map or in the list and the map glides in to it
 * and opens a card (photo, kind, a link to its page); drag to pan, + and − to zoom, Esc or
 * "All places" to pull back. Pins drop in and the roads draw themselves the first time it is seen.
 * Styles: .cm-* in src/app/explore/explore.css.
 */
export function CoastMap({ map, places, label }: { map: GeoMap; places: CoastPlace[]; label: string }) {
  const box = useRef<HTMLDivElement | null>(null);
  const list = useRef<HTMLOListElement | null>(null);
  const [size, setSize] = useState<[number, number] | null>(null);
  const [view, setView] = useState<number[] | null>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [seen, setSeen] = useState(false);
  const viewRef = useRef<number[] | null>(null);
  useEffect(() => { viewRef.current = view; }, [view]);
  const anim = useRef(0), drag = useRef<{ x: number; y: number; v: number[]; moved: boolean } | null>(null);

  // The whole map in the part of the box the list panel leaves free (the list floats over the map's left on wide screens)
  const full = useCallback((cw: number, ch: number) => {
    const l = list.current, pad = l && getComputedStyle(l).position === "absolute" ? l.offsetLeft + l.offsetWidth + 24 : 0;
    const fw = cw - pad, a = fw / ch;
    const [x, y, w, h] = map.w / map.h > a ? [(map.w - map.h * a) / 2, 0, map.h * a, map.h] : [0, (map.h - map.w / a) / 2, map.w, map.w / a];
    const k = w / fw;
    return [x - pad * k, y, cw * k, h];
  }, [map]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize([width, height]);
      setView(full(width, height));
      setSel(null);
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.35 });
    io.observe(el);
    return () => { ro.disconnect(); io.disconnect(); cancelAnimationFrame(anim.current); };
  }, [full]);

  /** Glide the view to `to` over 0.8 s (at once when the reader prefers less motion). */
  const glide = useCallback((to: number[]) => {
    cancelAnimationFrame(anim.current);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setView(to); return; }
    const from = viewRef.current;
    if (!from) { setView(to); return; }
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 800), e = 1 - Math.pow(1 - k, 4);
      setView(from.map((v, i) => v + (to[i] - v) * e));
      if (k < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, []);

  const zoomTo = (cx: number, cy: number, w: number) => {
    if (!size) return;
    const f = full(size[0], size[1]);
    w = Math.max(f[2] / 6, Math.min(f[2], w));
    const h = w * (size[1] / size[0]);
    glide([cx - w / 2, cy - h / 2, w, h]);
  };
  const pick = (n: number | null) => {
    setSel(n);
    const p = places.find((q) => q.n === n);
    if (!p || !size) { if (size) glide(full(size[0], size[1])); return; }
    const [x, y] = project(map, p.lat, p.lon), f = full(size[0], size[1]);
    zoomTo(x, y, f[2] / 3.2);
  };
  const zoom = (by: number) => { if (view) zoomTo(view[0] + view[2] / 2, view[1] + view[3] / 2, view[2] / by); };

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape" && sel != null) pick(null); };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  });

  const onDown = (e: React.PointerEvent) => { if (view) drag.current = { x: e.clientX, y: e.clientY, v: view, moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || !size) return;
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 4) return;
    if (!d.moved) { d.moved = true; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }
    cancelAnimationFrame(anim.current);
    setView([d.v[0] - (dx * d.v[2]) / size[0], d.v[1] - (dy * d.v[3]) / size[1], d.v[2], d.v[3]]);
  };
  const onUp = () => { drag.current = null; };

  const pins: MapPin[] = places.map((p) => ({ lat: p.lat, lon: p.lon, n: p.n, label: p.name, active: p.n === sel || p.n === hover }));
  const cur = places.find((p) => p.n === sel);
  // The card sits beside the selected pin, on the side with more room
  let card: React.CSSProperties | undefined;
  if (cur && view && size) {
    const [x, y] = project(map, cur.lat, cur.lon);
    const px = ((x - view[0]) / view[2]) * size[0], py = ((y - view[1]) / view[3]) * size[1];
    card = px > size[0] / 2 ? { right: size[0] - px + 28, top: py } : { left: px + 28, top: py };
  }

  return (
    <div className={`cm ${seen ? "is-seen" : ""}`}>
      <div ref={box} className="cm-map" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={(e) => {
        if (!view || !size || (e.target as Element).closest(".geo-hit")) return;
        const r = e.currentTarget.getBoundingClientRect();
        zoomTo(view[0] + ((e.clientX - r.left) / size[0]) * view[2], view[1] + ((e.clientY - r.top) / size[1]) * view[3], view[2] / 2);
      }}>
        <span className="cm-sea" aria-hidden />
        {view && <GeoSvg map={map} view={view} pins={pins} label={label} onSelect={(p) => pick(p.n === sel ? null : p.n ?? null)} />}
        <div className="cm-tools">
          <button type="button" onClick={() => zoom(1.6)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoom(1 / 1.6)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => pick(null)} className="cm-all">All places</button>
        </div>
        {cur && card && (
          <div className="cm-card" style={card} key={cur.n} role="dialog" aria-label={cur.name}>
            {cur.photo && <img src={cur.photo} alt="" />}
            <div>
              <p className="cm-card-meta"><span>{cur.kind}</span><span>{String(cur.n).padStart(2, "0")}</span></p>
              <p className="cm-card-name">{cur.name}</p>
              <Link href={cur.href} className="cm-card-link">Open the place <span aria-hidden>→</span></Link>
            </div>
            <button type="button" className="cm-close" onClick={() => pick(null)} aria-label="Close">×</button>
          </div>
        )}
        <p className="cm-hint" aria-hidden>Drag to move · double-click to zoom</p>
      </div>
      <ol ref={list} className="cm-list" aria-label="Places on the map">
        {places.map((p) => (
          <li key={p.n}>
            <button type="button" aria-pressed={p.n === sel} onClick={() => pick(p.n === sel ? null : p.n)} onPointerEnter={() => setHover(p.n)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(p.n)} onBlur={() => setHover(null)}>
              <b>{String(p.n).padStart(2, "0")}</b><span>{p.name}</span><i>{p.kind}</i>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
