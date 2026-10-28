/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Portal } from "@/lib/explore/types";

/**
 * The portal's footer, over the town's photograph: the LGU's own sites up top (where every fact
 * here came from), the town's sign-off in Barabara beside three places to start with, the
 * wordmark, the sections, and the unofficial-concept line. Styles: .xf-* in explore.css.
 */
const SECTIONS = [["Home", "top"], ["Story", "story"], ["Places", "places"], ["Events", "events"], ["Plan", "plan"]];

export function Footer({ portal: x, base = "" }: { portal: Portal; base?: string }) {
  const sites = [...new Map(x.sources.map((s) => { const u = new URL(s.url); return [u.host, `${u.protocol}//${u.host}/`]; })).entries()];
  const picks = (x.picks ? x.picks.map((slug) => x.places.find((p) => p.slug === slug)) : x.places).filter((p) => p?.photo).slice(0, 3);
  return (
    <footer className="xf">
      <img src={x.hero.src} alt="" className="xf-bg" loading="lazy" />
      <div className="xf-top">
        <p className="xf-kicker xp-display">From the LGU&apos;s own pages</p>
        <ul className="xf-sites">
          {sites.map(([host, url]) => <li key={host}><a href={url} rel="noopener">{host} <span aria-hidden>↗</span></a></li>)}
        </ul>
      </div>

      <div className="xf-mid">
        <div>
          <p className="xf-say xp-display">{x.notes.tagline.map((t) => <span key={t}>{t}</span>)}</p>
          <p className="xf-lede">{x.promise}. {x.lede}</p>
          <a href={x.notes.taglineSource.url} rel="noopener" className="xf-source">Source: {x.notes.taglineSource.label}</a>
        </div>
        <ul className="xf-picks">
          {picks.map((p) => (
            <li key={p!.slug}>
              <Link href={`/explore/${x.slug}/places/${p!.slug}`}>
                <img src={p!.photo!.src} alt="" loading="lazy" />
                <span>{p!.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="xf-rule" aria-hidden />
      <p className="xf-mark xp-display" aria-hidden>{x.town}</p>
      <nav className="xf-nav" aria-label="Sections">
        {SECTIONS.map(([label, id]) => <a key={id} href={`${base}#${id}`}>{label}</a>)}
      </nav>
      <p className="xf-legal">Unofficial concept by <Link href="/">RE:GOV</Link>. Not made by the LGU or the Department of Tourism. Photos are AI placeholders; illustrations made with Muse Image. Maps: Natural Earth; © OpenStreetMap contributors.</p>
    </footer>
  );
}
