# Tourism plan

Most Philippine towns and provinces have a tourism page. On the sites rebuilt so far it is
usually a photo gallery, a paragraph of history and a list of links. Marikina's rebuild, for
example, has a "Visitors" page with five links and two paragraphs. Visitors come for four
things: what to see, when the festivals are, how to get there, and who to call. This plan gives
every rebuilt LGU site a "Visit" section that answers those questions, built only from what the
original site says.

## Rules

- **Nothing invented.** No place, date, fee, opening hour, route or coordinate that is not on
  the original site. Each place and festival keeps its source page.
- **Dates are dated.** A festival date published for 2023 is shown as "held in March (2023
  dates)", never moved to this year. Recurring events are kept as a month, not a day.
- **Accommodation is linked, not listed.** RE:GOV does not copy or rank hotels and resorts. It
  links to the LGU's own list or to the Department of Tourism's accredited establishments.
- **Still an unofficial concept.** The usual disclaimer applies, and the tourism office's
  contact details come first so visitors can check anything that matters.

## Phases

### T1. Recognise tourism and build the hub

- `src/pipeline/plan.ts`: name the tourism signals (tourism office, festivals, destinations,
  "how to get here", travel advisories) and plan a `visit` hub on LGU and DOT regional sites,
  with up to five children: Places, Festivals and events, Getting there, Advisories, Tourism
  office.
- `src/components/site/MobileNav.tsx` already gives tourism links a map icon; make sure the
  hub shows in the bottom bar on phones.
- Done when the Marikina and Paombong rebuilds, replayed from their recorded model answers,
  show a Visit hub without new model calls beyond the plan step.

### T2. Places and festivals in the site model

- `src/pipeline/schema.ts`: two new optional top-level fields, so v1 readers are unaffected:
  - `places[]`: `name`, `kind` (nature, heritage, church, museum, park, food, other),
    `barangay`, `summary`, `how_to_get_there`, `fees`, `hours`, `accessibility`,
    `coordinates` (only when the source gives them or links a map pin), `image`, `source_url`.
  - `events[]`: `name`, `month`, `dates`, `dates_year`, `summary`, `venue`, `source_url`.
- `src/pipeline/understand.ts`: extract both from page text and images (festival posters are
  often image-only, which SAM's text reading already covers).
- Regenerate `public/schema/site-model.v1.json`, extend the fictional sample town with two
  places and one festival, and add unit tests for the date rule.

### T3. Pages people can use

- `src/components/site/Blocks.tsx` and `Pages.tsx`: place cards (photo, barangay, fees,
  hours, accessibility), a 12-month festival calendar, and a "Getting there" page built from
  the source's routes and terminals.
- A map of places with coordinates, on OpenStreetMap tiles, with a plain list as the
  accessible fallback. No map when no place has coordinates.
- An `.ics` download for the festival calendar.
- The accessibility gate (axe-core, desktop and phone) covers the new pages.

### T4. Found by search, readable by visitors

- schema.org JSON-LD on rebuilt pages: `TouristAttraction` for places, `Event` for
  festivals, `GovernmentOffice` for the tourism office. Also in the static export.
- Visitor languages beyond English and Filipino (for example Korean, Japanese and Chinese)
  through `src/pipeline/translate.ts`, for the Visit section only, labelled as machine
  translation.

### T5. Showcase and observatory

- A "Visit" filter on `/showcase` for rebuilds that have places or festivals.
- In the observatory (see the roadmap), a tourism view: which LGU sites have a visitor page,
  whether it lists the tourism office, and whether it works on a phone.

## Open questions

- Whether to invite provincial tourism offices to review their Visit section once agency
  claims (roadmap, "Next") exist.
- Whether the DOT's own data on accredited establishments has a stable public source to link.
- How much of the visitor-language budget the daily run allowance can carry.
