# The RE:GOV app (regov.app)

Pages: home `src/app/page.tsx`, jobs `src/app/jobs` and `src/app/jobs/[jobId]`, report `src/app/report/[jobId]`, showcase `src/app/showcase`, how-it-works / privacy / terms / case-study (`LegalPage`), support, design-system.
Theme: the editorial system in **BetterGov blue**. Rules, buttons and card borders use `kapwa-brand-900`. White background, no background blocks behind the hero, no bottom rule under the header on home.

## Primitives: `src/components/AppShell.tsx`

- `Wordmark({ tone })`: the logo lockup from `public/brand/logo.svg` / `logo-white.svg`. Never rebuild it from type.
- `AppHeader({ crumb })`: wordmark, crumb, nav links and a "Reimagine a site" button. Below `lg` the links move to `AppBottomNav`, a floating navy bottom bar with square line icons (the same pattern as the sites' `MobileNav`).
- `AppFooter()`: navy, five columns, the unofficial-concept and accuracy paragraphs. Keep both.
- `SectionHead({ n, title, deck, aside })`: blue 2px rule; small eyebrow with the number (`nn(n-1)`) inline before the title; optional deck; aside on the right (counts, "View all →").
- `btn.primary | btn.yellow | btn.ghost | btn.sm`: square, `h-11`, semibold. Primary is blue; yellow is the one call to action on dark; ghost is a 2px blue border. A text link is `font-semibold border-b-2 border-neutral-900 hover:text-kapwa-brand-900`.
- `eyebrow`, `nn()`.

## Components

- `JobCard` + `cardGrid` (`src/components/JobCard.tsx`): a gridline card per rebuild. 16:9 cover, a numbered kind tag top-left (`01 · city municipality`), the seal bottom-right on white, the title in `font-display` at 22px, a host and page-count line, then "View site →", "Report" and "Original ↗". Wrap in `<ul className={`${cardGrid} sm:grid-cols-2 lg:grid-cols-3`}>`.
- `ReimagineBox`: the single URL input. Thick 2px blue frame, attached blue submit with "→". Validates the government domain on the client, waits for the Turnstile token, shows errors in red below. Error copy is in its `INITIAL` map: say what happened and what to do next.
- `QueueStrip`: a yellow-50 band under the header while runs exist (blue pulsing square = running, yellow = queued, red = stopped). Updates in place.
- Daily allowance notice (home): one bordered line with the facts ("Up to N new sites a day · Resets daily at 8:00 AM Philippine time · N left today"). Green when there are runs left, red when used up.
- `ScaledFrame`: a page rendered at 1440px inside a box, scaled to fit, not interactive. Use it for before/after and previews.
- `LegalPage({ kicker, title, deck, updated, sections })`: numbered two-column list, title in a 16rem left column, body on the right.
- Also: `LogoLoader` (loading.tsx), `PrintButton`, `ModelsPanel` (job page), `PortalShowcase` (/explore index), `ShowcaseList`, `FeedbackBox` (floating, every page), `Turnstile`, `LiveRefresh` (in-place job updates only), `Reveal`, `SiteEditor` (operator-only /edit). All are on `/design-system`.

## Report and showcase: "formal document" style

- Letterhead: logo left, then the RE:GOV credit, then the agency and the document type.
- A reference metadata block. Numbered sections with the title in a left column.
- Finding IDs: `A-01` accessibility issues, `H-01` notes for a human (both from `collect()` in `src/app/report/[jobId]/page.tsx`), plus the other registers the page numbers the same way. Category breakdown tables.
- Compact two-column registers for inventories. The old one-row-per-page table was rejected as too long.
- Print: page number bottom-left, `logo-print.svg` bottom-right, no background art. A closing note restates that the site is an unofficial concept.

## Brand

- Colourway: blue mark and "re", red colon, ink "gov", grey tagline. On navy: white with a yellow colon.
- Assets in `public/brand`: `logo.svg`, `logo-white.svg`, `logo-print.svg` (fixed size for `@page`), `logo-readme.svg`, `mark.svg` (blue), `mark-ink.svg` (inside the amber bar), `mark-white.svg`, `icon-512.png`; `src/app/icon.svg` is the favicon.
- The logo face (Larken) is a trial font: never commit it, ship it or use it as a web font.
