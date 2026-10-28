# The site model (`site.json`)

Every rebuild is stored as one JSON document: the site's information architecture, every page
as typed content blocks, and where each piece came from. The renderer, the report, the review
editor and both exports read only this file, and other tools can too.

- **Schema:** [`/schema/site-model.v1.json`](https://regov.app/schema/site-model.v1.json)
  (JSON Schema 2020-12), generated from `src/pipeline/schema.ts` by `npm run schema`.
- **Example:** [`fixtures/sample/site.json`](../fixtures/sample/site.json), a fictional town.

Every site in this format is an unofficial concept. Anything that publishes it must say so.

## Shape

| Field | What it holds |
| --- | --- |
| `agency`, `site_kind`, `locality` | Who the site belongs to and what kind of body it is |
| `nav`, `hubs`, `home_sections`, `popular_services`, `footer` | The new information architecture, by page slug |
| `entities` | Officials, hotlines, barangays, programs, campuses, units, service windows, facilities |
| `pages[]` | Each page: `slug`, `title`, `summary`, `hero`, `blocks[]`, `source_url`, `source_screenshot`, `a11y_issues`, `migration_notes` |
| `pages[].blocks[]` | `type` (richtext, list, cards, people, contact, faq, table, links, timeline, image, callout, steps), `heading`, `body_markdown`, `items[]` |
| `redirects` | Old paths that should point to a merged page |
| `news`, `assets`, `design` | Latest news, the seal and artwork, the design mode |
| `edited_at`, `reviewed` | Set by the review editor: last human edit, and which pages a person checked against the original |

`portraits` and `lang` are added at render time and never stored.

## Versioning

The major version is in the schema's file name. Within v1 the rules are:

- New fields are optional. Readers must ignore fields they don't know.
- Existing fields keep their meaning and type.
- A change that breaks either rule needs v2, a new schema file, and a converter.

CI fails if `public/schema/site-model.v1.json` is not regenerated after a change to the zod
definitions, and checks the sample site against them.

## Review and export

1. **Review** at `/edit/<job>` (operator token): fix names, positions, numbers, fees and dates;
   tick each page once it matches the original. The first save keeps the agent's version as
   `site.generated.json`, and "Restore the agent's version" puts it back.
2. **Export** from the report:
   - *Download the site (.zip)*: static HTML with assets, a `_redirects` file and `redirects.csv`.
   - *Content as Markdown (.zip)*: `content/<slug>.md` with YAML front matter, `site.json` and
     `redirects.csv`, for static site generators and CMS importers.
