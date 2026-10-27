# RE:GOV — Reimagine Government

**Public websites deserve a second life.** An autonomous AI agent that transforms legacy government websites into modern, accessible, citizen-first digital experiences. Live at [regov.app](https://regov.app) (coming up).

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
| Render | — | Next.js renders `site.json` live on Kapwa tokens/components. No per-job build. |
| Report | — | Coverage, SAM overlay, accessibility findings, "needs a human" list, page-by-page mapping. |

Sites behind bot protection (Cloudflare challenges) fall back to the Wayback Machine: the crawler picks the archive month with the most real pages and rebuilds from that. Dead sites get a second life literally.

Every model response is cached on disk under `jobs/<id>/models`, so reruns are free and demos are deterministic.

## Run it

```bash
npm install
npx playwright install chromium
cp .env.example .env            # add MODEL_API_KEY from dev.meta.ai
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
| `RUN_STALL_MIN` | `20` | A run whose status has not changed for this long is killed and reported as stalled, freeing its slot. |
| `RUN_DEDUPE_HOURS` | `24` | A host that is running, waiting, or finished within this window is not rebuilt again; the visitor is sent to that run. |

`GET /api/run` reports the live counts.

## Layout

```
src/pipeline/   crawl · segment · understand · plan · build · schema (zod → strict JSON schema)
src/lib/        meta.ts (one OpenAI-compatible client for api.meta.ai) · jobs.ts
src/components/site/  Shell (GOVPH strip, header, footer) · Pages (home, content) · Blocks
src/app/        / dashboard · /jobs/[id] progress · /preview/[id]/[...slug] · /report/[id] · /api/run
scripts/        smoke · crawl · run · pipeline · sam-probe
jobs/           per-job artifacts (gitignored)
```

## Design baseline

[Kapwa](https://github.com/bettergovph/kapwa) is the design system BetterGov.ph built for
Philippine government portals. Generated sites import its tokens and components and layer on
a stronger hero, service-first navigation, sticky header with search, WCAG AA contrast and
semantic structure.

## Contributing

Issues and pull requests are welcome at [github.com/rockyru/regov](https://github.com/rockyru/regov/issues).
Good first contributions: new government-domain patterns in `src/lib/govdomain.ts`, Kapwa
block renderers in `src/components/site/Blocks.tsx`, and crawl fixes for sites the agent
mishandles (open an issue with the address and the job's agent log). Run `npm run lint` and
`npx tsc --noEmit` before opening a PR. Generated output must stay clearly marked unofficial.

## License

[MIT](./LICENSE). Generated sites remain unofficial concepts; agency names, seals and content
belong to their respective institutions.

## Status

See `PLAN.md` for the schedule and what is left before the Nov 4 deadline.
