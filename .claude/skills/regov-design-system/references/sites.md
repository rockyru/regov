# Reimagined sites (`/preview/<jobId>`)

Route: `src/app/preview/[jobId]/[[...slug]]/page.tsx`. Components: `src/components/site/`. Data: `SiteModel` in `src/pipeline/schema.ts` (published as `/schema/site-model.v1.json`; changes must stay backwards-compatible: optional fields only).

The page wrapper is always `<div className="editorial site-shell flex flex-1 flex-col">`, with `lang="fil"` on the Filipino edition and `brandScale()` as `style` on refine sites.

## Three looks, one data model

| `site.design` | Look | Code |
|---|---|---|
| missing or `mode: "redesign"` | Kapwa look: navy masthead, black rules | `Header`, `HomePage`, `ContentPage` |
| `mode: "refine"` | Keeps a modern site's identity: its primary through `brandScale`, `RefinedMasthead` with its hero picture, no illustrated band, `.refined` keeps its shapes | `Pages.tsx`, `theme.ts` |
| `mode: "refine"` + `art` | Art-directed product-landing look (e.g. eGovPH): its own palette in `--au-canvas/haze/deep/accent/ink`, pale canvas, hairlines, glass panels, dot-on-a-line `Rule`. Template blocks are restyled through `.aurora-body` in globals.css | `Aurora.tsx`, `AuroraMenu.tsx` |

## Shell, top to bottom

1. `PreviewBar` (amber): RE:GOV mark, "Unofficial concept" badge, "N pages reimagined from host by an AI agent · not affiliated with …", links to the original site ↗, report, feedback. **Always first; never remove it.**
2. `GovStrip` (brand-950, 36px): flag mark (brand-500 / red-600 / yellow-400 squares), "GOVPH · Republic of the Philippines", government links, English/Filipino switch (`langHref`, a cookie through `/api/lang`). Not shown on art-directed sites.
3. `Header`: a 144px identity row (seal 56–72px, parent line as an eyebrow, agency name bold 28px, italic tagline) over the optional Muse Image band, which fades in from the left on desktop and turns navy on phones. Then the sticky brand-900 nav bar: 56px tabs, a 4px yellow underline on hover, mega menus (white, yellow top, a section intro column plus link columns grouped by `group` or in fives), and a search box with a yellow button.
4. `MobileNav` (client): below `lg`, a floating navy bar with Home, the two first nav sections and More, each with a square line icon; More opens a slide-up drawer. Locks scroll while open; respects reduced motion.
5. Page body.
6. `Footer` (neutral-950, or `#0a1230` on art-directed sites): brand with social icons in a gridline strip; Quick links (plus Citizen's Charter, Transparency, Privacy, FAQ, Contact when found; always "Emergency hotlines"); Government; Citizen tools from BetterGov.ph; buttons ("Pages migrated by the agent = N", Report an issue, Contribute code). Then the **Unofficial · Concept** notice (yellow eyebrow, an English or Filipino paragraph) and the copyright line with "Content sourced from host".

## Page templates (`Pages.tsx`)

- `HomePage`: masthead (navy hero with "Featured" and a services list; `RefinedMasthead` for refine; `AuroraHome` for art), `CivicStrip`, then numbered sections from the data, each only when it has content: officials ("Your local officials" / "Leadership"), programs, units/colleges (`Tags`), `home_sections` cards, barangays or campuses (`Tags`), news, `TransparencySection`. Last comes the homepage's own blocks beside a sticky aside (contact block, About).
- `ContentPage`: a header band (breadcrumb eyebrow; h1 left, summary right behind a left hairline), then three columns from `xl`: the section's sibling pages (sticky) · the article (`data-blocks`, `space-y-12`) · "On this page" plus the home contact block (sticky). Hub pages list their child pages as gridline cards. Empty or "under construction" originals get a yellow **Not yet migrated** notice linking to the source, never invented filler.
- `SectionHead({ n, title, deck, small })` and `Tags` are exported for reuse.
- Virtual pages built by RE:GOV: `/hotlines` (`HotlinesPage`), `/search` (`SearchPage`: results plus a Muse Spark answer drawn only from the site's pages; it spends model credits), `/public-projects` (`PublicProjectsPage`).

## Content blocks (`Blocks.tsx`, `Block`)

The schema type is `{ type, heading, body_markdown, items: { title, description, href, meta }[] }`. All fields are required (use empty strings). Items titled "Protected:" or "Private:" are dropped. Links go through `previewHref`, so internal links stay in the preview and external ones open in a new tab.

| type | Render |
|---|---|
| `richtext` / `table` | heading + Markdown (GFM tables in `.prose-gov`; headed tables become labelled cards below 40rem) |
| `cards` | gridline cards, `meta` as a blue eyebrow, 3-line clamp, brand-50 hover |
| `people` | two-column gridline list; portrait from `site.portraits`, else initials on brand-950; position as an eyebrow |
| `links` | under 8: a ruled list with an → or file badge (PDF/DOCX… in red-50/700). 8 or more: a directory in columns grouped by repeated `meta`, with counts |
| `list` | short black dash markers; linked titles underlined in brand |
| `steps` | numbered 36px brand-950 squares (01, 02…) |
| `faq` | `<details>` rows between ruled borders; + rotates 45° |
| `timeline` | black vertical line, 9px square dots, the date first in brand-800 |
| `contact` | brand-50 panel with a heavy top rule; label/value rows; values become `mailto:`, `tel:` or links |
| `callout` | yellow-50 with a 4px yellow left edge |
| `image` | dashed frame, the transcribed text, "Image on the original site · transcribed" |

To add a block type: extend the enum in `schema.ts` (optional and backwards-compatible), teach the planner prompt, add a `case` in `Block`, add a specimen to `/design-system`, and make sure exporters handle it.

## Civic layer (`Civic.tsx`, `Projects.tsx`, `src/lib/civic.ts`)

- `CivicStrip`: red-700 tap-to-call grid (911 on red-800, the site's own hotlines, "All hotlines →"), plus `WeatherPanel` for LGUs (Open-Meteo, labelled "Not an official PAGASA advisory").
- `HotlinesPage` / `HotlineTable`: a big 911 panel, then numbers grouped this office → city → province → region → national, by category, number right-aligned in bold brand-900. Sources: the original site and BetterGov.ph's hotline dataset. "If one fails, call 911."
- `TransparencySection`: three columns (published by this office · check nationally · for residents/students/patients) plus `ProjectsOnRecord`.
- `ProjectList`: WikiBayan projects with budget, status colour, progress bar and source count. Always carries `COMMUNITY_NOTE` (community-sourced, not verified).

## Language

Interface strings go through `t(lang, "English")` with the Filipino in `src/components/site/i18n.ts`; add new strings there. Site content is machine-translated by Muse Spark and labelled as such. Keep `lang="en"` on English names inside Filipino pages.
