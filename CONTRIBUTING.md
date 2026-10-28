# Contributing to RE:GOV

Thank you for helping. RE:GOV rebuilds public government websites as accessible, citizen-first
concepts, and every part of it can be improved by people who know Philippine government sites,
accessibility, design systems or crawling.

## Ground rules

- **Never call generated output official.** Every rebuilt site carries "unofficial concept"
  labels in the top bar, the footer and the page metadata. Pull requests that weaken them are
  not merged.
- **Respect the sites we read.** The crawler follows robots.txt, each site's terms of use and the
  do-not-crawl list (`src/lib/optout.ts`). Changes to crawling must keep that.
- **Accessibility is a requirement.** CI runs axe-core on the sample site; serious and critical
  WCAG 2.2 A/AA violations fail the build.
- Be kind. See the [code of conduct](CODE_OF_CONDUCT.md).

## Set up without a model key

You can work on the app, the rebuilt-site templates, the report, the review editor and the
exports without any model access:

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run sample        # installs the fictional sample site as job "sample"
npm run dev           # http://localhost:3000/preview/sample and /report/sample
```

The sample is Bayan ng Halimbawa, a town that does not exist (`fixtures/sample`). To try the
review editor, set `ADMIN_TOKEN` (16+ characters) in `.env` and open `/edit/sample?token=…`.

To rebuild a saved job offline, run the pipeline with `MODEL_CACHE=replay`: recorded model
answers in `jobs/<id>/models` are reused, and any step that would need a new call fails fast
instead of calling the API.

## Run a real rebuild

You need a key for the Meta Model API (or another provider, see [docs/models.md](docs/models.md)):

```bash
npx tsx --env-file=.env scripts/smoke.ts                       # checks the models answer
R2_ACCESS_KEY_ID= R2_SECRET_ACCESS_KEY= npx tsx --env-file=.env scripts/pipeline.ts https://example.gov.ph example 10
```

A rebuild costs real money (see `/admin` for measured cost per site). Use a small page count
while developing.

## Before you open a pull request

```bash
npm run lint
npm run typecheck
npm test
npm run a11y -- --base http://127.0.0.1:3000   # with the app running and `npm run sample` done
```

If you change the site model (`src/pipeline/schema.ts`), run `npm run schema` and commit
`public/schema/site-model.v1.json`. Within v1, only add optional fields; see
[docs/site-model.md](docs/site-model.md).

## Good first contributions

- Government domain patterns in `src/lib/govdomain.ts`, with a test.
- Block renderers and Kapwa components in `src/components/site/`.
- A site the agent mishandles: open an issue with the address and what went wrong.
- Tests for pure modules in `src/pipeline` and `src/lib`.

Read [docs/architecture.md](docs/architecture.md) for how the pieces fit, and
[ROADMAP.md](ROADMAP.md) for where the project is going.

## Licence

By contributing you agree that your contribution is licensed under the [MIT licence](LICENSE).
