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

## Next: trust and staying current

- Agency claims: an agency verifies its domain, then adopts, corrects or removes its rebuild
- Scheduled re-crawls that show what changed on the original since the last rebuild
- "This is wrong" reports from citizens on rebuilt pages, routed to the review editor
- Per-page Wayback recovery for pages that fail live, and more document types than charters
- Better Filipino and regional-language handling
- Per-model providers, and a segmentation adapter so SAM is not Meta-only
- Exporters for a Next.js project, Payload CMS and WordPress

## Later: the wider picture

- An observatory: a public, downloadable dataset of accessibility, speed and breakage across
  Philippine government sites, with no rebuild needed
- Kapwa components and patterns found missing by the case study, proposed upstream to BetterGov
- Deeper WikiBayan integration
- Funding and governance: who pays for model calls on the public service, more maintainers, and
  a lightweight proposal process for big changes
