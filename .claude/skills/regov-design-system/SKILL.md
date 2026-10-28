---
name: regov-design-system
description: RE:GOV's design system — the regov.app app pages, the reimagined government sites it generates (src/components/site), and the Explore tourism kit (src/components/explore). Use whenever you build, restyle or review any RE:GOV UI, add a content block, page type, component, exporter or theme, write interface copy, or port the look to another stack (WordPress, Wix, React, Tailwind). Covers tokens, components, layout patterns and the trust rules (unofficial labels, nothing invented) that every screen must keep.
---

# RE:GOV design system

One family, three dialects. Decide which one you are in before writing any markup.

| Dialect | Where | Look |
|---|---|---|
| **App** | `src/app/{page,jobs,report,showcase,how-it-works,…}`, `src/components/AppShell.tsx` and friends | White pages, BetterGov blue (`kapwa-brand-900`) rules and buttons, display face for headings |
| **Reimagined sites** | `/preview/*`, `src/components/site/*` | Navy masthead, black heavy rules, Kapwa tokens, Inter only. Variants: refine (`brandScale`) and art-directed (Aurora) |
| **Explore kit** | `/explore/*`, `src/components/explore/*`, `src/app/explore/explore.css` | Dark and photographic, Barabara display, liquid-glass capsules. The only place rounded shapes are allowed |

**The living reference is `/design-system`** (`src/app/design-system/page.tsx`). It renders every real component with sample data. Open it before designing, reuse what is there, and add a specimen when you add a component.

## Rules that never bend

1. **Never call a generated site "official".** Not in copy, titles, alt text, metadata or exports. `scrubOfficial()` in `src/lib/jobs.ts` cleans model output; don't rely on it for copy you write.
2. **The unofficial disclaimer is mandatory** on every generated page and every new page type: `PreviewBar` (amber "Unofficial concept" badge), the footer "Unofficial · Concept" notice, `robots: noindex`. Explore portals carry their own concept line. Don't put support or donation asks on `/preview` sites or exports.
3. **Nothing invented.** Every fact keeps its source page. People, numbers, dates, fees, hours and map pins come only from the original site or a named open dataset (BetterGov.ph, Open-Meteo, WikiBayan, PSGC). No illustrative figures, no guessed pins, no fake cost meters. AI images are labelled (`placeholder` / `illustration`) and never pass as photos of the real place.
4. **Square corners** everywhere outside Explore. `.editorial` (on `<body>` and the site shell) forces `border-radius: 0` on everything, Kapwa components included. Don't fight it with `!important`.
5. **Structure from rules, not boxes.** Heavy 2px rules open sections, 1px hairlines separate rows, gridline cards use per-cell borders (`border-t border-l` on the list, `border-r border-b` on each cell), never `gap-px` backgrounds. No drop-shadow cards and no SaaS gradients.
6. **Type discipline.** Inter for body and for all of the generated sites. App headings use `font-display` (Optima, falling back to Belleza) at regular weight, never bold. Letter-spaced uppercase is only for the small `eyebrow` (11px bold, 0.18em). No decorative flanking lines around eyebrows. Figures get `tabular-nums`. Don't ship Larken (unlicensed) or reintroduce Fraunces (rejected).
7. **Accessibility is a feature.** AA contrast: brand 600–800 for text on white, white on 900/950. Visible focus (yellow ring on the navy nav). Tap targets at least 44px, `tel:` and `mailto:` on every number and address. Honour `prefers-reduced-motion`. Pages must not auto-refresh.
8. **Mobile is first-class.** Below `lg`, navigation moves to a floating bottom bar (sites: `MobileNav`; app: `AppBottomNav`). Nothing may widen the page: `.site-shell` clips overflow and breaks long strings, and headed tables stack into cards below 40rem.

## Workflow

1. Identify the dialect and read its reference:
   - [references/foundations.md](references/foundations.md): tokens, type scale, rules, layout, motion (shared).
   - [references/app.md](references/app.md): app primitives (`AppHeader`, `SectionHead`, `btn`, `JobCard`, `LegalPage`, the report style).
   - [references/sites.md](references/sites.md): site shell, page templates, all 12 block types, civic components, refine and Aurora variants.
   - [references/explore.md](references/explore.md): Explore kit layers, components and content model.
   - [references/copy.md](references/copy.md): voice, disclaimers, labels, Filipino.
2. Reuse before you build: `eyebrow`, `container-gov`, `SectionHead`, `btn`, `Block`, `cardGrid`, `t()`. Copy class strings from the source component, not from memory.
3. New site UI is data-driven: take its content from `SiteModel` (`src/pipeline/schema.ts`). Add a new block or page type to the schema first, keeping v1 backwards-compatible, then render it in `Blocks.tsx` or `Pages.tsx`.
4. Add or update a specimen on `/design-system`.
5. Check it: `npm run typecheck`, `npm run lint`, then screenshot at 390, 820/1180 (iPad) and 1440 widths. Run `npm run a11y` for generated pages. Test under `next start` when dev-server behaviour is in doubt.

## Using it outside this repo

The skill also works when copied into another project's `.claude/skills/`, for someone building their own reimagined government sites.

- The rules above and [references/foundations.md](references/foundations.md) and [references/copy.md](references/copy.md) apply as written.
- File paths point into https://github.com/rockyru/regov (MIT). Read the source there and copy the class strings, rather than guessing them.
- Install the tokens with `npm i @bettergov/kapwa` and import `@bettergov/kapwa/kapwa.css`. Add the `.editorial` square-corner reset and the `.site-shell` overflow rules from `src/app/globals.css`.
- The components read `SiteModel` (`src/pipeline/schema.ts`). Shape your content to it, or keep the markup and swap the data source.
- Keep rules 1 to 3 even though the licence doesn't require them: say "unofficial concept" on every page, never say "official", and invent nothing. Government names, seals and content belong to their institutions.
