/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Place, Portal } from "@/lib/explore/types";
import { nearest, osmLink, project, type GeoMap } from "@/lib/explore/geo";
import { GeoSvg } from "./GeoSvg";
import { KIND, num } from "./kinds";
import { Room } from "./Room";

/**
 * A place's own page: the photograph with the place's name and an index of its neighbours in the
 * list; where it is (the province with its pin, the country below); the photograph again with the
 * name; what the LGU says of it; and the places nearest it on the coast. Nothing is said that the
 * LGU's pages and map do not say; distances are straight lines between the LGU's pins.
 * Below the hero it sits in a Room lit by its own photograph, and by a neighbour's when you point
 * at one. Styles: .pp-* in src/app/explore/explore.css.
 */
export function PlaceView({ portal: x, place: p, maps }: { portal: Portal; place: Place; maps: { country: GeoMap; province: GeoMap; town: GeoMap } }) {
  const base = `/explore/${x.slug}/places`;
  const i = x.places.indexOf(p), n = x.places.length;
  const at = p.at ?? x.center;
  const around = [-2, -1, 0, 1, 2].map((d) => (i + d + n) % n);
  const near = nearest(p, x.places, 4);
  const others = near.length ? near.map((q) => ({ place: q.place, km: q.km })) : x.places.filter((q) => q !== p && q.kind === p.kind).concat(x.places.filter((q) => q !== p && q.kind !== p.kind)).slice(0, 4).map((q) => ({ place: q, km: 0 }));
  const prov = maps.province, [px, py] = project(prov, at.lat, at.lon);
  const ctry = maps.country, [qx, qy] = project(ctry, x.center.lat, x.center.lon);
  const where = [p.at?.address, p.barangay && `Barangay ${p.barangay}`, x.town, x.province].filter(Boolean).join(", ");
  const span = near.length ? Math.max(0.02, ...near.map((q) => Math.abs(q.place.at!.lat - at.lat) * 2.6), ...near.map((q) => (Math.abs(q.place.at!.lon - at.lon) * 2.6) / 1.6)) : 0.03;

  const main = p.photo?.src ?? x.hero.src;
  const photos = [...new Set([main, ...others.map((o) => o.place.photo?.src)].filter((s): s is string => !!s))];
  return (
    <>
      <section className="pp-hero" aria-labelledby="place-name">
        {p.photo ? <img src={p.photo.src} alt={p.photo.alt} className="pp-hero-photo" fetchPriority="high" />
          : p.at ? <GeoSvg map={maps.town} focus={p.at} span={0.05} pins={[{ lat: p.at.lat, lon: p.at.lon, label: p.name, active: true }]} className="pp-hero-map" label={`${p.name} on a map of ${x.town}`} />
          : <span className="pp-hero-blank" aria-hidden />}
        {/* No photograph of its own: the town's, blurred, lights the map or the blank behind the name */}
        {!p.photo && <img src={x.hero.src} alt="" className="pp-hero-soft" aria-hidden />}
        <div className="pp-hero-copy">
          <p className="pp-kind">{KIND[p.kind]}{p.barangay ? ` · ${p.barangay}` : ""} · {x.town}, {x.province}</p>
          <h1 id="place-name" className="pp-name">{p.name}</h1>
        </div>
        <nav className="pp-index" aria-label="Places">
          {around.map((k) => (
            <Link key={k} href={`${base}/${x.places[k].slug}`} aria-current={k === i ? "page" : undefined} aria-label={x.places[k].name}>{num(k)}</Link>
          ))}
        </nav>
        <p className="pp-hero-note">{p.photo ? "Photo is an AI placeholder, not a picture of this place." : p.at ? "Map: © OpenStreetMap contributors. Pin: the LGU's interactive map." : ""}</p>
      </section>

      <div className="pp-rest xp-lit">
      <Room photos={photos} />
      <div className="pp-strip" aria-hidden>
        <span>{p.name}</span><span>{num(i)} / {num(n - 1)}</span><span>{p.name}</span>
      </div>

      <section className="pp-where" data-room={main} aria-label={`Where ${p.name} is`}>
        <div className="pp-where-copy">
          <p className="pp-crumbs">Philippines <i>›</i> {x.province} <i>›</i> {x.town}</p>
          <p className="pp-address">{where}</p>
          {p.at
            ? <a href={osmLink(p.at.lat, p.at.lon)} className="pp-button" rel="noopener">Open on the map <span aria-hidden>↗</span></a>
            : <p className="pp-unpinned">The LGU&apos;s map does not pin {p.name} yet, so the map shows the town.</p>}
        </div>
        <figure className="pp-locator">
          <div className="pp-province">
            <svg viewBox={`0 0 ${prov.w} ${prov.h}`} role="img" aria-label={`${p.at ? p.name : x.town} on a map of ${x.province}`}>
              <path d={prov.land} className="pp-land" />
              <circle cx={px} cy={py} r={14} className="pp-pin-ring" />
              <circle cx={px} cy={py} r={5} className="pp-pin" />
            </svg>
            <p className="pp-vertical pp-v1" aria-hidden>{x.province}</p>
            <p className="pp-vertical pp-v2" aria-hidden>{x.town}</p>
          </div>
          <span className="pp-thread" aria-hidden />
          <svg viewBox={`0 0 ${ctry.w} ${ctry.h}`} className="pp-country" role="img" aria-label={`${x.province} on a map of the Philippines`}>
            <path d={ctry.land} className="pp-country-land" />
            <circle cx={qx} cy={qy} r={22} className="pp-pin" />
          </svg>
          <figcaption>Philippines</figcaption>
        </figure>
        <dl className="pp-facts">
          <div><dt>Kind</dt><dd>{KIND[p.kind]}</dd></div>
          {p.at && <div><dt>On the LGU&apos;s map</dt><dd><a href={p.at.source.url} rel="noopener">{p.at.label}</a></dd></div>}
          <div><dt>Listed by</dt><dd><a href={p.source.url} rel="noopener">{p.source.label}</a></dd></div>
        </dl>
      </section>

      {p.photo && (
        <section className="pp-band" aria-hidden>
          <img src={p.photo.src} alt="" loading="lazy" />
          <p className="pp-band-name xp-display">{p.name}</p>
        </section>
      )}

      <section className="pp-about" data-room={main} aria-label={`About ${p.name}`}>
        <article className="pp-card">
          <p className="pp-card-n">{num(i)}</p>
          <div>
            <h2>{p.name}</h2>
            <p>{p.note ?? `The LGU lists ${p.name} among ${x.town}'s tourist spots.`}</p>
            <a href={p.source.url} rel="noopener" className="pp-source">Source: {p.source.label}</a>
          </div>
        </article>
      </section>

      <section className="pp-near" aria-labelledby="near-title">
        <h2 id="near-title">{near.length ? `Nearest to ${p.name}` : "More places"}</h2>
        {near.length > 0 && (
          <GeoSvg map={maps.town} focus={p.at} span={span} className="pp-near-map" label={`${p.name} and the places nearest it`}
            pins={[{ lat: p.at!.lat, lon: p.at!.lon, n: i + 1, label: p.name, active: true }, ...near.map((q) => ({ lat: q.place.at!.lat, lon: q.place.at!.lon, n: x.places.indexOf(q.place) + 1, label: q.place.name, href: `${base}/${q.place.slug}` }))]} />
        )}
        <ol className="pp-near-list">
          {others.map(({ place: q, km }) => (
            <li key={q.slug} data-room={q.photo?.src}>
              <Link href={`${base}/${q.slug}`} className="pl-card">
                <span className="pl-card-media">
                  {q.photo ? <img src={q.photo.src} alt="" loading="lazy" />
                    : q.at ? <GeoSvg map={maps.town} focus={q.at} span={0.03} pins={[{ lat: q.at.lat, lon: q.at.lon, label: q.name, active: true }]} label="" />
                    : <span className="pl-card-blank" aria-hidden>{KIND[q.kind]}</span>}
                </span>
                <span className="pl-card-meta"><span>{KIND[q.kind]}</span><span>{km ? `${km.toFixed(1)} km` : num(x.places.indexOf(q))}</span></span>
                <span className="pl-card-name">{q.name}</span>
              </Link>
            </li>
          ))}
        </ol>
        {near.length > 0 && <p className="pl-note">Distances are straight lines between the LGU&apos;s pins, not road distances.</p>}
      </section>

      <footer className="pp-foot">
        <nav className="pp-pager" aria-label="Previous and next place">
          <Link href={`${base}/${x.places[(i - 1 + n) % n].slug}`}><span>Previous</span>{x.places[(i - 1 + n) % n].name}</Link>
          <Link href={`/explore/${x.slug}#places`} className="pp-all">All places</Link>
          <Link href={`${base}/${x.places[(i + 1) % n].slug}`}><span>Next</span>{x.places[(i + 1) % n].name}</Link>
        </nav>
        <p className="pp-concept">Unofficial concept by <Link href="/">RE:GOV</Link>. Not made by the LGU or the Department of Tourism. Photos are AI placeholders. Maps: Natural Earth; © OpenStreetMap contributors.</p>
      </footer>
      </div>
    </>
  );
}
