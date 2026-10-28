<p><img src="public/brand/logo-readme.svg" alt="RE:GOV. Reimagine Government." width="360"></p>

# RE:GOV — Reimagine Government

**Public websites deserve a second life.** An autonomous AI agent that transforms legacy government websites into modern, accessible, citizen-first digital experiences. Live at [regov.app](https://regov.app).

Paste the URL of an old Philippine government WordPress site. The agent crawls it, uses
**SAM 3.1** and **Muse Spark 1.3** (Meta Model API) to understand every page, rebuilds the
site on the **BetterGov.ph Kapwa** design system with all content migrated, and hands back a
migration report: what moved, what was image-only, what needs a human, which accessibility
problems were fixed.

Built solo for the Meta Global AI Developer Hackathon 2026 (Indie track).

## Disclaimer

Every site RE:GOV produces is an **unofficial, AI-generated concept** for demonstration. The
output is not operated by, endorsed by, or affiliated with the agency whose public website it
was built from, or with any government body. Content is migrated automatically and may be
incomplete or out of date. Previews are marked unofficial in the top bar, the footer and the
page metadata, and are excluded from search indexing. Use the agency's official website for
services and official information.

## Why

Thousands of `.gov.ph` and `.edu.ph` sites run on abandoned WordPress installs from the
2010s Government Web Template era. I migrated one by hand (UP Manila RGAO, WordPress →
Payload). It took weeks. This does the first 80% in minutes, on the design standard the
BetterGov.ph volunteers already defined for the whole government.

## How it works

```
URL ─▶ crawl.ts ─▶ segment.ts ─▶ understand.ts ─▶ plan.ts ─▶ band.ts ─▶ site.json ─▶ Next.js + Kapwa
       Playwright    SAM 3.1       Muse Spark 1.3    Muse Spark 1.3            live preview
       + WP REST     logo/seal     vision + strict   information               + migration
                     cut-out       JSON per page     architecture              report
```

| Step | Meta tool | What it does |
|---|---|---|
| Crawl | — | Polite same-origin crawl (robots.txt, 1 req/s). Full-page screenshots, HTML, visible text, link graph, WordPress REST when exposed. |
| Segment | **SAM 3.1** | Noun-phrase prompts on the homepage screenshot. Finds the agency seal, cuts it out with the mask as alpha, reuses it as the new brand mark. |
| Understand | **Muse Spark 1.3** | Screenshot + text → strict-schema `PageModel`: typed content blocks (people, steps, FAQ, tables, timelines, contact…), accessibility issues, migration notes. Image-only content is transcribed. |
| Plan | **Muse Spark 1.3** | All page models → citizen-first `SitePlan`: nav, popular services, homepage sections, footer, redirects. |
| Identity band | **Muse Image** | Muse Spark writes an art brief from the site plan; Muse Image paints a wide header illustration in the Kapwa palette, unique to each agency or LGU. |
| Render | — | Next.js renders `site.json` live on Kapwa tokens and styles. No per-job build. |
| Report | — | Coverage, SAM overlay, accessibility findings, "needs a human" list, page-by-page mapping. |

After the rebuild:

- **Before and after.** Both homepages are loaded in a fresh browser, and the report and showcase compare speed, page weight, requests and axe-core WCAG errors (`src/pipeline/scores.ts`, backfill with `scripts/score.ts`).
- **Filipino edition.** The language switch in the top strip asks Muse Spark to translate each page the first time someone reads it in Filipino. The translation is cached and streams in over the English page (`src/pipeline/translate.ts`).
- **Ask this site.** The search box answers questions with Muse Spark, using only the site's own pages, and cites them. It is rate-limited (`src/pipeline/ask.ts`).
- **Review.** An operator opens `/edit/<job>` to correct names, positions, numbers and fees, and ticks each page once it matches the original. The agent's version is kept and can be restored (`src/components/SiteEditor.tsx`).
- **Handoff export.** "Download the site (.zip)" gives static HTML that runs without JavaScript, plus assets, `site.json`, an old-to-new redirect map and a README for the agency (`src/lib/exportSite.ts`). "Content as Markdown" gives one Markdown file per page with front matter, for any static site generator or CMS (`src/lib/exportMarkdown.ts`).
- **Open format.** Every rebuild is one `site.json`, published as versioned JSON Schema at [regov.app/schema/site-model.v1.json](https://regov.app/schema/site-model.v1.json) ([docs/site-model.md](docs/site-model.md)).

Sites behind bot protection (Cloudflare challenges) fall back to the Wayback Machine: the crawler picks the archive month with the most real pages and rebuilds from that. Dead sites get a second life literally.

Every model response is cached on disk under `jobs/<id>/models`, so reruns are free and deterministic. `MODEL_CACHE=replay` rebuilds a saved job from those answers only. Model names and the provider are configurable ([docs/models.md](docs/models.md)).

## Run it

Without a model key, using the fictional sample site:

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run sample                   # installs Bayan ng Halimbawa as job "sample"
npm run dev                      # http://localhost:3000/preview/sample and /report/sample
```

With a key, on a real site:

```bash
# add MODEL_API_KEY from dev.meta.ai to .env
npx tsx --env-file=.env scripts/smoke.ts          # proves Spark text, Spark vision+JSON, SAM 3.1 work

# one shot: crawl + build
node --env-file=.env node_modules/tsx/dist/cli.mjs scripts/pipeline.ts https://cda.gov.ph cda 30

npm run dev                      # http://localhost:3000  → dashboard, /preview/<job>, /report/<job>
```

Or use the dashboard: paste a URL, press **Reimagine**, watch the job page stream progress.

### Capacity and abuse limits

Runs are admitted by an in-process queue (`src/lib/runQueue.ts`); the app runs as one Node
process inside a single container, so the queue is authoritative. Defaults, all overridable
through environment variables:

| Variable | Default | Meaning |
| --- | --- | --- |
| `RUN_CONCURRENCY` | `2` | Pipelines allowed to run at once. Extra submissions wait in order and the job page shows their place. |
| `RUN_QUEUE_MAX` | `8` | Waiting runs allowed. Past this the form answers "the agent is busy". |
| `RUN_RATE_LIMIT` / `RUN_RATE_WINDOW_MIN` | `3` / `10` | Submissions per visitor IP per window. |
| `RUN_DAILY_MAX` | `7` | Runs accepted per day, resetting at 8:00 AM Asia/Manila, counted from job status files so it survives restarts. Protects the Meta credit balance. |
| `RUN_STALL_MIN` | `20` | A run whose status has not changed for this long is killed and reported as stalled, freeing its slot. |
| `RUN_DEDUPE_HOURS` | `24` | A host that is running, waiting, or finished within this window is not rebuilt again; the visitor is sent to that run. |

`GET /api/run` reports the live counts. To stop accepting new runs, set `SUBMISSIONS=paused` in `.env` and restart; the form answers with a friendly notice while runs in flight finish. Remove it to resume.

To host your own copy, see [docs/self-hosting.md](docs/self-hosting.md) (Docker Compose, or a plain server the way regov.app runs).

## Layout

```
src/pipeline/   crawl · segment · understand · plan · build · schema (zod → strict JSON schema)
src/lib/        meta.ts (one OpenAI-compatible client for api.meta.ai) · jobs.ts
src/components/site/  Shell (GOVPH strip, header, footer) · Pages (home, content) · Blocks
src/app/        / dashboard · /jobs/[id] progress · /preview/[id]/[...slug] · /report/[id] · /api/run
scripts/        pipeline · smoke · sample · schema · a11y · vps/ (deploy, hardening)
fixtures/sample/  a fictional site for development and CI
test/           unit tests (node:test via tsx)
docs/           architecture · models · site model · self-hosting
jobs/           per-job artifacts (gitignored)
```

## Design baseline

[Kapwa](https://github.com/bettergovph/kapwa) is the design system BetterGov.ph built for
Philippine government portals. Generated sites load its tokens, type scale and base styles
(`@bettergov/kapwa/kapwa.css`) and render their own blocks on top in an editorial layout:
square corners, ruled sections, numbered indexes, a stronger hero, service-first navigation,
sticky header with search, WCAG AA contrast and semantic structure. Kapwa's React components
(Button, Card, Banner, OfficialBiography…) are not used yet.

## Contributing

Issues and pull requests are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md): it covers
running the app without a model key, the checks CI runs (lint, types, unit tests, build, and an
axe-core accessibility gate) and good first contributions. [docs/architecture.md](docs/architecture.md)
explains how the pieces fit. Generated output must stay clearly marked unofficial.

Questions, or an agency asking for a change: use the Feedback button on regov.app or write to
hello@regov.app. Security problems: see [SECURITY.md](SECURITY.md).

## License

[MIT](./LICENSE). Generated sites remain unofficial concepts; agency names, seals and content
belong to their respective institutions.

## Roadmap

See [ROADMAP.md](ROADMAP.md).
