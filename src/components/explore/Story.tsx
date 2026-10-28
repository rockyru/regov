"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import type { Chapter } from "@/lib/explore/types";

/** The country map the story ends on, with the town's point on it (in the map's units). */
export type StoryMap = { w: number; h: number; land: string; x: number; y: number; town: string; sub: string };

/**
 * The story, quietly. It arrives as a second full-bleed photograph; as it pins, the photograph
 * closes into a small print in the hero's two middle cells, and from then on each screen of
 * scrolling is a chapter: the next print draws up over the last, the year turns over on the
 * left, the text sets on the right, and a hairline timeline along the bottom marks
 * where you are, a small print over each year (they jump to their chapters). The prints already seen
 * stay in a loose pile behind the current one, and a band of light crosses each new print once. After the last chapter it leads out to
 * Places over the whole screen: the print shrinks to a pin on the town, the camera pulls back
 * from it to the whole country, and that same map settles into its column as the Places copy
 * (`children`, PlacesWhere) sets in around it. There is one map; #places marks the finished frame. Behind it all, the same photograph again,
 * blurred, darkened and drifting, so the room takes the print's light. Styles: .st-* in src/app/explore/explore.css.
 */
const DIGITS = "0123456789".split("");
/** Scrolling, in screens, that closes the full-bleed photograph into the print. */
const LEAD = 0.7;
/** Scrolling, in screens, from the last chapter out to the map. */
const OUT = 1.8;
/** Scrolling, in screens, that the finished Places frame holds before it scrolls away. */
const HOLD = 0.4;
/** How far in the camera starts on the town, as a multiple of the country at full screen. */
const ZOOM = 9;
const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** "Before 1578" → { prefix: "Before", digits: [1, 5, 7, 8], tail: "1578" } */
const splitYear = (year: string) => {
  const m = year.match(/^(.*?)(\d{4})$/);
  const tail = m?.[2] ?? "0000";
  return { prefix: (m?.[1] ?? "").trim(), digits: tail.split("").map(Number), tail };
};

