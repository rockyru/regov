/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import type { Portal } from "@/lib/explore/types";
import type { GeoMap } from "@/lib/explore/geo";
import { GeoSvg } from "./GeoSvg";
import { KIND, num } from "./kinds";
import { Room } from "./Room";
import { CoastMap } from "./CoastMap";

/**
 * Where the town sits: the section head, the copy, a slot for the country map and the province
 * beside it. It is set inside the story's last screen (Story.tsx), whose map pulls back from the
 * town to the whole country and then settles into the slot, so there is only ever one map.
 */
export function PlacesWhere({ portal: x, maps }: { portal: Portal; maps: { province: GeoMap } }) {
  return (
    <div className="pl-scene">
      <header className="pl-head"><p><b>02</b>Places</p><p>{x.province} · {x.region} · Philippines</p></header>
      <div className="pl-where">
        <div className="pl-copy">
          <p className="pl-kicker">On the Pacific coast of Luzon</p>
          <h2 id="places-title" className="pl-h">Where Luzon<br />meets <span className="pl-outline">the Pacific.</span></h2>
          <p className="pl-lede">{x.lede}</p>
          <a href={x.gettingThere.source.url} className="pl-link" rel="noopener">How to get there <span aria-hidden>↗</span></a>
        </div>

        <figure className="pl-locator">
          <span className="pl-north" aria-hidden>N<i>↑</i></span>
          <div className="pl-slot" role="img" aria-label={`${x.town} on a map of the Philippines`} />
          <span className="pl-ocean" aria-hidden>Pacific<br />Ocean</span>
          <figcaption>The Philippines</figcaption>
        </figure>

        <aside className="pl-side">
          <p className="pl-vertical" aria-hidden>{x.province}</p>
          <GeoSvg map={maps.province} pins={[{ lat: x.center.lat, lon: x.center.lon, label: x.town }]} className="pl-province" label={`${x.town} on a map of ${x.province}`} />
          <dl className="pl-facts">
            {x.facts.slice(0, 2).map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}
          </dl>
        </aside>
      </div>
    </div>
  );
}

/**
 * Places, after where the town sits: its coast with every place the LGU's map pins, and a card for
 * each place, which opens its own page. Behind it, a Room: a blurred photograph that follows the
 * part you are reading or the card you point at. Styles: .pl-* in src/app/explore/explore.css.
 */
export function Places({ portal: x, maps }: { portal: Portal; maps: { town: GeoMap } }) {
  const base = `/explore/${x.slug}/places`;
  const pinned = x.places.map((p, i) => ({ p, i })).filter(({ p }) => p.at);
  // The room behind the section: the cove behind the coast, each card's own photo behind it.
  const coast = x.places.find((p) => p.slug === "dicasalarin-cove")?.photo?.src;
  const photos = [...new Set([coast, ...x.places.map((p) => p.photo?.src)].filter((s): s is string => !!s))];
  return (
    <section className="pl xp-lit" aria-label={`Places in ${x.town}`}>
      <Room photos={photos} />
      <div className="pl-coast" data-room={coast}>
        <div className="pl-coast-head">
          <h3>{pinned.length} places on the coast</h3>
          <p>Pinned where <a href={pinned[0]?.p.at?.source.url} rel="noopener">the LGU&apos;s interactive map</a> puts them. Pick a place to fly to it; drag the map to look around.</p>
        </div>
        <CoastMap map={maps.town} label={`Map of ${x.town}'s coast with ${pinned.length} places`}
          places={pinned.map(({ p, i }) => ({ n: i + 1, name: p.name, kind: KIND[p.kind], photo: p.photo?.src, href: `${base}/${p.slug}`, lat: p.at!.lat, lon: p.at!.lon }))} />
      </div>

      <ol className="pl-grid">
        {x.places.map((p, i) => (
          <li key={p.slug} data-room={p.photo?.src}>
            <Link href={`${base}/${p.slug}`} className="pl-card">
              <span className="pl-card-media">
                {p.photo ? <img src={p.photo.src} alt="" loading="lazy" />
                  : p.at ? <GeoSvg map={maps.town} focus={p.at} span={0.03} pins={[{ lat: p.at.lat, lon: p.at.lon, label: p.name, active: true }]} label="" />
                  : <span className="pl-card-blank" aria-hidden>{KIND[p.kind]}</span>}
              </span>
              <span className="pl-card-meta"><span>{KIND[p.kind]}</span><span>{num(i)}</span></span>
              <span className="pl-card-name">{p.name}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p className="pl-note">Photos are AI placeholders, not pictures of these places. Maps: Natural Earth; © OpenStreetMap contributors.</p>
    </section>
  );
}
