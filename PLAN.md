# Site Resurrection Agent — Hackathon Plan

Meta Global AI Developer Hackathon 2026 · Indie track · solo
Deadline: **Nov 4, 9:00 PM ET = Nov 5, 10:00 AM PHT**. Judging Nov 4–8, winners Nov 9.

## One-liner
Paste the URL of an abandoned government or university WordPress site. The agent
crawls it, uses SAM 3.1 and Muse Spark vision to understand every page, rebuilds
it as a modern accessible Next.js site with the content migrated, and hands back
a migration report that says exactly what moved, what broke, and what it fixed.

## Why this wins on the rubric
| Criterion | Weight | How we score |
|---|---|---|
| Impact | 30% | Thousands of PH public-sector sites run on dead WordPress installs. Firsthand: I migrated UP Manila RGAO's site by hand. The agent does in minutes what took weeks. |
| Use of Meta tooling | 25% | Four tools, each doing a real job: **SAM 3.1** segments screenshots into regions and extracts logos/seals; **Muse Spark 1.3** vision + structured outputs turn pages into a typed site model, then plan the new IA and verify coverage; **Muse Code** (`muse exec`) generates bespoke components the template lacks; **Muse Image** regenerates hero art when originals are tiny/broken. |
| Demo | 25% | Live: paste URL → watch crawl/segment/understand/generate stream → side-by-side old vs new → report. Target ~3 minutes end to end on a 15-page site. |
| Technical depth | 20% | Agentic pipeline with typed intermediate models, verification loop, resumable jobs, static-export build, a11y fixes. |

## Design baseline: BetterGov.ph / Kapwa
The generated site uses **Kapwa** (`@bettergov/kapwa`, "Design system for Government Portals used by
BetterGov.ph") as its foundation: tokens, type scale, banner/card/article/table/official-biography
components, GOVPH-style utility strip. We build *on top* of it with improved visuals and UX:
stronger hero with the agency's extracted seal and palette, sticky nav with search, service-first IA,
mobile-first, WCAG AA, Filipino/English toggle. Pitch line: "the BetterGov standard, applied
automatically to any legacy agency site".

## Architecture
```
src/app/                 Next.js UI: new job, live progress (SSE), old/new side-by-side, report
src/lib/meta.ts          one OpenAI-compatible client → api.meta.ai (Spark, SAM, Muse Image)
src/pipeline/
  crawl.ts      Playwright BFS, same-origin, polite (1 req/s, robots.txt). Saves HTML, full-page
                screenshot, and WP REST JSON (/wp-json/wp/v2) when exposed.
  segment.ts    SAM 3.1 noun-phrase prompts per screenshot: "navigation menu", "logo", "banner",
                "main content", "sidebar", "footer". Crops regions; saves logo PNG with mask.
  understand.ts Spark vision + json_schema → PageModel {type, title, nav, blocks[], contacts,
                dates, attachments, images[]}. Region crops from SAM go in as extra images.
  plan.ts       Spark over all PageModels (1M ctx) → SiteModel {nav tree, merged pages,
                redirects, content types, palette from logo}.
  generate.ts   Writes SiteModel → jobs/<id>/site.json. The main app renders it live at
                /preview/<id>/... with Kapwa-based components (no per-job build: instant demo).
                "Export" produces a standalone Next.js project zip from the same template.
                Gaps the template can't render → `muse exec` writes a component.
  verify.ts     Spark compares each old page vs rendered new page → MigrationReport
                {coverage %, missing items, broken links, a11y fixes applied}.
  images.ts     (stretch) Muse Image: hero regeneration in site palette.
src/template/   Kapwa-based page components that render a SiteModel; also copied into exports
jobs/<id>/      html/ shots/ segments/ models/ site/ report.json  (gitignored)
```

## Schedule (PHT)
- **Oct 27 (today)** Lock plan ✔, scaffold ✔, smoke test Spark + SAM, pick 2–3 target sites, crawl.ts.
- **Oct 28** segment.ts + understand.ts → PageModel JSON for one real site.
- **Oct 29** plan.ts → SiteModel. template/ renders a static site from site.json.
- **Oct 30** generate.ts end to end: URL in → static site out. Ugly is fine.
- **Oct 31** UI: job form, SSE progress, old/new side-by-side preview.
- **Nov 1** verify.ts + MigrationReport UI. Muse Code component-gen for one gap type.
- **Nov 2** FEATURE FREEZE. Resumable jobs, error handling, 3 cached demo runs, README, architecture diagram.
- **Nov 3** Demo video (2–3 min), live-demo rehearsal x3, submission text, deploy.
- **Nov 4** Submit by 6 PM PHT. Buffer until Nov 5 10 AM PHT.

## Demo script (3 min)
1. 0:00 The problem: show a dated .gov.ph / .edu.ph site. "I migrated one of these by hand."
2. 0:30 Paste URL. Crawl streams in: pages found, screenshots.
3. 1:00 SAM overlays: regions + extracted logo. Spark page models appear.
4. 1:45 New site builds. Side-by-side old/new, click through nav.
5. 2:30 Migration report: coverage, fixes, redirects. "Export to repo."

## Risks and fallbacks
- **API geo-block / quota** → smoke test today; cache every model response on disk so demos replay.
- **SAM adds little on flat screenshots** → make logo/seal extraction the hero use; crops feed Spark.
- **Muse Code headless unreliable** → fallback: Spark generates the component; keep `muse exec` as optional path.
- **Slow live demo** → cap demo site at 15 pages, pre-warm one cached run, show a fresh run on a 5-page site.
- **Official Rules add requirements** (video length, repo) → check Discord daily.

## Target sites (probed Oct 27)
| Site | CMS | Pages / posts | Why |
|---|---|---|---|
| **cda.gov.ph** (Cooperative Development Authority) — PRIMARY | WordPress 7.1, custom child theme | 53 / 2 (REST) | National agency, classic dated GOVPH look, ©2021, manageable size |
| region10.dilg.gov.ph — SECONDARY | WordPress, gwt-wordpress theme | REST blocked | DOST Government Web Template era design, regional office |
| region5.dilg.gov.ph — stretch | WordPress, gwt-wordpress-25 | 95 / 622 | Heavy content, tests scale |
| Old UP Manila RGAO (local, ~/Local Sites/rgao) | WordPress | ? | Personal story; live site is already the Payload rebuild → use as "human-made" comparison |
Crawl politely: 1 req/s, honor robots.txt, cap at 20–30 pages, cache everything.

## Open items
- [x] MODEL_API_KEY in .env; smoke test passes (Spark text, Spark vision+JSON, SAM 3.1) from PH
- [x] Target sites: cda.gov.ph primary, region10.dilg.gov.ph secondary
- [ ] Read Official Rules once posted (video length, repo, license)
