# Architecture

RE:GOV is one Next.js app and one pipeline script. The app takes requests, queues runs and renders
everything; the pipeline crawls a site and writes a job folder. There is no database: each job is
a folder under `jobs/<id>`, and the app reads it on request.

```
paste URL ─▶ /api/run ─▶ run queue ─▶ scripts/pipeline.ts ─▶ jobs/<id>/ ─▶ /preview /report /edit /export
             (limits)   (src/lib/      (child process)        site.json      (rendered live from files)
                         runQueue.ts)
```

## The pipeline (`scripts/pipeline.ts`)

Each step writes to the job folder and appends an event to `status.json`, which the job page
follows in place.

| Step | Code | What it does |
| --- | --- | --- |
| Reach | `src/pipeline/reach.ts` | Finds the address that answers (www or not, http or https). |
| Do-not-crawl | `src/lib/optout.ts` | Refuses domains whose owners asked, or whose terms forbid it. |
| robots.txt | `src/pipeline/robots.ts` | RFC 9309 rules for REGOVBot; a site that disallows everything is refused. |
| Terms | `src/pipeline/terms.ts` | Finds the terms of use and has the language model decide whether they forbid automated access or republishing. |
| Crawl | `src/pipeline/crawl.ts`, `sitemap.ts`, `quality.ts` | Polite same-site crawl in a real browser: sitemap first, then links; screenshots, HTML, visible text, WordPress REST when exposed. Too little text stops the run. |
| Archive fallback | `src/pipeline/archive.ts` | Sites behind bot protection are read from the Wayback Machine month with the most pages. |
| Build | `src/pipeline/build.ts` | Segment (logo and seal), read text in images, understand each page into typed blocks, plan the information architecture, paint the header illustration, write `site.json`. |
| Verify | `src/pipeline/verify.ts` | Checks the rebuild against the crawled text for dropped content. |
| Charter | `src/pipeline/charter.ts` | Turns a linked Citizen's Charter PDF into service pages. |
| Portraits | `src/pipeline/portraits.ts` | Finds officials' photos and matches them to names. |
| Evidence | `src/pipeline/evidence.ts` | Marks the accessibility problems on the original screenshot. |
| Audit and scores | `src/pipeline/audit.ts`, `scores.ts` | axe-core WCAG 2.2 audit of the rebuild, and before/after speed and weight. Needs the app running. |

Every model call goes through `cached()` (`src/pipeline/cache.ts`), keyed by its inputs, so a
rerun reuses earlier answers. `MODEL_CACHE=replay` forbids new calls.

## The site model

`site.json` is the contract between the pipeline and everything that reads a rebuild: the
renderer, the report, the review editor, the exports and other tools. It is defined once in zod
(`src/pipeline/schema.ts`), the TypeScript types come from it, and it is published as JSON
Schema. See [site-model.md](site-model.md).

## The app (`src/app`)

| Route | What it is |
| --- | --- |
| `/` | Submit a site; recent rebuilds |
| `/jobs/<id>` | Live progress of one run |
| `/preview/<id>/<page>` | The rebuilt site, rendered from `site.json` with Kapwa styles (`src/components/site`) |
| `/report/<id>` | Migration report: coverage, accessibility, what needs a person |
| `/edit/<id>` | Review editor (operator token) |
| `/api/jobs/<id>/export` | Static HTML zip; `?format=markdown` for Markdown content |
| `/admin` | Operator view: runs, reruns, cost, feedback (operator token) |

The Filipino edition and "Ask this site" call the language model on demand, with daily budgets.

## Limits

`src/lib/runQueue.ts` admits runs: concurrency, a waiting line, a per-visitor rate limit, a daily
allowance that resets at 8:00 AM Manila time, and dedupe by host. See the README for the variables.
The app runs as a single Node process, so the in-memory queue is authoritative.

## Storage

Jobs live on local disk. When R2 credentials are set, each finished job is mirrored to a
Cloudflare R2 bucket (`scripts/sync-jobs.ts`) and restored from it on an empty disk.
