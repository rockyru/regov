# RE:GOV Explore

Explore takes the tourism side of an LGU and rebuilds it as a portal people want to read: the
town's story told in chapters, its best places, its festivals, where to eat and stay, and how
to get there. It is the flagship tier above the "Visit" hub that every rebuild gets
([tourism.md](tourism.md)), and it is built on the Explore kit described below.

Like every RE:GOV site, an Explore portal is an unofficial concept. It invents nothing, and the
LGU's tourism office is always one tap away.

## How towns are picked

Explore is curated, not open to submissions. Portals are chosen from sites RE:GOV has already
rebuilt, by how much tourism material they have, and run by an operator outside the public
daily allowance.

A tourism score for each rebuilt LGU counts tourism pages, named places, festivals, history
pages and usable photos. A first pass over the 122 sites on the showcase, counting only
tourism-related page links, puts these at the top:

| Site | What it has |
| --- | --- |
| tourism.baler.gov.ph | A dedicated tourism site: sights, explore, spotlight, events. The rebuild marks Sights and Explore "not yet migrated", so Explore needs its deeper crawl (below) |
| miagao.gov.ph | Historical heritage, landmarks and tourist spots, tourism news, a municipal profile |
| cityofnagacebu.gov.ph, pasay.gov.ph, baler.gov.ph | Several tourism and history pages each |
| bulacan.gov.ph, iligan.gov.ph, malabon.gov.ph, bayugancity.gov.ph | Three tourism or history pages each |

**Pilot: Baler**, using both baler.gov.ph and tourism.baler.gov.ph as sources, with Miagao as
the second portal because its story is heritage rather than surf.

## The Explore kit

The kit is to tourism portals what Kapwa is to service sites. It shares Kapwa's accessibility
rules and type scale, and adds a voice and components made for reading and planning a trip.
Each component has a typed data shape in the site model, so the renderer, exports and other
tools read the same thing.

### Foundations

- **Type:** Barabara for display: portal titles, chapter titles, place names and section
  labels. It is the free tourism typeface the Department of Tourism released in 2022, drawn
  from Filipino hand-painted signs, and LGU tourism sites already use it (tourism.baler.gov.ph
  sets its headings in it). It has capitals, figures, Ñ and ₱ only, so it is set in uppercase
  and never for running text. Inter for everything else.
  - The font file is committed at `public/fonts/barabara.otf`. Its licence text has not been
    found (the original release site is offline), so anyone reusing the kit should check its
    terms before shipping it.
  - Because it is the DOT's campaign lettering, a portal set in it must keep the concept band
    visible so it is never mistaken for DOT or LGU material.
- **Colour:** each portal takes its palette from the place (the sea at Baler, the sandstone
  of Miagao Church), checked for WCAG AA contrast before use.
- **Photography first.** Full-bleed images with a caption and credit on every one.
- **Phones and slow data first.** Responsive images, lazy loading, and a text-only mode, so
  a visitor on mobile data in a terminal can still read the page.
- **Motion:** scroll reveals only, never required to read anything, and off when the visitor
  asks for reduced motion.

### Components

| Component | What it shows |
| --- | --- |
| Story masthead | Place name, one line in the town's own words, a full-bleed photo, and a strip of quick facts (province, region, how far from Manila, best months to visit, if the source says) |
| Chapters | The cultural history as a scrolling story: eras, people, events, quotes and archival images, each paragraph footnoted to its source |
| Timeline | The dated events behind the chapters, on one line, for people who skim |
| Featured destinations | A large spread for three to five places, then cards for the rest: photo, barangay, what it is, fees, hours, accessibility |
| Festival calendar | Twelve months, with each festival's month and its published dates and year; an .ics download |
| Eat | Restaurants, cafés and local specialities (pasalubong, delicacies), grouped by area |
| Stay | Hotels, resorts, inns and homestays, grouped by area and type |
| Getting there | Routes and terminals by land, sea and air, travel times as published |
| Map | Places, food and lodging with known coordinates, on OpenStreetMap tiles, with a list as the accessible alternative |
| Know before you go | Advisories, environmental and entrance fees, dress codes, weather season, local rules |
| Plan a day | Suggested one- and two-day routes made only from listed places and published travel times, labelled as suggestions |
| Tourism office | Office, hours, phone, email and social links, pinned at the end of every page and in the phone bar |
| Concept band | The standing notice that this is an unofficial concept, with a link to the LGU's own site |

## Sources and truth rules

- **The LGU's own sites come first:** its tourism pages, tourism subdomain and published
  lists. Everything shown keeps a link to where it came from.
- **Restaurants and lodging** come only from the LGU's published lists, the Department of
  Tourism's accredited establishments, and OpenStreetMap (with its required attribution).
  Each entry shows its source and the date it was read.
- **No ratings, reviews, rankings or prices** unless the source publishes them, and no paid
  or featured placement. Listings are in alphabetical order within each area.
- **Businesses can be removed on request**, using the same opt-out route as site owners.
- **No scraping of review or booking sites** (Google Maps, TripAdvisor, booking platforms).
- **History** comes from the LGU's pages, and optionally from Wikipedia and historical marker
  texts, quoted with their licence and attribution.
- **Photos** come from the LGU (credited), or from Wikimedia Commons with their licence.
  Generated images are allowed only as decorative illustration, labelled "Illustration", and
  never as a picture of a real place, because a made-up view of a beach or church misleads the
  people deciding whether to travel there.
- **Dates keep their year.** A festival date published for 2024 shows as 2024.
- **Every sentence of a chapter is checked** against its sources by a verify pass, and any
  sentence without one is dropped.

## Pipeline

1. **Tourism crawl.** A focused crawl of the LGU's tourism pages and tourism subdomain,
   deeper than the 30-page site crawl, with the same robots.txt, terms check and politeness.
   It fills the pages a site rebuild left "not yet migrated".
2. **Gather.** Places, festivals, food, lodging, routes and history into the site model
   (`places[]`, `events[]` from [tourism.md](tourism.md), plus `listings[]` for eat and stay,
   and `story` for chapters and timeline), each with its source.
3. **Enrich.** Optional OpenStreetMap lookups for coordinates and lodging, DOT accreditation
   matching, and Wikimedia Commons photos, all recorded with their licence.
4. **Write.** Muse Spark writes the masthead line and chapters from the gathered sources only,
   with footnotes; the verify pass removes anything it cannot source.
5. **Art direction.** Palette and photo choice per portal; Muse Image only for labelled
   decorative illustration.
6. **Review.** An operator checks the portal in the review editor before it is listed.
7. **Publish.** `/explore/<id>` on regov.app, an Explore gallery, and the static export.

## Phases

- **E0. The kit.** The components above in Storybook-style pages with the fictional sample
  town, passing the axe-core gate on desktop and phone.
- **E1. Baler by hand-checked pipeline.** Tourism crawl, gather and write for Baler, reviewed
  line by line, published at `/explore/baler`.
- **E2. Eat, stay and the map.** Listings from the LGU, DOT and OpenStreetMap, with sources
  and the opt-out route.
- **E3. Miagao, then three more.** Run the pipeline on the next portals from the tourism score
  and fix what breaks.
- **E4. Explore gallery and export.** The gallery on regov.app, a static export, and an offer
  to each LGU's tourism office to review its portal once agency claims exist.

## Open questions

- Which provinces or regions to cover after the pilots, and whether to invite tourism offices
  to suggest their own town.
- Whether the DOT has a stable public source for accredited establishments.
- What the model budget for one Explore portal is, measured on Baler before promising more.
