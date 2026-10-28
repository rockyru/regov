# Explore kit (`/explore/<portal>`)

A tourism portal per LGU, built only from the LGU's own pages. Route: `src/app/explore/[slug]/…`. Components: `src/components/explore/`. Styles: `src/app/explore/explore.css`, imported by the Explore routes. Content model: `src/lib/explore/types.ts`; portals in `src/lib/explore/<slug>.ts`, registered in `src/lib/explore/index.ts`; plan in `docs/tourism.md`; step-by-step guide in `docs/design-system.md` (section 5).

Portals are written by hand, not generated. Maps come from `npm run explore:maps -- <slug> --province "<name>" --bbox w,s,e,n` (Natural Earth and OpenStreetMap), which writes `src/lib/explore/maps/<slug>.ts` exporting `country`, `province` and `town`. Components must not hard-code a town: anything town-specific (section heads, `islandGroup`, footer `picks`) belongs in the portal data.

It is the one deliberate exception to the editorial look. Keep it contained: all its CSS sits in `@layer explore` and is scoped to `.xp` and prefixed classes (`ih-`, `pl-`, `cm-`, `geo-`, `xf`, `pp-`…). The layer outranks the global square-corner reset, which is why its capsules can be round. Don't leak these styles into app or site pages.

## Foundations

- Canvas `.xp`: background `#0b0c0e`, white text, `min-height: 100dvh`, `overflow-x: clip`.
- Palette: night `#0b0c0e`, land `#1b1d21`, ink on glass `#16181c`, sea `#0e3a44`, gold `#ffd27a` (active pin, pulse; hover text `#b07a00`), paper `#e8e6e1`. Lines are white at fixed opacities (0.42 grid, 0.45 coast, 0.22 roads, 0.12 rivers).
- Type: `.xp-display` uses Barabara (`public/fonts/barabara.otf`; the Department of Tourism's free 2022 typeface, licence text not yet found), uppercase, weight 400, line-height 1, for display lines (`portal.title`). The masthead letters are Inter 700 at -0.04em, sized from the grid (`--fs`). Body is Inter.
- The ruled grid: the hero is 8 × 5 cells of 42% white hairlines over one viewport of photograph (4 × 6 on phones). Letters, links and notes are placed in cells.
- Focus: a 2px white outline offset 4px. Motion is choreographed (letters rising, roads drawing, pins dropping) and all of it stops under `prefers-reduced-motion`.

## Components

| Component | Role |
|---|---|
| `SiteNav` | A liquid-glass capsule fixed at the top centre; marks the section under the middle of the screen; slides away over the footer |
| `LiquidGlass` | The capsule material. Chromium: an SVG displacement map drawn for the element's size, fed to `backdrop-filter` (`data-refract`). Safari/Firefox: frosted blur with a specular rim of inset shadows |
| `Hero` | The ruled grid over the hero photo, the town's letters, "Plan your trip", "Call the tourism office", the concept line |
| `Story` | Scroll-driven chapters: the photo closes into a print, chapters draw up, a year roll and timeline, then out to the country map with the town's point |
| `Places` / `PlacesWhere` | Where the town sits (locator, province map, facts), then the coast map (`CoastMap`, interactive) and a card per place |
| `Room` | A blurred, darkened, drifting copy of the section photo behind it |
| `Events` | The year in twelve columns, then a card per event; `EventStatus` says past or upcoming from the reader's own date (client-side, so builds never go stale) |
| `Plan` | Muse Image illustrations with the LGU's facts set over them as text (stops, how the budget splits) |
| `Footer` | The town photo, darkened, sliding up under the Plan section; its own section links |
| `PlaceView` / `EventView` | One page per place or event: big name over its photo, facts, the map focused on the pin, nearest places |
| `GeoSvg` | Maps from open data: land, roads, rivers, numbered white pins (`MapPin { lat, lon, n?, label, href?, active? }`) |

## Content rules (stricter than the sites)

- Every `Chapter`, `Place`, `Happening` and fact carries a `source: { label, url }`, and the UI links it.
- `Photo.kind` is `photo` (the LGU's own, with credit), `placeholder` (Muse Image, "never a picture of the actual place") or `illustration`. Placeholders and illustrations must say so on screen.
- A place has `at` only when the LGU's own map pins it. Otherwise it gets no pin. Never geocode a guess.
- Dates are dated: a year-specific date keeps its `year` ("2023 dates") and is never moved to this year. Recurring events stay as a month.
- Accommodation is linked (the LGU's list, DOT-accredited), never copied or ranked.
- The concept line says it's an unofficial RE:GOV concept, not made by the LGU or the Department of Tourism, and labels placeholders.
