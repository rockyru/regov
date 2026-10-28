/**
 * The Explore kit's content model: one tourism portal per LGU (docs/explore.md). Every fact
 * carries the page it came from; images say whether they are the LGU's own or a placeholder.
 */

export type Source = { label: string; url: string };

export type Photo = {
  src: string;
  alt: string;
  /** "placeholder": made with Muse Image to stand in until real photos are chosen. Never a picture of the actual place.
   *  "illustration": made with Muse Image as artwork for an infographic; the facts are set over it as text. */
  kind: "placeholder" | "photo" | "illustration";
  credit?: string;
  /** The same picture with only its subject kept (transparent PNG/WebP), so the subject can rise out of its frame. */
  cutout?: string;
  /** Where the cut-out subject's top edge sits, as a fraction of the picture's height. */
  cutoutTop?: number;
};

export type Chapter = { year: string; title: string; body: string[]; photo?: Photo; source: Source };

/** Where a place is pinned, as the LGU's own interactive map (a Google My Map) has it. */
export type Pin = { lat: number; lon: number; /** The place's name on that map. */ label: string; address?: string; source: Source };

export type Place = {
  /** URL segment of the place's page under /explore/{portal}/places/. */
  slug: string;
  name: string;
  kind: "beach" | "islets" | "heritage" | "church" | "museum" | "nature" | "landmark" | "park";
  barangay?: string;
  note?: string;
  photo?: Photo;
  /** Absent when the LGU's map does not pin the place: nothing is guessed. */
  at?: Pin;
  source: Source;
};

export type Happening = {
  /** Anchor id on the portal page. */
  slug: string;
  name: string;
  month: number;
  dates: string;
  /** Set when the LGU gives the dates for one year only; absent for days kept every year. */
  year?: number;
  note?: string;
  photo?: Photo;
  /** Slug of the place it is held at or tied to, only where the LGU's pages say so. */
  place?: string;
  source: Source;
};

export type Head = { kicker: string; lines: [string, string]; outline: string };

export type Portal = {
  slug: string;
  town: string;
  province: string;
  region: string;
  islandGroup: "Luzon" | "Visayas" | "Mindanao";
  /** Display lines for the masthead, set in Barabara (capitals only). */
  title: string[];
  promise: string;
  lede: string;
  /** Short lines set in the hero's grid: a dated note (set vertically) and a sign-off in the town's own words. */
  notes: { since: [string, string]; tagline: string[]; taglineSource: Source };
  hero: Photo;
  /** The town hall, as the LGU's map pins it: where the town sits on the country and province maps. */
  center: Pin;
  facts: { value: string; label: string }[];
  palette: { accent: string; ink: string; canvas: string };
  story: { kicker: string; chapters: Chapter[] };
  places: Place[];
  /** Section heads in the town's own terms: two lines, then a phrase set in outline. */
  heads: { places: Head; plan: Head };
  /** Slugs of up to three places with photos for the footer; the first three with photos otherwise. */
  picks?: string[];
  feature: { kicker: string; title: string[]; body: string[]; photo: Photo; source: Source };
  events: Happening[];
  gettingThere: {
    /** `stat`: one figure taken from `body`, set large; `art`: an illustration for the mode. */
    modes: { mode: string; body: string[]; stat?: { value: string; label: string }; art?: Photo }[];
    route: string[];
    photo: Photo;
    /** An illustration of the journey, for the route infographic. */
    art?: Photo;
    source: Source;
  };
  fee: {
    title: string;
    amount: string;
    basis: string;
    notes: string[];
    exempt: { who: string; detail: string }[];
    uses: { share: number; label: string; detail: string }[];
    source: Source;
  };
  stay: { categories: string[]; products: string; map: Source; source: Source };
  office: { name: string; phone: string; address: string; email?: string };
  hotlines: { name: string; numbers: string }[];
  sources: Source[];
};
