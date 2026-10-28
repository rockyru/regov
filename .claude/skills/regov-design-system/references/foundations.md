# Foundations (shared by the app and the reimagined sites)

Source: `src/app/globals.css`, `@bettergov/kapwa` (BetterGov.ph's Kapwa design system), `src/app/layout.tsx`.
Explore overrides most of this; see explore.md.

## Colour: Kapwa tokens through Tailwind

Use the `kapwa-*` utilities. Don't hard-code hex values (except in Explore and Aurora palettes).

| Scale | Shades used | For |
|---|---|---|
| `kapwa-brand-*` | 50 hover wash · 300 link underline · 600–800 text on white · 900 nav bar, app rules and buttons · 950 GOVPH strip, dark panels, step squares | The blue. On refine sites these variables are rewritten from the original site's colour |
| `kapwa-red-*` | 50 + 700 file badges · 600 flag mark · 700–900 emergency strip and 911 | Emergencies, file types and errors only |
| `kapwa-yellow-*` | 50 callouts and queue band · 300 hover · 400 search button, nav hover underline, focus ring, unofficial label on dark | Accent: one yellow call to action per area |
| `kapwa-green-*` | 400/500 live counts and status dots · 800 "completed" | Status only |
| `kapwa-orange-700` | "delayed" | Status only |
| `neutral-*` (Tailwind) | 900 ink · 700–800 body · 500–600 secondary · 200 hairlines · 300 light borders · 950 site footer | Text and structure |
| amber-400 / amber-950 | The unofficial `PreviewBar` only | Reserved |

Aliases in `@theme`: `gov`, `gov-deep`, `gov-mid`, `gov-light`, `gov-red`, `gov-yellow`.

`brandScale(primary)` (`src/components/site/theme.ts`) maps one hex onto brand 50–950 with `color-mix`, keeping 600–800 at or darker than the primary so text stays AA. Set it as `style` on a wrapper and every `kapwa-brand-*` inside re-themes.

## Type

- `--font-sans`: Inter (next/font, weights 400–800). Used for everything on the generated sites.
- `--font-display`: Optima from the system, then Belleza (next/font/google), Candara. App headings only, always `font-normal`.
- `eyebrow` = `text-[11px] font-bold uppercase tracking-[0.18em]`, exported from both `AppShell.tsx` and `site/Shell.tsx`. Used for kickers, column heads, labels and section numbers. This is the only letter-spaced uppercase allowed.

| Role | Classes |
|---|---|
| App hero | `text-5xl sm:text-6xl xl:text-[84px] font-display font-normal tracking-tight leading-[0.95]` |
| App page title | `text-4xl sm:text-5xl font-display font-normal tracking-tight` |
| Site page title | `text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.02em] leading-[1.0]` |
| Site section title | `text-3xl sm:text-4xl font-bold tracking-tight leading-[1.05]` |
| Block heading | `text-2xl sm:text-[28px] font-bold tracking-tight leading-tight` + `pt-4 border-t-2 border-neutral-900` |
| Body (prose) | `.prose-gov`: 17px, `leading-relaxed`, neutral-800 |
| Secondary | `text-[15px] text-neutral-600` |
| Numbers | `tabular-nums`; section numbers are two digits (`nn(i)` → 01, 02…) |

## Rules, shape and spacing

- Square corners: `.editorial *{border-radius:0!important}`. `.refined` subtrees get `revert-layer` so refine sites keep their own shapes.
- Heavy rule: `border-t-2 border-neutral-900` on sites, `border-kapwa-brand-900` in the app. It opens every section and titled block (the first block in a `[data-blocks]` list drops it).
- Hairline: `border-neutral-200` between rows; `divide-y divide-neutral-100/200`.
- Accent edge: `border-l-4` in yellow (notices) or green (live stats); `border-t-4 border-kapwa-yellow-400` on mega menus.
- Gridline cards: list `grid border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200`; in the app use `cardGrid` with brand-900 borders.
- Container: the `container-gov` utility (padding 1.25 / 2 / 3rem at base / sm / lg; fluid width).
- Section rhythm: sections `py-12`–`py-14`; heading-to-content `mt-6`–`mt-8`.
- Section head layout: number eyebrow + title on the left, deck on the right (`lg:grid-cols-[1fr_minmax(0,34rem)] items-end`, deck `lg:text-right`).

## Motion

- `Reveal` (`src/components/Reveal.tsx`, `[data-reveal]` in globals.css): fade-up on scroll, stagger with `--i`. Turned off under `prefers-reduced-motion`, and `<noscript>` forces it visible.
- Hover: colour shifts, `hover:pl-1` nudges in menus, 180° caret turns. No bouncy transforms.
- `animate-sweep` for indeterminate progress. Never auto-refresh a page; live data updates in place (`QueueStrip` polls `/api/queue`).

## Layout safety

- `.site-shell`: `overflow-x: clip` and `overflow-wrap: anywhere` on text, so long emails and URLs can't widen the page. Table cells use `break-word`, and `tabular-nums` never wraps.
- Every clickable control gets `cursor: pointer` (base layer).
- Print: nav hidden, links plain, so reports read as documents.
