/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Happening, Portal } from "@/lib/explore/types";
import { Room } from "./Room";
import { EventStatus } from "./EventStatus";
import { KIND, MONTHS, num } from "./kinds";

/**
 * An event's own page: its photograph (or the town's, blurred) with the name and an index of the
 * year's other events; when it is, and whether it is past or to come; what the LGU says of it; the
 * place it is tied to, where the LGU's pages say so; and the rest of the year. Nothing beyond the
 * LGU's pages. Styles: .evp-* and the place page's .pp-* in src/app/explore/explore.css.
 */
export function EventView({ portal: x, event: e }: { portal: Portal; event: Happening }) {
  const events = [...x.events].sort((a, b) => a.month - b.month);
  const i = events.indexOf(e), n = events.length;
  const base = `/explore/${x.slug}/events`;
  const place = x.places.find((p) => p.slug === e.place);
  const main = e.photo?.src ?? x.hero.src;
  const others = events.filter((o) => o !== e);
  const photos = [...new Set([main, place?.photo?.src, ...others.map((o) => o.photo?.src)].filter((s): s is string => !!s))];
  const when = e.dates.replace(/, every year$/, "");

  return (
    <>
      <section className="pp-hero" aria-labelledby="event-name">
        {e.photo ? <img src={e.photo.src} alt={e.photo.alt} className="pp-hero-photo" fetchPriority="high" />
          : <><span className="pp-hero-blank" aria-hidden /><img src={x.hero.src} alt="" className="pp-hero-soft" aria-hidden /></>}
        <div className="pp-hero-copy">
          <p className="pp-kind">{when}{e.year ? `, ${e.year}` : " · every year"} · {x.town}, {x.province}</p>
          <h1 id="event-name" className="pp-name">{e.name}</h1>
        </div>
        <nav className="pp-index" aria-label="Events">
          {events.map((o, k) => (
            <Link key={o.slug} href={`${base}/${o.slug}`} aria-current={o === e ? "page" : undefined} aria-label={o.name}>{num(k)}</Link>
          ))}
        </nav>
        <p className="pp-hero-note">{e.photo ? "Photo is an AI placeholder, not a picture of this event." : ""}</p>
      </section>

      <div className="pp-rest xp-lit">
        <Room photos={photos} />
        <div className="pp-strip" aria-hidden>
          <span>{e.name}</span><span>{num(i)} / {String(n).padStart(2, "0")}</span><span>{e.name}</span>
        </div>

        <section className="evp-when" data-room={main} aria-label={`When ${e.name} is`}>
          <div>
            <p className="pl-kicker">{MONTHS[e.month - 1]}{e.year ? ` ${e.year}` : ""}</p>
            <p className="evp-date">{when}</p>
            <p className="evp-year">{e.year ? `The ${e.year} dates, as the LGU published them.` : "Kept on this day every year."}</p>
            <EventStatus event={e} className="evp-status" />
          </div>
          <dl className="pp-facts">
            <div><dt>Month</dt><dd>{MONTHS[e.month - 1]}</dd></div>
            {place && <div><dt>Place</dt><dd><Link href={`/explore/${x.slug}/places/${place.slug}`}>{place.name}</Link></dd></div>}
            <div><dt>Listed by</dt><dd><a href={e.source.url} rel="noopener">{e.source.label}</a></dd></div>
          </dl>
        </section>

        <section className="pp-about" data-room={main} aria-label={`About ${e.name}`}>
          <article className="pp-card">
            <p className="pp-card-n">{num(i)}</p>
            <div>
              <h2>{e.name}</h2>
              <p>{e.note ?? `The LGU lists ${e.name} among ${x.town}'s events for ${e.year ?? "the year"}.`}</p>
              <a href={e.source.url} rel="noopener" className="pp-source">Source: {e.source.label}</a>
            </div>
          </article>
        </section>

        {place && (
          <section className="pp-near" aria-labelledby="place-title">
            <h2 id="place-title">The place</h2>
            <ol className="pp-near-list">
              <li data-room={place.photo?.src}>
                <Link href={`/explore/${x.slug}/places/${place.slug}`} className="pl-card">
                  <span className="pl-card-media">
                    {place.photo ? <img src={place.photo.src} alt="" loading="lazy" /> : <span className="pl-card-blank" aria-hidden>{KIND[place.kind]}</span>}
                  </span>
                  <span className="pl-card-meta"><span>{KIND[place.kind]}</span><span>{num(x.places.indexOf(place))}</span></span>
                  <span className="pl-card-name">{place.name}</span>
                </Link>
              </li>
            </ol>
          </section>
        )}

        <section className="pp-near" aria-labelledby="more-title">
          <h2 id="more-title">The rest of the year</h2>
          <ol className="ev-grid evp-more">
            {others.map((o) => (
              <li key={o.slug} data-room={o.photo?.src}>
                <Link href={`${base}/${o.slug}`} className="ev-card">
                  <div className="ev-media">
                    {o.photo ? <img src={o.photo.src} alt="" loading="lazy" /> : <span className="ev-media-month xp-display" aria-hidden>{MONTHS[o.month - 1]}</span>}
                    <EventStatus event={o} className="ev-status" />
                  </div>
                  <div className="ev-body">
                    <p className="ev-dates">{o.dates}{o.year ? `, ${o.year}` : ""}</p>
                    <h3>{o.name}</h3>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        <footer className="pp-foot">
          <nav className="pp-pager" aria-label="Previous and next event">
            <Link href={`${base}/${events[(i - 1 + n) % n].slug}`}><span>Previous</span>{events[(i - 1 + n) % n].name}</Link>
            <Link href={`/explore/${x.slug}#events`} className="pp-all">All events</Link>
            <Link href={`${base}/${events[(i + 1) % n].slug}`}><span>Next</span>{events[(i + 1) % n].name}</Link>
          </nav>
          <p className="pp-concept">Unofficial concept by <Link href="/">RE:GOV</Link>. Not made by the LGU or the Department of Tourism. Dates as the LGU published them; check the source before you travel. Photos are AI placeholders.</p>
        </footer>
      </div>
    </>
  );
}
