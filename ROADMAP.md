# Roadmap

RE:GOV turns legacy government websites into accessible, citizen-first sites. The goal is a
toolkit that agencies, LGU IT staff and civic developers can run on their own sites, check, and
export into something they can actually deploy. regov.app stays the public showcase.

Progress is tracked in [issues](https://github.com/rockyru/regov/issues). Ideas are welcome:
open one with the "Idea" template.

## Now: easy to contribute to, output people can adopt

- [x] Continuous integration: lint, types, unit tests, build, schema check
- [x] Unit tests for robots.txt, terms, sitemaps, crawl quality, domains, the model cache, exports
- [x] A fictional sample site, so the app runs with no model key
- [x] Replay mode: rebuild a saved job from recorded model answers only
- [x] Every model name configurable; documented requirements per step
- [x] Contributing guide, code of conduct, security policy, issue and PR templates
- [x] Self-hosting guide and Docker Compose file
- [x] The site model published as versioned JSON Schema
- [x] Review editor: correct a rebuild and mark pages checked against the original
- [x] Markdown export with front matter, alongside the static HTML export
- [x] Accessibility gate: axe-core WCAG 2.2 A/AA on desktop and phone, in CI
- [x] Feedback box, delivered by email
- [x] Cloudflare Turnstile on the feedback and Reimagine forms

## Next: trust and staying current

- Agency claims: an agency verifies its domain, then adopts, corrects or removes its rebuild
- Scheduled re-crawls that show what changed on the original since the last rebuild
- "This is wrong" reports from citizens on rebuilt pages, routed to the review editor
- Per-page Wayback recovery for pages that fail live, and more document types than charters
- Better Filipino and regional-language handling
- Per-model providers, and a segmentation adapter so SAM is not Meta-only
- Exporters for a Next.js project, Payload CMS and WordPress
- Emergency mode: hotlines, evacuation centres and advisories pinned to the top of a rebuilt
  LGU site, and kept usable on slow mobile data
- Rebuilt sites that load fast on 3G and keep hotlines and offices readable offline

## Tourism: a "Visit" section for every LGU

Most towns and provinces have a tourism page, and most of them are a gallery, a paragraph and a
list of links. Rebuilds should give visitors what they come for, using only what the original
site says. The full plan is in [docs/tourism.md](docs/tourism.md).

- Recognise tourism content (LGU tourism offices, provincial tourism pages, DOT regional
  offices) and give it a "Visit" hub: places, festivals, getting there, travel advisories and
  the tourism office
- Places and festivals as structured data in the site model, with the source page for each
- A festival calendar with dates checked against the year they were published, and an .ics file
- A map of places, only for those the source locates; nothing is placed by guesswork
- schema.org markup on rebuilt tourism pages so search engines can read them
- Visitor languages beyond English and Filipino, labelled as machine translation
- A "Visit" collection on the showcase

## Later: the wider picture

- An observatory: a public, downloadable dataset of accessibility, speed and breakage across
  Philippine government sites, with no rebuild needed
- Kapwa components and patterns found missing by the case study, proposed upstream to BetterGov
- Deeper WikiBayan integration
- A public read-only API for published site models
- A tourism view of the observatory: which towns have a usable visitor page at all
- Funding and governance: who pays for model calls on the public service, more maintainers, and
  a lightweight proposal process for big changes
