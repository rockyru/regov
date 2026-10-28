import { baler } from "./baler";
import * as balerMaps from "./maps/baler";
import type { GeoMap } from "./geo";
import type { Portal } from "./types";

const PORTALS: Record<string, Portal> = { baler };
/** Each portal's maps: the country, its province and the town's coast (src/lib/explore/maps/). */
const MAPS: Record<string, { country: GeoMap; province: GeoMap; town: GeoMap }> = {
  baler: { country: balerMaps.philippines, province: balerMaps.aurora, town: balerMaps.baler },
};

export const getPortal = (slug: string): Portal | null => PORTALS[slug] ?? null;
export const getMaps = (slug: string) => MAPS[slug] ?? null;
export const portalSlugs = () => Object.keys(PORTALS);
