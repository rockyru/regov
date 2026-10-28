/**
 * Builds an Explore portal's three maps as SVG path data: src/lib/explore/maps/<slug>.ts.
 *
 *   npm run explore:maps -- <slug> --province "Aurora" --bbox 121.535,15.722,121.652,15.786
 *
 * - country: the Philippines, Natural Earth 1:50m (public domain)
 * - province: the province's outline, Natural Earth 1:10m (land only; OpenStreetMap's boundary
 *   runs out over municipal waters)
 * - town: the coast, main roads and rivers inside --bbox ([west, south, east, north]), from
 *   OpenStreetMap through Overpass (© OpenStreetMap contributors, ODbL). Pick a box around the
 *   town centre and its places. An inland town with no coastline in the box is drawn as all land.
 *
 * Downloads are cached in .cache/explore-maps/ (gitignored); delete a file there to refetch it.
 * Projection: equirectangular, longitude scaled by the cosine of the map's middle latitude
 * (src/lib/explore/geo.ts). Register the module in src/lib/explore/index.ts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Pt = [number, number];
type BBox = [number, number, number, number];

const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson";
const OVERPASS = ["https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass-api.de/api/interpreter"];
const UA = "REGOVBot/1.0 (+https://regov.app/bot)";
const CACHE = process.env.EXPLORE_MAPS_CACHE ?? ".cache/explore-maps";

function args() {
  const [slug, ...rest] = process.argv.slice(2);
  const opt = (name: string) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
  const province = opt("province"), bbox = opt("bbox")?.split(",").map(Number);
  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !province || bbox?.length !== 4 || bbox.some(Number.isNaN)) {
    console.error('usage: npm run explore:maps -- <slug> --province "<Natural Earth province name>" --bbox west,south,east,north');
    process.exit(1);
  }
  return { slug, province, bbox: bbox as BBox, out: opt("out") ?? `src/lib/explore/maps/${slug}.ts` };
}

async function cached(name: string, fetcher: () => Promise<string>) {
  const file = join(CACHE, name);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  mkdirSync(CACHE, { recursive: true });
  const body = await fetcher();
  const data = JSON.parse(body);
  writeFileSync(file, body);
  return data;
}

async function download(url: string) {
  console.log(`fetching ${url}`);
  const r = await fetch(url, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`${url}: ${r.status}`);
  return r.text();
}

/** The public Overpass servers are often busy: try each mirror, then back off and go round again. */
async function overpass(query: string) {
  for (let round = 0, wait = 10_000; round < 3; round++, wait *= 3) {
    for (const ep of OVERPASS) {
      console.log(`querying ${ep}`);
      try {
        const r = await fetch(ep, { method: "POST", headers: { "User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ data: query }), signal: AbortSignal.timeout(150_000) });
        const text = await r.text();
        if (r.ok && text.startsWith("{")) return text;
        console.log(`  ${r.status}`);
      } catch (err) { console.log(`  ${err instanceof Error ? err.name : "failed"}`); }
    }
    if (round < 2) { console.log(`all busy; waiting ${wait / 1000}s`); await new Promise((res) => setTimeout(res, wait)); }
  }
  throw new Error("every Overpass mirror failed; try again later");
}

/** Ramer–Douglas–Peucker simplification, in map units. */
function rdp(pts: Pt[], eps: number): Pt[] {
  if (pts.length < 3) return pts;
  const a = pts[0], b = pts[pts.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-12;
  let i = 0, dmax = -1;
  for (let j = 1; j < pts.length - 1; j++) {
    const p = pts[j];
    const d = dx || dy ? Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / L : Math.hypot(p[0] - a[0], p[1] - a[1]);
    if (d > dmax) { i = j; dmax = d; }
  }
  if (dmax <= eps) return [a, b];
  return [...rdp(pts.slice(0, i + 1), eps).slice(0, -1), ...rdp(pts.slice(i), eps)];
}

class GeoMap {
  k: number; sc: number; h: number;
  constructor(public bbox: BBox, public w: number) {
    this.k = Math.cos(((bbox[1] + bbox[3]) / 2) * Math.PI / 180);
    this.sc = w / ((bbox[2] - bbox[0]) * this.k);
    this.h = Math.round((bbox[3] - bbox[1]) * this.sc);
  }
  p([lon, lat]: Pt): Pt { return [(lon - this.bbox[0]) * this.k * this.sc, (this.bbox[3] - lat) * this.sc]; }
  path(rings: Pt[][], eps: number, close: boolean) {
    let out = "";
    for (const r of rings) {
      const pts = rdp(r.map((c) => this.p(c)), eps);
      if (pts.length < 2 || (close && pts.length < 3)) continue;
      out += "M" + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join("L") + (close ? "Z" : "");
    }
    return out;
  }
  meta() { return { w: this.w, h: this.h, bbox: this.bbox, k: Number(this.k.toFixed(6)), sc: Number(this.sc.toFixed(4)) }; }
}

type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: Pt[][] | Pt[][][] };
const outerRings = (g: Geometry): Pt[][] => (g.type === "MultiPolygon" ? (g.coordinates as Pt[][][]) : [g.coordinates as Pt[][]]).map((poly) => poly[0]);
const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Joins OpenStreetMap ways into chains by their shared end points. */
function stitch(input: Pt[][]) {
  const ways = input.map((w) => [...w]);
  const chains: Pt[][] = [];
  while (ways.length) {
    let c = ways.pop()!;
    for (let changed = true; changed;) {
      changed = false;
      for (let i = 0; i < ways.length; i++) {
        const w = ways[i];
        if (same(w[0], c[c.length - 1])) c = [...c, ...w.slice(1)];
        else if (same(w[w.length - 1], c[0])) c = [...w.slice(0, -1), ...c];
        else continue;
        ways.splice(i, 1); changed = true; break;
      }
    }
    chains.push(c);
  }
  return chains;
}

/** The pieces of a polyline inside box b (lon/lat), Liang–Barsky per segment. */
function clipLine(pts: Pt[], [x0, y0, x1, y1]: BBox) {
  const pieces: Pt[][] = [];
  let cur: Pt[] = [];
  for (let s = 0; s + 1 < pts.length; s++) {
    const [ax, ay] = pts[s], [bx, by] = pts[s + 1];
    const dx = bx - ax, dy = by - ay;
    let t0 = 0, t1 = 1, ok = true;
    for (const [p, q] of [[-dx, ax - x0], [dx, x1 - ax], [-dy, ay - y0], [dy, y1 - ay]]) {
      if (p === 0) { if (q < 0) { ok = false; break; } }
      else { const r = q / p; if (p < 0) t0 = Math.max(t0, r); else t1 = Math.min(t1, r); }
    }
    if (!ok || t0 > t1) { if (cur.length) { pieces.push(cur); cur = []; } continue; }
    const A: Pt = [ax + t0 * dx, ay + t0 * dy], B: Pt = [ax + t1 * dx, ay + t1 * dy];
    if (!cur.length) cur = [A];
    cur.push(B);
    if (t1 < 1) { pieces.push(cur); cur = []; }
  }
  if (cur.length) pieces.push(cur);
  return pieces;
}

/** Closes the coastline (land on its left) against the box, walking the box anticlockwise. */
function land(coast: Pt[][], b: BBox): Pt[][] {
  const [x0, y0, x1, y1] = b;
  const per = 2 * ((x1 - x0) + (y1 - y0));
  const t = ([x, y]: Pt) => {
    const e = 1e-9;
    if (Math.abs(y - y0) < e) return x - x0;
    if (Math.abs(x - x1) < e) return (x1 - x0) + (y - y0);
    if (Math.abs(y - y1) < e) return (x1 - x0) + (y1 - y0) + (x1 - x);
    return 2 * (x1 - x0) + (y1 - y0) + (y1 - y);
  };
  const corners: [number, Pt][] = [[0, [x0, y0]], [x1 - x0, [x1, y0]], [(x1 - x0) + (y1 - y0), [x1, y1]], [2 * (x1 - x0) + (y1 - y0), [x0, y1]]];
  const polys: Pt[][] = [], pieces: Pt[][] = [];
  for (const c of stitch(coast)) {
    if (same(c[0], c[c.length - 1]) && c.every(([x, y]) => x0 <= x && x <= x1 && y0 <= y && y <= y1)) { polys.push(c); continue; }
    pieces.push(...clipLine(c, b).filter((p) => p.length > 1));
  }
  const used = pieces.map(() => false);
  for (let i = 0; i < pieces.length; i++) {
    if (used[i]) continue;
    const ring: Pt[] = [];
    let j = i;
    while (!used[j]) {
      used[j] = true; ring.push(...pieces[j]);
      const te = t(pieces[j][pieces[j].length - 1]);
      // The next piece to start, going anticlockwise round the box from te.
      let nxt = 0;
      for (let k = 1; k < pieces.length; k++) if (mod(t(pieces[k][0]) - te, per) < mod(t(pieces[nxt][0]) - te, per)) nxt = k;
      const ts = t(pieces[nxt][0]);
      for (const [ct, cp] of [...corners].sort((p, q) => mod(p[0] - te, per) - mod(q[0] - te, per))) if (mod(ct - te, per) < mod(ts - te, per)) ring.push(cp);
      j = nxt;
    }
    polys.push(ring);
  }
  return polys;
}

async function main() {
  const { slug, province, bbox, out } = args();

  const countries = await cached("ne_50m_admin_0_countries.geojson", () => download(`${NE}/ne_50m_admin_0_countries.geojson`));
  const ph = countries.features.find((f: { properties: Record<string, string> }) => f.properties.ADM0_A3 === "PHL").geometry as Geometry;
  const PH = new GeoMap([116.8, 4.5, 126.7, 21.2], 500);
  const country = { ...PH.meta(), land: PH.path(outerRings(ph), 0.6, true) };

  const admin1 = await cached("ne_10m_admin_1_states_provinces.geojson", () => download(`${NE}/ne_10m_admin_1_states_provinces.geojson`));
  const provinces = admin1.features.filter((f: { properties: Record<string, string> }) => f.properties.adm0_a3 === "PHL");
  const prov = provinces.find((f: { properties: Record<string, string> }) => f.properties.name === province);
  if (!prov) {
    console.error(`No province "${province}" in Natural Earth. Its names:\n${provinces.map((f: { properties: Record<string, string> }) => f.properties.name).sort().join(", ")}`);
    process.exit(1);
  }
  const rings = outerRings(prov.geometry);
  const lons = rings.flat().map(([x]) => x), lats = rings.flat().map(([, y]) => y);
  const r3 = (v: number) => Number(v.toFixed(3));
  const PV = new GeoMap([r3(Math.min(...lons) - 0.04), r3(Math.min(...lats) - 0.04), r3(Math.max(...lons) + 0.04), r3(Math.max(...lats) + 0.04)], 420);
  const provinceMap = { ...PV.meta(), land: PV.path(rings, 0.4, true) };

  const pad = 0.05, [w, s, e, n] = bbox;
  const q = `[out:json][timeout:120];(way["natural"="coastline"](${s - pad},${w - pad},${n + pad},${e + pad});way["highway"~"^(primary|secondary|tertiary|trunk)$"](${s - pad},${w - pad},${n + pad},${e + pad});way["waterway"="river"](${s - pad},${w - pad},${n + pad},${e + pad}););out geom;`;
  const osm = await cached(`${slug}-osm.json`, () => overpass(q));
  type El = { tags: Record<string, string>; geometry: { lat: number; lon: number }[] };
  const els = (osm.elements as El[]).filter((x) => x.geometry);
  const geom = (x: El) => x.geometry.map((g) => [g.lon, g.lat] as Pt);
  const coast = els.filter((x) => x.tags.natural === "coastline").map(geom);
  const roads = els.filter((x) => x.tags.highway).map(geom);
  const rivers = els.filter((x) => x.tags.waterway).map(geom);
  const TW = new GeoMap(bbox, 1200);
  const wide: BBox = [w - 0.01, s - 0.01, e + 0.01, n + 0.01];
  const townLand = coast.length ? land(coast, bbox) : [[[w, s], [e, s], [e, n], [w, n]] as Pt[]];
  const town = {
    ...TW.meta(),
    land: TW.path(townLand, 0.6, true),
    roads: TW.path(roads.flatMap((r) => clipLine(r, wide)), 0.6, false),
    rivers: TW.path(rivers.flatMap((r) => clipLine(r, wide)), 0.6, false),
  };

  const maps: Record<string, object> = { country, province: provinceMap, town };
  writeFileSync(out, [
    "// Generated by scripts/explore-maps.ts from Natural Earth (public domain) and OpenStreetMap",
    "// (© OpenStreetMap contributors, ODbL). Projection: equirectangular, longitude scaled by cos(mid-latitude).",
    'import type { GeoMap } from "../geo";',
    "",
    ...Object.entries(maps).map(([k, v]) => `export const ${k}: GeoMap = ${JSON.stringify(v)};`),
    "",
  ].join("\n"));
  for (const [k, v] of Object.entries(maps)) console.log(k, Object.fromEntries(Object.entries(v).map(([a, b]) => [a, typeof b === "string" ? `${b.length} chars` : b])));
  console.log(`wrote ${out}`);
}

main().catch((err) => { console.error(err instanceof Error ? err.message : err); process.exit(1); });
