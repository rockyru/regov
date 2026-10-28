/* eslint-disable @next/next/no-img-element */
import type { Portal } from "@/lib/explore/types";
import { Room } from "./Room";

/**
 * Plan your trip, as infographics: Muse Image illustrations for the art, with every figure and
 * word set over them as text from the LGU's pages (the illustrations carry no text, so nothing in
 * them can be wrong). The drive from Manila stop by stop; each way to get there with its one
 * figure; the eco-tourism fee and where it goes; and who to call. Styles: .tp-* in explore.css.
 */
const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export function Plan({ portal: x }: { portal: Portal }) {
  const g = x.gettingThere, f = x.fee;
  const photos = [g.art?.src, ...g.modes.map((m) => m.art?.src)].filter((s): s is string => !!s);
  const last = g.route.length - 1;
  return (
    <section id="plan" className="tp xp-lit" aria-labelledby="plan-title">
      <Room photos={photos} />
      <header className="pl-head"><p><b>04</b>Plan your trip</p><p>Getting there · the fee · who to call</p></header>

      <div className="tp-intro" data-room={g.art?.src}>
        <div>
          <p className="pl-kicker">Getting there</p>
          <h2 id="plan-title" className="pl-h">Manila to<br />the <span className="pl-outline">Pacific.</span></h2>
        </div>
        <dl className="ev-sum">
          {x.facts.slice(2).map((t) => <div key={t.label}><dt>{t.label}</dt><dd>{t.value}</dd></div>)}
        </dl>
      </div>

      {/* The drive: the illustration, and the LGU's list of stops along a line over it */}
      <figure className="tp-route" data-room={g.art?.src}>
        {g.art && <img src={g.art.src} alt="" loading="lazy" className="tp-route-art" />}
        <ol className="tp-stops" style={{ "--n": g.route.length } as React.CSSProperties} aria-label="The drive from Manila, stop by stop">
          {g.route.map((r, i) => <li key={`${r}-${i}`} className={i === 0 || i === last ? "is-end" : ""} style={{ "--i": i } as React.CSSProperties}><span>{r}</span></li>)}
        </ol>
        <figcaption>By car, the route as the LGU gives it: {g.route.length} stops from {g.route[0]} to {g.route[last]}. <a href={g.source.url} rel="noopener">Source: {g.source.label}</a></figcaption>
      </figure>

      <ul className="tp-modes">
        {g.modes.map((m) => (
          <li key={m.mode} className="tp-mode" data-room={m.art?.src}>
            <div className="tp-mode-art">
              {m.art && <img src={m.art.src} alt="" loading="lazy" />}
              {m.stat && <p className="tp-stat"><b>{m.stat.value}</b><span>{m.stat.label}</span></p>}
            </div>
            <div className="tp-mode-body">
              <h3>{m.mode}</h3>
              {m.body.map((b) => <p key={b.slice(0, 24)}>{b}</p>)}
            </div>
          </li>
        ))}
      </ul>

      {/* The fee: the amount set large beside what it covers, where it goes as one bar, who does not pay */}
      <div className="tp-fee">
        <div className="tp-fee-top">
          <div>
            <p className="pl-kicker">{f.basis}</p>
            <h3>{f.title}</h3>
          </div>
          <p className="tp-fee-amount"><b>{f.amount}</b><span>per visitor</span></p>
        </div>
        <ol className="tp-fee-notes">{f.notes.map((n, i) => <li key={n}><span>{String(i + 1).padStart(2, "0")}</span>{n}</li>)}</ol>

        <p className="tp-sub">Where it goes</p>
        <div className="tp-split">
          {f.uses.map((u) => (
            <div key={u.label} style={{ "--s": u.share } as React.CSSProperties}>
              <p className="tp-split-bar"><b>{u.share}%</b></p>
              <p className="tp-split-label">{u.label}</p>
              <p className="tp-split-detail">{u.detail}</p>
            </div>
          ))}
        </div>

        <p className="tp-sub">Who does not pay</p>
        <ul className="tp-exempt">{f.exempt.map((e) => <li key={e.who}><b>{e.who}</b>{e.detail && <span>{e.detail}</span>}</li>)}</ul>
        <a href={f.source.url} rel="noopener" className="tp-source">Source: {f.source.label}</a>
      </div>

      {/* Who to call: the tourism office's number set as large as the story's years, the hotlines as a ruled directory */}
      <div className="tp-help">
        <div className="tp-office">
          <p className="tp-office-head"><span className="pl-kicker">Before you go, call</span><b>{x.office.name}</b></p>
          <a href={tel(x.office.phone)} className="tp-call" aria-label={`Call ${x.office.name}, ${x.office.phone}`}>{x.office.phone}</a>
          <p className="tp-address">{x.office.address}</p>
        </div>
        <p className="tp-sub">Hotlines</p>
        <ul className="tp-lines">
          {x.hotlines.map((h) => (
            <li key={h.name}>
              <b>{h.name}</b>
              {h.numbers.split(" · ").map((n) => <a key={n} href={tel(n)}>{n}</a>)}
            </li>
          ))}
        </ul>
      </div>

      <p className="pl-note">Illustrations made with Muse Image: artwork, not pictures of {x.town}. Every figure is from the LGU&apos;s pages; check them before you travel.</p>
    </section>
  );
}
