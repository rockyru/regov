/**
 * The Explore kit's maps: SVG path data generated from Natural Earth and OpenStreetMap
 * (src/lib/explore/maps/), drawn in an equirectangular projection with longitude scaled by the
 * cosine of the map's middle latitude. Pins are placed with project().
 */
import type { Place } from "./types";

export type GeoMap = {
  w: number;
  h: number;
  /** [west, south, east, north] */
  bbox: [number, number, number, number];
  /** cos(mid-latitude) */
  k: number;
  /** SVG units per degree of latitude */
  sc: number;
  land: string;
  roads?: string;
  rivers?: string;
};

export const project = (m: GeoMap, lat: number, lon: number): [number, number] => [(lon - m.bbox[0]) * m.k * m.sc, (m.bbox[3] - lat) * m.sc];

/** Great-circle distance in kilometres. */
export function km(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const r = (d: number) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

/** The closest pinned places to a pinned one, nearest first; places at the same pin are left out. */
export function nearest(place: Place, places: Place[], n: number) {
  const at = place.at;
  if (!at) return [];
  return places
    .filter((p) => p !== place && p.at && km(at, p.at) > 0.01)
    .map((p) => ({ place: p, km: km(at, p.at!) }))
    .sort((a, b) => a.km - b.km)
    .slice(0, n);
}

/** An OpenStreetMap link centred on a pin. */
export const osmLink = (lat: number, lon: number, zoom = 17) => `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=${zoom}/${lat}/${lon}`;