export function Story({ kicker, chapters, map, children }: { kicker: string; chapters: Chapter[]; map: StoryMap; children?: React.ReactNode }) {
  const ref = useRef<HTMLElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(0);
  const n = chapters.length;

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = ref.current, st = stage.current;
      if (!el || !st) return;
      const vh = window.innerHeight, s = -el.getBoundingClientRect().top / vh;
      // --e: 0 while full bleed, 1 once it is a print; --q: progress through the chapters.
      st.style.setProperty("--e", String(Math.min(1, Math.max(0, s / LEAD))));
      st.style.setProperty("--q", String(Math.min(1, Math.max(0, (s - LEAD) / n))));
      st.toggleAttribute("data-lead", s < LEAD * 0.9);
      // The way out: --o 0-1. First (--a) the print shrinks to a pin on the town as the camera pulls back
      // to the whole country, full screen; then (--c) the map settles into the Places slot.
      const o = clamp((s - LEAD - n) / OUT), win = st.querySelector<HTMLElement>(".st-window");
      const pm = ease(clamp(o / 0.4)), a = ease(clamp(o / 0.7)), c = ease(clamp((o - 0.7) / 0.3));
      st.style.setProperty("--o", String(o));
      st.style.setProperty("--a", String(a));
      st.style.setProperty("--c", String(c));
      st.toggleAttribute("data-out", o > 0);
      st.toggleAttribute("data-done", o >= 0.98);
      const slot = st.querySelector<HTMLElement>(".pl-slot");
      if (win) {
        if (o <= 0 || !slot) win.style.clipPath = "";
        else {
          const vw = st.clientWidth, cs = getComputedStyle(st), pct = (v: string) => parseFloat(cs.getPropertyValue(v)) / 100;
          const fx = pct("--fx") * vw, fy = pct("--fy") * vh, fw = pct("--fw") * vw, fh = pct("--fh") * vh;
          // The country full screen, and in its slot (contained), then between the two
          const HB = Math.min(vh * 0.84, (vw * 0.9 * map.h) / map.w), WB = (HB * map.w) / map.h;
          const sr = st.getBoundingClientRect(), r = slot.getBoundingClientRect();
          const HS = Math.min(r.height, (r.width * map.h) / map.w), WS = (HS * map.w) / map.h;
          const bx = (vw - WB) / 2 + (r.left - sr.left + (r.width - WS) / 2 - (vw - WB) / 2) * c;
          const by = (vh - HB) / 2 + (r.top - sr.top + (r.height - HS) / 2 - (vh - HB) / 2) * c;
          const bw = WB + (WS - WB) * c, bh = HB + (HS - HB) * c, u = bw / map.w;
          const tx = bx + map.x * u, ty = by + map.y * u;
          const ax = fx + fw / 2 + (tx - fx - fw / 2) * pm, ay = fy + fh / 2 + (ty - fy - fh / 2) * pm;
          const w = fw + (18 - fw) * pm, h = fh + (18 - fh) * pm;
          win.style.clipPath = `inset(${ay - h / 2}px ${vw - ax - w / 2}px ${vh - ay - h / 2}px ${ax - w / 2}px round ${9 * pm}px)`;
          const set = (k: string, v: number, unit = "px") => st.style.setProperty(k, `${v}${unit}`);
          set("--ax", ax); set("--ay", ay); set("--mw", bw); set("--mh", bh); set("--mx", -map.x * u); set("--my", -map.y * u);
          set("--zs", Math.pow(ZOOM, 1 - a), "");
        }
      }
      setActive(Math.min(n - 1, Math.max(0, Math.floor(s - LEAD))));
    };
    const queue = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    update();
    return () => { window.removeEventListener("scroll", queue); window.removeEventListener("resize", queue); cancelAnimationFrame(frame); };
  }, [n, map]);

  /** Scroll to the middle of chapter i's screen. */
  const go = (i: number) => {
    const el = ref.current;
    if (!el) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + (LEAD + i + 0.5) * window.innerHeight, behavior: smooth ? "smooth" : "auto" });
  };

  const year = splitYear(chapters[active].year);
  const num = (i: number) => String(i + 1).padStart(2, "0");
  return (
    <section ref={ref} id="story" className="st" style={{ "--n": n, "--lead": LEAD, "--out": OUT + HOLD } as React.CSSProperties} aria-label={kicker}>
      <span id="places" className="st-mark" aria-hidden />
      <div ref={stage} className="st-stage" data-c={active} style={{ "--ci": active } as React.CSSProperties}>
        <div className="st-bg" aria-hidden>
          {chapters.map((c, i) => c.photo && <img key={i} src={c.photo.src} alt="" loading={i ? "lazy" : "eager"} className={i === active ? "is-on" : ""} />)}
        </div>
        {/* The prints already seen, left in a loose pile behind the current one, and its shadow */}
        <div aria-hidden className="st-late st-stack">
          <span className="st-shade" />
          {chapters.map((c, i) => c.photo && <span key={i} className="st-card" data-d={Math.min(3, Math.max(0, active - i))}><img src={c.photo.src} alt="" loading="lazy" /></span>)}
        </div>
        <div className="st-window" aria-hidden>
          {chapters.map((c, i) => c.photo && <img key={i} src={c.photo.src} alt="" loading={i ? "lazy" : "eager"} className={`st-photo ${i === active ? "is-on" : ""}`} />)}
          <span key={`sheen-${active}`} className="st-sheen" />
        </div>
        <div className="st-out" aria-hidden>
          <div className="st-out-map"><svg viewBox={`0 0 ${map.w} ${map.h}`}><path d={map.land} /></svg></div>
          <span className="st-out-ring" style={{ "--r": 0.62 } as React.CSSProperties} />
          <span className="st-out-ring" style={{ "--r": 0.4 } as React.CSSProperties} />
          <span className="st-out-dot" />
          <p className="st-out-town"><b>{map.town}</b><span>{map.sub}</span></p>
        </div>
        <div className="st-where">{children}</div>
        <span aria-hidden className="st-late st-mat" />

        <p aria-hidden className="st-title xp-display">{kicker.split(" of ").map((t, i) => <span key={t}>{i ? `of ${t}` : t}</span>)}</p>

        <p className="st-late st-label"><b>01</b>{kicker}</p>
        <p className="st-late st-count" aria-live="polite">{num(active)}<span> / {String(n).padStart(2, "0")}</span></p>

        <div aria-hidden className="st-late st-caption">
          {chapters.map((c, i) => c.photo && (
            <p key={i} className={i === active ? "is-on" : ""}>
              <span>Fig. {num(i)}</span>{c.photo.kind === "placeholder" ? "AI placeholder, not a photograph of Baler: " : ""}{c.photo.alt}
            </p>
          ))}
        </div>

        <div aria-hidden className="st-late st-year">
          <p className="st-prefix">{year.prefix}</p>
          <p className="st-number">
            {year.digits.map((d, k) => (
              <span key={k} className="st-roll" style={{ "--v": d, "--k": k } as React.CSSProperties}><span className="st-strip">{DIGITS.map((x) => <b key={x}>{x}</b>)}</span></span>
            ))}
          </p>
        </div>

        {chapters.map((c, i) => (
          <article key={c.year} className={`st-late st-text ${i === active ? "is-on" : ""}`} aria-hidden={i !== active}>
            <p className="st-kicker" style={{ "--i": 0 } as React.CSSProperties}><span>{num(i)}</span>{c.year}</p>
            <h2 style={{ "--i": 1 } as React.CSSProperties}>{c.title}</h2>
            {c.body.map((b, k) => <p key={b.slice(0, 24)} className="st-body" style={{ "--i": k + 2 } as React.CSSProperties}>{b}</p>)}
            <a href={c.source.url} className="st-source" rel="noopener" tabIndex={i === active ? 0 : -1} style={{ "--i": c.body.length + 2 } as React.CSSProperties}>Source: {c.source.label}</a>
          </article>
        ))}

        <nav className="st-late st-line" aria-label="Chapters">
          <span aria-hidden className="st-fill" />
          <span aria-hidden className="st-dot" />
          {chapters.map((c, i) => {
            const y = splitYear(c.year);
            return (
              <button key={c.year} type="button" onClick={() => go(i)} aria-current={i === active ? "step" : undefined} data-past={i < active || undefined} style={{ "--i": i } as React.CSSProperties} aria-label={`${c.year}: ${c.title}`}>
                {c.photo && <span aria-hidden className="st-thumb"><img src={c.photo.src} alt="" loading="lazy" /></span>}
                {y.prefix && <span className="st-tick-pre">{y.prefix} </span>}{y.tail}
              </button>
            );
          })}
        </nav>
      </div>
    </section>
  );
}
